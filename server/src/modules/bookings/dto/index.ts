import { z } from "zod";

export const CreateBookingRequestDTO = z.object({
  leadId: z.string().uuid(),
  landId: z.string().uuid(),
  requestedById: z.string().uuid(),
  notes: z.string().optional(),
});

export const UpdateBookingStatusDTO = z.object({
  status: z.enum(["pending", "under_review", "approved", "rejected", "cancelled", "converted"]),
  notes: z.string().optional(),
});

export const BookingDTO = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  landId: z.string().uuid(),
  status: z.string(),
  holdingId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateBookingRequestInput = z.infer<typeof CreateBookingRequestDTO>;
export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusDTO>;
export type Booking = z.infer<typeof BookingDTO>;
