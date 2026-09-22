import { z } from "zod";

export const CreateViewingRequestDTO = z.object({
  leadId: z.string().uuid(),
  landId: z.string().uuid(),
  requestedById: z.string().uuid(),
  notes: z.string().optional(),
});

export const UpdateViewingStatusDTO = z.object({
  status: z.enum(["pending", "accepted", "rejected", "scheduled", "completed", "cancelled"]),
  scheduledAt: z.date().optional(),
  notes: z.string().optional(),
});

export const ViewingDTO = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  landId: z.string().uuid(),
  status: z.string(),
  requestedAt: z.date(),
  scheduledAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  notes: z.string().nullable(),
});

export type CreateViewingRequestInput = z.infer<typeof CreateViewingRequestDTO>;
export type UpdateViewingStatusInput = z.infer<typeof UpdateViewingStatusDTO>;
export type Viewing = z.infer<typeof ViewingDTO>;
