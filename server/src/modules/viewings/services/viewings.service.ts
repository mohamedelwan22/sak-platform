import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";

const VALID_VIEWING_STATUSES = ["pending", "accepted", "rejected", "scheduled", "completed", "cancelled"];

const VIEWING_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "rejected", "scheduled", "cancelled"],
  accepted: ["scheduled", "completed", "cancelled"],
  scheduled: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: [],
};

export class ViewingsService {
  async createViewingRequest(data: {
    leadId: string;
    landId: string;
    requestedById: string;
    brokerId?: string;
    notes?: string;
  }): Promise<any> {
    const [lead, land, user] = await Promise.all([
      prisma.lead.findUnique({ where: { id: data.leadId } }),
      prisma.land.findUnique({ where: { id: data.landId } }),
      prisma.user.findUnique({ where: { id: data.requestedById } }),
    ]);

    if (!lead) throw new NotFoundError("Lead not found");
    if (!land) throw new NotFoundError("Land not found");
    if (!user) throw new NotFoundError("User not found");

    const viewing = await prisma.viewingRequest.create({
      data: {
        leadId: data.leadId,
        landId: data.landId,
        requestedById: data.requestedById,
        brokerId: data.brokerId ?? lead.brokerId ?? null,
        status: "pending",
        notes: data.notes,
      },
    });

    return this.formatViewing(viewing);
  }

  async getViewings(filters: {
    leadId?: string;
    landId?: string;
    status?: string;
    requestedById?: string;
    brokerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; pagination: any }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    const where: Record<string, unknown> = {};
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.landId) where.landId = filters.landId;
    if (filters.status) where.status = filters.status;
    if (filters.requestedById) where.requestedById = filters.requestedById;
    if (filters.brokerId) where.brokerId = filters.brokerId;

    const [total, viewings] = await Promise.all([
      prisma.viewingRequest.count({ where }),
      prisma.viewingRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: viewings.map((v) => this.formatViewing(v)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateViewingStatus(
    viewingId: string,
    status: string,
    scheduledAt?: Date,
    notes?: string
  ): Promise<any> {
    if (!VALID_VIEWING_STATUSES.includes(status)) {
      throw new ValidationError(`Unknown viewing status: ${status}`);
    }

    const viewing = await prisma.viewingRequest.findUnique({
      where: { id: viewingId },
    });

    if (!viewing) throw new NotFoundError("Viewing request not found");

    const allowed = VIEWING_TRANSITIONS[viewing.status] ?? [];
    if (!allowed.includes(status)) {
      throw new ValidationError(`Cannot transition viewing from ${viewing.status} to ${status}`);
    }

    if (status === "scheduled" && !scheduledAt) {
      throw new ValidationError("scheduledAt is required to schedule a viewing");
    }

    const updateData: any = { status };
    if (status === "scheduled" && scheduledAt) {
      updateData.scheduledAt = scheduledAt;
    }
    if (status === "completed") updateData.completedAt = new Date();
    if (status === "cancelled") updateData.cancelledAt = new Date();
    if (notes) updateData.notes = notes;

    const updated = await prisma.viewingRequest.update({
      where: { id: viewingId },
      data: updateData,
    });

    return this.formatViewing(updated);
  }

  private formatViewing(viewing: any) {
    return {
      id: viewing.id,
      leadId: viewing.leadId,
      landId: viewing.landId,
      brokerId: viewing.brokerId,
      requestedById: viewing.requestedById,
      status: viewing.status,
      requestedAt: viewing.requestedAt,
      scheduledAt: viewing.scheduledAt,
      completedAt: viewing.completedAt,
      cancelledAt: viewing.cancelledAt,
      notes: viewing.notes,
    };
  }
}

export const viewingsService = new ViewingsService();