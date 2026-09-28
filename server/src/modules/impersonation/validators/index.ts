import { z } from "zod";
import { IMPERSONATION_MAX_TTL_MINUTES } from "../services/impersonation.service.js";

const uuid = z.string().uuid();

export const startImpersonationSchema = z.object({
  targetUserId: uuid,
  reason: z.string().trim().max(500).optional(),
  ttlMinutes: z.number().int().min(1).max(IMPERSONATION_MAX_TTL_MINUTES).optional(),
});

export const endImpersonationSchema = z.object({}).strict();

export const revokeImpersonationSchema = z.object({
  sessionId: uuid,
});

export const listImpersonationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type StartImpersonationBody = z.infer<typeof startImpersonationSchema>;
export type RevokeImpersonationBody = z.infer<typeof revokeImpersonationSchema>;
export type ListImpersonationQuery = z.infer<typeof listImpersonationQuerySchema>;
