import { z } from "zod";
import { KYC_DOCUMENT_TYPES, KYC_STATUSES } from "../constants/index.js";

export const createKycSchema = z.object({
  documentType: z.enum([
    KYC_DOCUMENT_TYPES.NATIONAL_ID,
    KYC_DOCUMENT_TYPES.PASSPORT,
    KYC_DOCUMENT_TYPES.DRIVER_LICENSE,
  ]),
  frontImagePath: z.string().optional().nullable(),
  backImagePath: z.string().optional().nullable(),
  selfieImagePath: z.string().optional().nullable(),
});

export const reviewKycSchema = z.object({
  status: z.enum([KYC_STATUSES.APPROVED, KYC_STATUSES.REJECTED]),
  adminNotes: z.string().max(1000).optional(),
});
