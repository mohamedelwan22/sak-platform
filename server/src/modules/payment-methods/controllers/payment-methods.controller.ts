import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { sendSuccess, sendNotFound, sendError } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";

const VALID_TYPES = ["bank_transfer", "card", "other"];
const MAX_METHODS = 5;

function maskedFromDetails(type: string, details?: Record<string, unknown> | null): string | null {
  if (!details) return null;
  const accountNumber = details.accountNumber ? String(details.accountNumber) : null;
  const iban = details.iban ? String(details.iban) : null;
  const last4 = details.last4 ? String(details.last4) : null;
  const brand = details.brand ? String(details.brand) : null;

  if (type === "card" && last4) {
    return `${brand ? `${brand} ` : ""}•••• ${last4}`;
  }
  if (accountNumber && accountNumber.length >= 4) {
    return `**** ${accountNumber.slice(-4)}`;
  }
  if (iban && iban.length >= 4) {
    return `•••• ${iban.slice(-4)}`;
  }
  return null;
}

function mapMethod(m: {
  id: string;
  type: string;
  label: string | null;
  details: unknown;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: Date;
}) {
  return {
    id: m.id,
    type: m.type,
    label: m.label,
    masked: maskedFromDetails(
      m.type,
      (m.details ?? undefined) as Record<string, unknown> | undefined,
    ),
    is_default: m.isDefault,
    is_verified: m.isVerified,
    created_at: m.createdAt.toISOString(),
  };
}

export class PaymentMethodsController {
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const methods = await prisma.paymentMethod.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      sendSuccess(res, methods.map(mapMethod), "Payment methods retrieved");
    } catch {
      sendError(res, "Failed to retrieve payment methods");
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const id = String(req.params.id);
      const method = await prisma.paymentMethod.findFirst({ where: { id, userId } });
      if (!method) {
        sendNotFound(res, "Payment method not found");
        return;
      }
      sendSuccess(res, mapMethod(method), "Payment method retrieved");
    } catch {
      sendError(res, "Failed to retrieve payment method");
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const { type, label, details } = req.body;

      const methodType =
        type && VALID_TYPES.includes(type as string) ? (type as string) : "bank_transfer";
      if (type && !VALID_TYPES.includes(type as string)) {
        sendError(res, "Invalid payment method type", 400, "VALIDATION_ERROR");
        return;
      }
      if (label && (typeof label !== "string" || label.trim().length === 0)) {
        sendError(res, "Invalid label", 400, "VALIDATION_ERROR");
        return;
      }

      const count = await prisma.paymentMethod.count({ where: { userId } });
      if (count >= MAX_METHODS) {
        sendError(res, "Maximum number of payment methods reached", 400, "VALIDATION_ERROR");
        return;
      }

      const safeDetails =
        details && typeof details === "object" ? (details as Record<string, unknown>) : null;

      const created = await prisma.$transaction(async (tx) => {
        const method = await tx.paymentMethod.create({
          data: {
            userId,
            type: methodType,
            label: label && typeof label === "string" ? label.trim() : null,
            ...(safeDetails
              ? { details: safeDetails as Prisma.InputJsonObject }
              : { details: Prisma.JsonNull }),
            isDefault: count === 0,
            isVerified: false,
          },
        });
        if (count === 0) {
          await tx.paymentMethod.updateMany({
            where: { userId, id: { not: method.id } },
            data: { isDefault: false },
          });
        }
        return method;
      });

      sendSuccess(res, mapMethod(created), "Payment method created", HttpStatus.CREATED);
    } catch {
      sendError(res, "Failed to create payment method");
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const id = String(req.params.id);
      const existing = await prisma.paymentMethod.findFirst({ where: { id, userId } });
      if (!existing) {
        sendNotFound(res, "Payment method not found");
        return;
      }

      const { label, setDefault } = req.body;
      const data: { label?: string | null; isDefault?: boolean } = {};

      if (typeof setDefault === "boolean" && setDefault) {
        data.isDefault = true;
      } else if (label !== undefined) {
        data.label =
          label === null || (typeof label === "string" && label.trim().length === 0)
            ? null
            : String(label).trim();
      }

      if (Object.keys(data).length === 0) {
        sendError(res, "Nothing to update", 400, "VALIDATION_ERROR");
        return;
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (data.isDefault) {
          await tx.paymentMethod.updateMany({
            where: { userId, id: { not: id } },
            data: { isDefault: false },
          });
        }
        return tx.paymentMethod.update({ where: { id }, data });
      });

      sendSuccess(res, mapMethod(updated), "Payment method updated");
    } catch {
      sendError(res, "Failed to update payment method");
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const id = String(req.params.id);
      const existing = await prisma.paymentMethod.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        sendNotFound(res, "Payment method not found");
        return;
      }
      await prisma.paymentMethod.delete({ where: { id } });

      const wasDefault = existing.isDefault;
      if (wasDefault) {
        const nextDefault = await prisma.paymentMethod.findFirst({
          where: { userId, id: { not: id } },
          orderBy: { createdAt: "asc" },
        });
        if (nextDefault) {
          await prisma.paymentMethod.update({
            where: { id: nextDefault.id },
            data: { isDefault: true },
          });
        }
      }

      sendSuccess(res, null, "Payment method deleted");
    } catch {
      sendError(res, "Failed to delete payment method");
    }
  }
}
