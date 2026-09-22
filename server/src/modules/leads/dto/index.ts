import { z } from "zod";

export const CreateLeadDTO = z.object({
  clientId: z.string().uuid(),
  landId: z.string().uuid().optional(),
  source: z.enum(["organic", "referral", "broker", "direct"]).default("organic"),
  referralCode: z.string().optional(),
  contactName: z.string().min(1).max(100),
  contactPhone: z.string().min(1).max(30),
  notes: z.string().optional(),
});

export const UpdateLeadStatusDTO = z.object({
  status: z.enum([
    "new",
    "contacted",
    "qualified",
    "viewing_requested",
    "viewing_completed",
    "booking_requested",
    "booked",
    "converted",
    "lost",
    "closed",
  ]),
  notes: z.string().optional(),
});

export const AssignLeadDTO = z.object({
  brokerId: z.string().uuid(),
  reason: z.string().optional(),
});

export const LeadDTO = z.object({
  id: z.string().uuid(),
  brokerId: z.string().uuid().nullable(),
  clientId: z.string().uuid(),
  landId: z.string().uuid().nullable(),
  source: z.string(),
  status: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const LeadsListDTO = z.object({
  data: z.array(LeadDTO),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type CreateLeadInput = z.infer<typeof CreateLeadDTO>;
export type UpdateLeadStatusInput = z.infer<typeof UpdateLeadStatusDTO>;
export type AssignLeadInput = z.infer<typeof AssignLeadDTO>;
export type Lead = z.infer<typeof LeadDTO>;
export type LeadsList = z.infer<typeof LeadsListDTO>;
