import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ["contacted", "lost", "closed"],
  contacted: ["qualified", "lost", "closed"],
  qualified: ["viewing_requested", "lost", "closed"],
  viewing_requested: ["viewing_completed", "lost", "closed"],
  viewing_completed: ["booking_requested", "lost", "closed"],
  booking_requested: ["booked", "lost", "closed"],
  booked: ["converted", "lost", "closed"],
  converted: ["closed"],
  lost: ["new", "closed"],
  closed: [],
};

export class LeadsService {
  /**
   * Create a new lead
   */
  async createLead(
    clientId: string,
    data: {
      landId?: string;
      source: string;
      referralCode?: string;
      contactName: string;
      contactPhone: string;
      notes?: string;
    }
  ): Promise<any> {
    // Verify client exists
    const client = await prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundError("Client not found");
    }

    // Verify land exists if provided
    if (data.landId) {
      const land = await prisma.land.findUnique({
        where: { id: data.landId },
      });

      if (!land) {
        throw new NotFoundError("Land not found");
      }
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        clientId,
        landId: data.landId,
        source: data.source,
        referralCode: data.referralCode,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        notes: data.notes,
        status: "new",
      },
    });

    return this.formatLead(lead);
  }

  /**
   * Get leads with filtering and pagination
   */
  async getLeads(
    filters: {
      brokerId?: string;
      clientId?: string;
      status?: string;
      source?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    const where: any = {};
    if (filters.brokerId) where.brokerId = filters.brokerId;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: leads.map((l) => this.formatLead(l)),
      pagination: { page, limit, total, totalPages },
    };
  }

  /**
   * Get single lead by ID
   */
  async getLeadById(leadId: string): Promise<any> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        broker: { select: { id: true, displayName: true, company: true } },
        client: { select: { id: true, email: true, firstName: true, lastName: true } },
        land: { select: { id: true, titleAr: true, titleEn: true, coverImageUrl: true } },
        assignments: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!lead) {
      throw new NotFoundError("Lead not found");
    }

    return {
      ...this.formatLead(lead),
      broker: lead.broker,
      client: lead.client,
      land: lead.land,
      recentAssignments: lead.assignments,
    };
  }

  /**
   * Update lead status with transition validation
   */
  async updateLeadStatus(
    leadId: string,
    newStatus: string,
    notes?: string
  ): Promise<any> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundError("Lead not found");
    }

    // Validate transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[lead.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${lead.status} to ${newStatus}`
      );
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        notes: notes ?? lead.notes,
      },
    });

    return this.formatLead(updated);
  }

  /**
   * Assign lead to a broker
   */
  async assignLead(
    leadId: string,
    brokerId: string,
    assignedBy: string,
    reason?: string
  ): Promise<any> {
    const [lead, broker, assigner] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.brokerProfile.findUnique({ where: { id: brokerId } }),
      prisma.user.findUnique({ where: { id: assignedBy } }),
    ]);

    if (!lead) throw new NotFoundError("Lead not found");
    if (!broker) throw new NotFoundError("Broker not found");
    if (!assigner) throw new NotFoundError("Assigner not found");

    // Create assignment record
    await prisma.leadAssignment.create({
      data: {
        leadId,
        fromBrokerId: lead.brokerId,
        toBrokerId: brokerId,
        assignedBy,
        reason,
      },
    });

    // Update lead broker
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { brokerId },
    });

    return this.formatLead(updated);
  }

  // Private helpers
  private formatLead(lead: any) {
    return {
      id: lead.id,
      brokerId: lead.brokerId,
      clientId: lead.clientId,
      landId: lead.landId,
      source: lead.source,
      status: lead.status,
      contactName: lead.contactName,
      contactPhone: lead.contactPhone,
      notes: lead.notes,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }
}

export const leadsService = new LeadsService();
