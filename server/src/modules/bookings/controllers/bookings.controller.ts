import type { Request, Response } from "express";
import { sendSuccess, sendError, sendNotFound, sendForbidden } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { bookingsService } from "../services/bookings.service.js";
import { prisma } from "../../../lib/prisma.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const STAFF_ROLES = ["admin", "super_admin"];

async function resolveCallerBrokerId(userId: string): Promise<string | null> {
  const broker = await prisma.brokerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return broker?.id ?? null;
}

export class BookingsController {
  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const { leadId, landId, notes } = req.body;

      if (!leadId || !landId) {
        sendError(res, "Lead ID and Land ID are required", 400, "VALIDATION_ERROR");
        return;
      }

      const lead = await prisma.lead.findUnique({
        where: { id: String(leadId) },
        select: { id: true, clientId: true, brokerId: true },
      });
      if (!lead) {
        sendNotFound(res, "Lead not found");
        return;
      }
      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      const callerBroker = await resolveCallerBrokerId(userId);
      if (!isStaff && userId !== lead.clientId && callerBroker !== lead.brokerId) {
        sendForbidden(res, "Not allowed to create a booking for this lead");
        return;
      }

      const booking = await bookingsService.createBookingRequest({
        leadId: String(leadId),
        landId: String(landId),
        requestedById: userId,
        brokerId: lead.brokerId ?? undefined,
        notes,
      });

      await auditService.logFromRequest(req, {
        action: AuditActions.BOOKING_CREATED,
        entityType: "booking",
        entityId: booking.id,
        success: true,
      });

      sendSuccess(res, booking, "Booking request created", HttpStatus.CREATED);
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to create booking request");
    }
  }

  async getBookings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }

      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      const callerBroker = await resolveCallerBrokerId(userId);

      const { leadId, landId, status, page, limit } = req.query;

      let effectiveRequestedById: string | undefined;
      let effectiveBrokerId: string | undefined;
      if (!isStaff) {
        if (callerBroker) {
          effectiveBrokerId = callerBroker;
        } else {
          effectiveRequestedById = userId;
        }
      }

      const result = await bookingsService.getBookings({
        leadId: leadId ? String(leadId) : undefined,
        landId: landId ? String(landId) : undefined,
        status: status ? String(status) : undefined,
        requestedById: effectiveRequestedById,
        brokerId: effectiveBrokerId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      sendSuccess(res, result, "Bookings retrieved");
    } catch (err) {
      sendError(res, "Failed to retrieve bookings");
    }
  }

  async updateBookingStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const { status, notes } = req.body;

      if (!status) {
        sendError(res, "Status is required", 400, "VALIDATION_ERROR");
        return;
      }

      const booking = await prisma.bookingRequest.findUnique({
        where: { id },
        select: { id: true, requestedById: true, brokerId: true },
      });
      if (!booking) {
        sendNotFound(res, "Booking request not found");
        return;
      }

      const isStaff = STAFF_ROLES.includes(req.user?.role ?? "");
      const callerBroker = await resolveCallerBrokerId(userId);
      if (!isStaff && userId !== booking.requestedById && callerBroker !== booking.brokerId) {
        sendForbidden(res, "Cannot update this booking request");
        return;
      }

      const updated = await bookingsService.updateBookingStatus(id, String(status), notes ? String(notes) : undefined);

      await auditService.logFromRequest(req, {
        action: AuditActions.BOOKING_UPDATED,
        entityType: "booking",
        entityId: id,
        success: true,
      });

      sendSuccess(res, updated, "Booking status updated");
    } catch (err) {
      if (err instanceof ValidationError) {
        sendError(res, err.message, 400, "VALIDATION_ERROR");
        return;
      }
      if (err instanceof NotFoundError) {
        sendNotFound(res, err.message);
        return;
      }
      sendError(res, "Failed to update booking");
    }
  }
}

export const bookingsController = new BookingsController();