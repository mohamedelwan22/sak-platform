import type { Prisma, Wallet, PaymentRequest } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError, AppError } from "../../../lib/errors.js";
import {
  ceilMoney,
  DEFAULT_MONEY_DIGITS,
  floorMoney,
  isPositiveDecimal,
  roundMoney,
  toDecimal,
} from "../../../lib/money.js";
import type { DatabaseClient } from "../../../services/pricing.service.js";
import { resolveCurrentSakConfig } from "../../../services/pricing.service.js";
import { goldPriceService } from "../../../services/gold-price.service.js";
import type { PriceSnapshot } from "../../../services/gold-price.service.js";
import { PAYMENT_TYPES, PAYMENT_STATUSES } from "../constants/index.js";
import { createNotificationIfPreferred } from "../../notifications/services/notification-preference.service.js";

const SAK_QTY_DIGITS = 4;

export interface CreatePaymentAccountInput {
  userId: string;
  type: "deposit" | "withdrawal";
  amount: string;
  currency?: string;
  method?: string;
  proofPath?: string | null;
  paymentMethodId?: string | null;
}

export interface CreateSellAccountInput {
  userId: string;
  sakAmount: string;
  method?: string;
  holdingId?: string | null;
}

export interface PaymentAccountService {
  createPaymentRequest(input: CreatePaymentAccountInput): Promise<PaymentRequest>;
  createSellRequest(
    input: CreateSellAccountInput,
  ): Promise<{ order: unknown; paymentRequest: PaymentRequest }>;
  approvePaymentRequest(id: string, reviewerId: string): Promise<PaymentRequest>;
  rejectPaymentRequest(
    id: string,
    reviewerId: string,
    reason?: string | null,
  ): Promise<PaymentRequest>;
}

async function lockUserWallet(client: DatabaseClient, userId: string): Promise<Wallet> {
  await client.wallet.upsert({
    where: { userId },
    create: { userId, balance: 0, frozenBalance: 0 },
    update: {},
  });
  await client.$queryRaw`SELECT id FROM "wallets" WHERE user_id = ${userId} FOR UPDATE`;
  const locked = await client.wallet.findUnique({ where: { userId } });
  if (!locked) throw new NotFoundError("Wallet not found");
  return locked;
}

function isLegacyWithdrawal(request: PaymentRequest): boolean {
  return request.type === PAYMENT_TYPES.WITHDRAWAL && request.rateUsedAtRequest === null;
}

function reservedSak(request: PaymentRequest): Prisma.Decimal {
  if (request.sakAmount) return toDecimal(request.sakAmount);
  return toDecimal(request.amount);
}

export class PaymentAccountingService implements PaymentAccountService {
  constructor(private readonly client: DatabaseClient) {}

  async createPaymentRequest(input: CreatePaymentAccountInput): Promise<PaymentRequest> {
    const type = input.type;
    const amountStr = input.amount;

    if (!isPositiveDecimal(amountStr)) {
      throw new ValidationError("Amount must be a positive decimal");
    }

    const amount = toDecimal(amountStr);
    const currency = input.currency ?? "USD";

    const rawPaymentMethodId =
      typeof input.paymentMethodId === "string"
        ? input.paymentMethodId.trim()
        : input.paymentMethodId;
    const paymentMethodId = rawPaymentMethodId || null;

    const savedPaymentMethod = paymentMethodId
      ? await this.client.paymentMethod.findFirst({
          where: { id: paymentMethodId, userId: input.userId },
          select: { id: true, type: true },
        })
      : null;

    if (paymentMethodId && !savedPaymentMethod) {
      throw new ValidationError("Payment method not found");
    }

    const resolvedPaymentMethodId = savedPaymentMethod?.id ?? paymentMethodId;
    const method = savedPaymentMethod?.type ?? input.method ?? "bank_transfer";

    if (type === PAYMENT_TYPES.DEPOSIT) {
      return this.client.paymentRequest.create({
        data: {
          userId: input.userId,
          type,
          amount,
          currency,
          method,
          proofPath: input.proofPath ?? null,
          paymentMethodId: resolvedPaymentMethodId,
        },
      });
    }

    if (type !== PAYMENT_TYPES.WITHDRAWAL) {
      throw new ValidationError("Unsupported payment type");
    }

    // Market quote resolved before the transaction so no external call is
    // made while holding wallet locks. rateUsedAtRequest snapshots the price.
    const quote = await goldPriceService.getCurrentMarketQuote();
    const price = quote.sakPriceUsd;

    return this.client.$transaction(async (tx) => {
      const reserved = ceilMoney(amount.div(price), SAK_QTY_DIGITS);
      const wallet = await lockUserWallet(tx, input.userId);
      const available = wallet.balance.sub(wallet.frozenBalance);

      if (available.lessThan(reserved)) {
        throw new AppError("Insufficient available balance", 400, true, "INSUFFICIENT_BALANCE");
      }

      await tx.wallet.update({
        where: { userId: input.userId },
        data: { frozenBalance: { increment: reserved } },
      });

      return tx.paymentRequest.create({
        data: {
          userId: input.userId,
          type,
          amount,
          currency,
          method,
          proofPath: input.proofPath ?? null,
          sakAmount: reserved,
          rateUsedAtRequest: price,
          paymentMethodId: resolvedPaymentMethodId,
        },
      });
    });
  }

  async createSellRequest(input: CreateSellAccountInput): Promise<{
    order: unknown;
    paymentRequest: PaymentRequest;
  }> {
    if (!isPositiveDecimal(input.sakAmount)) {
      throw new ValidationError("SAK amount must be a positive decimal");
    }

    if (toDecimal(input.sakAmount).decimalPlaces() > SAK_QTY_DIGITS) {
      throw new ValidationError(`SAK amount must have at most ${SAK_QTY_DIGITS} decimal places`);
    }

    const qty = floorMoney(toDecimal(input.sakAmount), SAK_QTY_DIGITS);
    if (qty.isZero()) throw new ValidationError("SAK amount must be greater than zero");

    const method = input.method ?? "bank_transfer";

    // Market quote + config resolved before the transaction; the sell price
    // and its full gold-price snapshot are frozen at request time.
    const quote = await goldPriceService.getCurrentMarketQuote();
    const config = await resolveCurrentSakConfig(this.client);
    if (!config)
      throw new AppError("SAK sell fee is not available", 503, true, "SELL_FEE_UNAVAILABLE");

    const price = quote.sakPriceUsd;
    const priceSnapshot = goldPriceService.buildPriceSnapshot(quote, qty);

    return this.client.$transaction(async (tx) => {
      if (input.holdingId) {
        const holding = await tx.holding.findUnique({
          where: { id: input.holdingId },
          select: { userId: true, status: true },
        });
        if (!holding || holding.userId !== input.userId) {
          throw new ValidationError("Holding not found");
        }
      }

      const wallet = await lockUserWallet(tx, input.userId);
      const available = wallet.balance.sub(wallet.frozenBalance);
      if (available.lessThan(qty)) {
        throw new AppError("Insufficient available balance", 400, true, "INSUFFICIENT_BALANCE");
      }

      const feePercent = toDecimal(config.sellFeePercent).div(100);
      const feeSak = roundMoney(qty.mul(feePercent), SAK_QTY_DIGITS);
      const subtotalUsd = roundMoney(qty.mul(price), DEFAULT_MONEY_DIGITS);
      const feeUsd = roundMoney(feeSak.mul(price), DEFAULT_MONEY_DIGITS);
      const proceedsUsd = roundMoney(subtotalUsd.sub(feeUsd), DEFAULT_MONEY_DIGITS);

      await tx.wallet.update({
        where: { userId: input.userId },
        data: { frozenBalance: { increment: qty } },
      });

      const order = await tx.order.create({
        data: {
          userId: input.userId,
          walletId: wallet.id,
          holdingId: input.holdingId ?? null,
          type: "sell",
          status: "pending",
          direction: "sell",
          sakQuantity: qty,
          unitPriceUsd: price,
          subtotalUsd,
          feeSak,
          feeUsd,
          totalUsd: proceedsUsd,
          priceSnapshot,
        },
      });

      const paymentRequest = await tx.paymentRequest.create({
        data: {
          userId: input.userId,
          type: PAYMENT_TYPES.WITHDRAWAL,
          amount: proceedsUsd,
          currency: "USD",
          method,
          status: PAYMENT_STATUSES.PENDING,
          sakAmount: qty,
          rateUsedAtRequest: price,
          orderId: order.id,
        },
      });

      await createNotificationIfPreferred(tx, {
        userId: input.userId,
        title: "Sell Request Created",
        message: `Your sell order for ${qty} SAK (${proceedsUsd} USD after ${feeSak} SAK fee) is pending review.`,
        type: "transaction",
      });

      return { order, paymentRequest };
    });
  }

  async approvePaymentRequest(id: string, reviewerId: string): Promise<PaymentRequest> {
    // Market quote resolved before the transaction so no external provider
    // call is made while wallet locks are held.
    const quote = await goldPriceService.getCurrentMarketQuote().catch(() => null);

    return this.client.$transaction(async (tx) => {
      const transitioned = await tx.paymentRequest.updateMany({
        where: { id, status: PAYMENT_STATUSES.PENDING },
        data: {
          status: PAYMENT_STATUSES.APPROVED,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          processedAt: new Date(),
        },
      });

      if (transitioned.count === 0) {
        const existing = await tx.paymentRequest.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) throw new NotFoundError("Payment request not found");
        throw new ConflictError("Payment request is not pending");
      }

      const request = await tx.paymentRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundError("Payment request not found");

      const wallet = await lockUserWallet(tx, request.userId);
      const reviewedAt = new Date();

      if (request.type === PAYMENT_TYPES.DEPOSIT) {
        // Deposits convert USD → SAK at the approval-time market price; the
        // quote and its gold-price snapshot are frozen into the transaction.
        if (!quote) {
          throw new AppError("SAK price is not available", 503, true, "PRICE_UNAVAILABLE");
        }
        const price = quote.sakPriceUsd;

        const creditedSak = floorMoney(toDecimal(request.amount).div(price), SAK_QTY_DIGITS);

        await tx.wallet.update({
          where: { userId: request.userId },
          data: { balance: { increment: creditedSak } },
        });
        await tx.paymentRequest.update({
          where: { id },
          data: { sakAmount: creditedSak, rateUsedAtApproval: price },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: "deposit",
            amount: creditedSak,
            status: "completed",
            description: `Deposit approved: ${request.amount} ${request.currency} → ${creditedSak} SAK`,
            referenceId: id,
            approvedById: reviewerId,
            approvedAt: reviewedAt,
            direction: "credit",
            unit: "SAK",
            usdAmount: request.amount,
            sakAmount: creditedSak,
            pricePerSakUsd: price,
            paymentRequestId: id,
            priceSnapshot: goldPriceService.buildPriceSnapshot(quote, creditedSak),
          },
        });

        await createNotificationIfPreferred(tx, {
          userId: request.userId,
          title: "Deposit Approved",
          message: `Your deposit of ${request.amount} ${request.currency} has been approved. ${creditedSak} SAK credited to your wallet.`,
          type: "transaction",
        });
      } else {
        const reserved = reservedSak(request);
        if (wallet.frozenBalance.lessThan(reserved)) {
          throw new ConflictError("Withdrawal reservation is no longer available");
        }

        // Legacy withdrawals (no rate snapshot) settle at the current market
        // price; regular withdrawals keep their request-time price snapshot.
        const price = request.rateUsedAtRequest ?? quote?.sakPriceUsd ?? null;
        if (!price) {
          throw new AppError("SAK price is not available", 503, true, "PRICE_UNAVAILABLE");
        }

        if (isLegacyWithdrawal(request)) {
          await tx.wallet.update({
            where: { userId: request.userId },
            data: { frozenBalance: { decrement: reserved } },
          });
        } else {
          await tx.wallet.update({
            where: { userId: request.userId },
            data: {
              balance: { decrement: reserved },
              frozenBalance: { decrement: reserved },
            },
          });
        }

        const order = request.orderId
          ? await tx.order.findUnique({ where: { id: request.orderId } })
          : null;

        if (request.orderId && !order) throw new NotFoundError("Order not found");

        await tx.paymentRequest.update({
          where: { id },
          data: { rateUsedAtApproval: request.rateUsedAtRequest ?? price },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: order ? "sell" : "withdrawal",
            amount: reserved,
            status: "completed",
            description: order
              ? `Sell order completed: ${reserved} SAK → ${request.amount} USD`
              : `Withdrawal approved via ${request.method}`,
            referenceId: id,
            approvedById: reviewerId,
            approvedAt: reviewedAt,
            direction: "debit",
            unit: "SAK",
            usdAmount: request.amount,
            sakAmount: reserved,
            pricePerSakUsd: request.rateUsedAtRequest ?? price,
            paymentRequestId: id,
            holdingId: order?.holdingId ?? null,
            priceSnapshot:
              (order?.priceSnapshot as PriceSnapshot | null) ??
              (quote ? goldPriceService.buildPriceSnapshot(quote, reserved) : undefined),
          },
        });

        if (order) {
          const completed = await tx.transaction.findFirst({
            where: { paymentRequestId: id, status: "completed" },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          });
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "completed",
              completedAt: reviewedAt,
              transactionId: completed?.id ?? null,
            },
          });
        }

        await createNotificationIfPreferred(tx, {
          userId: request.userId,
          title: order ? "Sell Order Completed" : "Withdrawal Approved",
          message: order
            ? `Your sell order of ${reserved} SAK has been completed. ${request.amount} USD is being transferred.`
            : `Your withdrawal of ${request.amount} ${request.currency} has been approved. Funds will be transferred shortly.`,
          type: "transaction",
        });
      }

      const updated = await tx.paymentRequest.findUnique({ where: { id } });
      if (!updated) throw new NotFoundError("Payment request not found");
      return updated;
    });
  }

  async rejectPaymentRequest(
    id: string,
    reviewerId: string,
    reason?: string | null,
  ): Promise<PaymentRequest> {
    return this.client.$transaction(async (tx) => {
      const transitioned = await tx.paymentRequest.updateMany({
        where: { id, status: PAYMENT_STATUSES.PENDING },
        data: {
          status: PAYMENT_STATUSES.REJECTED,
          adminNotes: reason ?? null,
          rejectionReason: reason ?? null,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      });

      if (transitioned.count === 0) {
        const existing = await tx.paymentRequest.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) throw new NotFoundError("Payment request not found");
        throw new ConflictError("Payment request is not pending");
      }

      const request = await tx.paymentRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundError("Payment request not found");

      if (request.type === PAYMENT_TYPES.WITHDRAWAL) {
        const wallet = await lockUserWallet(tx, request.userId);
        const reserved = reservedSak(request);

        if (isLegacyWithdrawal(request)) {
          await tx.wallet.update({
            where: { userId: request.userId },
            data: {
              balance: { increment: reserved },
              frozenBalance: { decrement: reserved },
            },
          });
        } else {
          await tx.wallet.update({
            where: { userId: request.userId },
            data: { frozenBalance: { decrement: reserved } },
          });
        }

        const order = request.orderId
          ? await tx.order.findUnique({ where: { id: request.orderId } })
          : null;
        if (request.orderId && !order) throw new NotFoundError("Order not found");

        if (order) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "rejected",
              cancelledAt: new Date(),
              rejectionReason: reason ?? null,
            },
          });
        }

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: order ? "sell" : "withdrawal",
            amount: reserved,
            status: "rejected",
            description: order
              ? `Sell order rejected${reason ? `: ${reason}` : ""}`
              : `Withdrawal rejected${reason ? `: ${reason}` : ""}`,
            referenceId: id,
            approvedById: reviewerId,
            approvedAt: new Date(),
            direction: "credit",
            unit: "SAK",
            usdAmount: request.amount,
            sakAmount: reserved,
            pricePerSakUsd: request.rateUsedAtRequest ?? request.rateUsedAtApproval ?? null,
            paymentRequestId: id,
            holdingId: order?.holdingId ?? null,
            priceSnapshot: (order?.priceSnapshot as PriceSnapshot | null) ?? undefined,
          },
        });
      }

      await createNotificationIfPreferred(tx, {
        userId: request.userId,
        title:
          request.type === PAYMENT_TYPES.DEPOSIT
            ? "Deposit Rejected"
            : request.orderId
              ? "Sell Order Rejected"
              : "Withdrawal Rejected",
        message:
          reason && reason.trim()
            ? `Your ${request.type} of ${request.amount} ${request.currency} was rejected. Reason: ${reason}`
            : `Your ${request.type} of ${request.amount} ${request.currency} was rejected.`,
        type: "transaction",
      });

      const updated = await tx.paymentRequest.findUnique({ where: { id } });
      if (!updated) throw new NotFoundError("Payment request not found");
      return updated;
    });
  }
}
