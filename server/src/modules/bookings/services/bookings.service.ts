import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";

const VALID_BOOKING_STATUSES = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "cancelled",
  "converted",
];

const BOOKING_TRANSITIONS: Record<string, string[]> = {
  pending: ["under_review", "rejected", "cancelled"],
  under_review: ["approved", "rejected", "cancelled"],
  approved: ["converted", "cancelled"],
  rejected: [],
  cancelled: [],
  converted: [],
};

export class BookingsService {
  async createBookingRequest(data: {
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

    const booking = await prisma.bookingRequest.create({
      data: {
        leadId: data.leadId,
        landId: data.landId,
        requestedById: data.requestedById,
        brokerId: data.brokerId ?? lead.brokerId ?? null,
        status: "pending",
        notes: data.notes,
      },
    });

    return this.formatBooking(booking);
  }

  async getBookings(filters: {
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

    const [total, bookings] = await Promise.all([
      prisma.bookingRequest.count({ where }),
      prisma.bookingRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: bookings.map((b) => this.formatBooking(b)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateBookingStatus(bookingId: string, status: string, notes?: string): Promise<any> {
    if (!VALID_BOOKING_STATUSES.includes(status)) {
      throw new ValidationError(`Unknown booking status: ${status}`);
    }

    const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new NotFoundError("Booking request not found");

    const allowed = BOOKING_TRANSITIONS[booking.status] ?? [];
    if (!allowed.includes(status)) {
      throw new ValidationError(`Cannot transition booking from ${booking.status} to ${status}`);
    }

    const updateData: any = { status };
    if (notes) updateData.notes = notes;

    const updated = await prisma.bookingRequest.update({
      where: { id: bookingId },
      data: updateData,
    });

    return this.formatBooking(updated);
  }

  async convertBookingToHolding(
    bookingId: string,
    input: {
      userId: string;
      landId: string;
      sakOwned: number;
      purchasePricePerSakUsd: number;
      maturityMonths: number;
      brokerId?: string | null;
    },
  ): Promise<any> {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.bookingRequest.findUnique({ where: { id: bookingId } });
      if (!booking) throw new NotFoundError("Booking request not found");

      if (booking.status !== "approved") {
        throw new ValidationError("Only approved bookings can be converted");
      }
      if (booking.holdingId) {
        throw new ValidationError("Booking has already been converted");
      }

      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + input.maturityMonths);

      const holding = await tx.holding.create({
        data: {
          userId: input.userId,
          landId: input.landId,
          brokerId: input.brokerId ?? booking.brokerId ?? null,
          sakOwned: input.sakOwned,
          purchasePricePerSakUsd: input.purchasePricePerSakUsd,
          maturityDate,
          status: "active",
        },
      });

      const updated = await tx.bookingRequest.update({
        where: { id: bookingId },
        data: {
          holdingId: holding.id,
          status: "converted",
        },
      });

      return { booking: this.formatBooking(updated), holding };
    });
  }

  private formatBooking(booking: any) {
    return {
      id: booking.id,
      leadId: booking.leadId,
      landId: booking.landId,
      brokerId: booking.brokerId,
      requestedById: booking.requestedById,
      status: booking.status,
      holdingId: booking.holdingId,
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}

export const bookingsService = new BookingsService();
