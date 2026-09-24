import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { AppError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { roundMoney, toDecimal } from "../../../lib/money.js";
import { goldPriceService } from "../../../services/gold-price.service.js";
import { createNotificationIfPreferred } from "../../notifications/services/notification-preference.service.js";
import { PaymentAccountingService } from "../../payments/services/payment-accounting.service.js";
import { commissionsService } from "../../commissions/services/commissions.service.js";
import { logger } from "../../../lib/logger.js";

const log = logger.child({ context: "MarketplaceService" });

const VALID_ORDER_STATUSES = ["pending", "processing", "completed", "cancelled", "rejected"];

export class MarketplaceService {
  private readonly accountingService = new PaymentAccountingService(prisma);

  async getCatalog() {
    const [lands, quote, config] = await Promise.all([
      prisma.land.findMany({
        where: { status: { in: ["active", "partially_sold", "sold_out"] } },
        orderBy: { createdAt: "desc" },
      }),
      goldPriceService.getCurrentMarketQuote().catch(() => null),
      prisma.sakConfig.findFirst({
        where: { effectiveFrom: { lte: new Date() } },
        orderBy: { effectiveFrom: "desc" },
        select: { sakToGoldRatio: true, sellFeePercent: true, effectiveFrom: true },
      }),
    ]);

    const pricePerSakUsd = quote ? quote.sakPriceUsd.toNumber() : null;

    return {
      lands: lands.map((land) => ({
        id: land.id,
        project_id: land.projectId,
        title_ar: land.titleAr,
        description_ar: land.descriptionAr,
        country: land.country,
        city: land.city,
        asset_type: land.assetType,
        area_m2: land.areaM2,
        expected_roi: land.expectedRoi,
        maturity_months: land.maturityMonths,
        total_sak_inventory: land.totalSakInventory,
        available_sak: land.availableSak,
        price_per_sak_usd: pricePerSakUsd,
        cover_image_url: land.coverImageUrl,
        status: land.status,
      })),
      price: pricePerSakUsd,
      price_source: quote?.source ?? null,
      price_is_stale: quote?.isStale ?? null,
      price_updated_at: quote ? (quote.sourceUpdatedAt ?? quote.fetchedAt).toISOString() : null,
      gram_price_usd: quote ? quote.pricePerGram.toNumber() : null,
      gold_price_per_ounce_usd: quote ? quote.pricePerOunce.toNumber() : null,
      gold_updated_at: quote ? quote.fetchedAt.toISOString() : null,
      sak_to_gold_ratio: config?.sakToGoldRatio ?? null,
      sell_fee_percent: config?.sellFeePercent ?? null,
    };
  }

  async getMyOrders(userId: string, filters: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const status =
      filters.status && VALID_ORDER_STATUSES.includes(filters.status)
        ? (filters.status as Prisma.OrderWhereInput["status"])
        : undefined;

    const where: Prisma.OrderWhereInput = { userId };
    if (status) {
      where.status = status;
    }
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          land: { select: { id: true, titleAr: true, coverImageUrl: true } },
          transaction: {
            select: { id: true, direction: true, status: true, createdAt: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: orders.map((o) => ({
        id: o.id,
        type: o.type,
        status: o.status,
        direction: o.direction,
        sak_quantity: o.sakQuantity,
        unit_price_usd: o.unitPriceUsd,
        subtotal_usd: o.subtotalUsd,
        fee_sak: o.feeSak,
        fee_usd: o.feeUsd,
        total_usd: o.totalUsd,
        land: o.land
          ? { id: o.land.id, title_ar: o.land.titleAr, cover_image_url: o.land.coverImageUrl }
          : null,
        transaction: o.transaction
          ? {
              id: o.transaction.id,
              direction: o.transaction.direction,
              status: o.transaction.status,
              created_at: o.transaction.createdAt,
            }
          : null,
        completed_at: o.completedAt,
        cancelled_at: o.cancelledAt,
        rejection_reason: o.rejectionReason,
        created_at: o.createdAt,
      })),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async buySak(
    userId: string,
    input: { landId: string; sakAmount: number },
  ): Promise<{
    holding: unknown;
    transaction: unknown;
    order: unknown;
    wallet: { balance: Prisma.Decimal };
    land: { availableSak: Prisma.Decimal };
    receipt: Record<string, unknown>;
  }> {
    const { landId, sakAmount } = input;
    if (!landId || typeof landId !== "string") {
      throw new ValidationError("Invalid land ID");
    }
    if (typeof sakAmount !== "number" || !Number.isFinite(sakAmount)) {
      throw new ValidationError("SAK amount must be a valid number");
    }
    if (sakAmount <= 0) {
      throw new ValidationError("SAK amount must be greater than zero");
    }
    const qty = Math.floor(Number(sakAmount));
    if (!qty || qty <= 0) {
      throw new ValidationError("SAK amount must be a positive integer");
    }

    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land) throw new NotFoundError("Land not found");
    if (land.status !== "active" && land.status !== "partially_sold") {
      throw new AppError("This land is not available for purchase", 400, true, "INVALID_STATUS");
    }
    if (new Prisma.Decimal(land.availableSak.toString()).lessThan(new Prisma.Decimal(qty))) {
      throw new AppError("Insufficient SAK inventory", 400, true, "INSUFFICIENT_INVENTORY");
    }

    // Transaction-time market quote — the price snapshot is stored on the
    // transaction/order and is NEVER recalculated with later gold prices.
    const marketQuote = await goldPriceService.getCurrentMarketQuote();
    const pricePerSak = marketQuote.sakPriceUsd;
    const priceSnapshot = goldPriceService.buildPriceSnapshot(marketQuote, qty);

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "wallets" WHERE user_id = ${userId} FOR UPDATE`;
      const lockedWallet = await tx.wallet.findUnique({ where: { userId } });
      if (!lockedWallet) {
        throw new AppError("Wallet not found", 404, true, "WALLET_NOT_FOUND");
      }
      const availableSak = lockedWallet.balance.sub(lockedWallet.frozenBalance);
      if (availableSak.lessThan(toDecimal(qty))) {
        throw new AppError("Insufficient available balance", 400, true, "INSUFFICIENT_BALANCE");
      }

      const updatedLand = await tx.land.update({
        where: { id: landId },
        data: { availableSak: { decrement: qty } },
      });

      const existingHolding = await tx.holding.findFirst({ where: { userId, landId } });

      const subtotalUsd = toDecimal(qty).mul(pricePerSak);
      let holding;
      if (existingHolding) {
        const currentQty = toDecimal(existingHolding.sakOwned.toString());
        const currentPrice = toDecimal(
          existingHolding.purchasePricePerSakUsd
            ? existingHolding.purchasePricePerSakUsd.toString()
            : pricePerSak.toString(),
        );
        const newQty = currentQty.add(toDecimal(qty));
        const newAvgPrice = currentQty
          .mul(currentPrice)
          .add(toDecimal(qty).mul(pricePerSak))
          .div(newQty);

        holding = await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            sakOwned: { increment: qty },
            purchasePricePerSakUsd: roundMoney(newAvgPrice, 4),
          },
        });
      } else {
        const maturityDate = new Date();
        maturityDate.setMonth(maturityDate.getMonth() + land.maturityMonths);

        // Capture broker attribution from the user's approved booking for this asset,
        // keeping broker_id as the historical attribution source of truth.
        const attribution = await tx.bookingRequest.findFirst({
          where: { requestedById: userId, landId, brokerId: { not: null }, status: "approved" },
          orderBy: { createdAt: "desc" },
          select: { brokerId: true },
        });

        holding = await tx.holding.create({
          data: {
            userId,
            landId,
            brokerId: attribution?.brokerId ?? null,
            sakOwned: qty,
            purchasePricePerSakUsd: pricePerSak,
            maturityDate,
            status: "active",
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          walletId: lockedWallet.id,
          type: "buy",
          amount: qty,
          status: "completed",
          description: `شراء ${qty} وحدة SAK من الأصل ${land.titleAr}`,
          direction: "debit",
          unit: "SAK",
          usdAmount: subtotalUsd,
          sakAmount: qty,
          pricePerSakUsd: pricePerSak,
          holdingId: holding.id,
          priceSnapshot,
        },
      });
      const transactionId = transaction.id;

      const order = await tx.order.create({
        data: {
          userId,
          landId,
          walletId: lockedWallet.id,
          holdingId: holding.id,
          transactionId,
          type: "buy",
          status: "completed",
          direction: "buy",
          sakQuantity: qty,
          unitPriceUsd: pricePerSak,
          subtotalUsd: roundMoney(subtotalUsd, 8),
          feeSak: toDecimal(0),
          feeUsd: toDecimal(0),
          totalUsd: roundMoney(subtotalUsd, 8),
          completedAt: transaction.createdAt,
          priceSnapshot,
        },
      });

      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: qty } },
      });

      await createNotificationIfPreferred(tx, {
        userId,
        title: "تم شراء SAK بنجاح",
        message: `تم شراء ${qty} وحدة SAK بنجاح من ${land.titleAr}`,
        type: "investment",
      });

      const availableAfter = new Prisma.Decimal(updatedLand.availableSak.toString());
      if (availableAfter.equals(0)) {
        await tx.land.update({ where: { id: landId }, data: { status: "sold_out" } });
      } else if (land.status === "active") {
        await tx.land.update({ where: { id: landId }, data: { status: "partially_sold" } });
      }

      const wallet = (await tx.wallet.findUnique({ where: { userId } }))!;
      return {
        holding,
        transaction,
        order,
        wallet: { balance: wallet.balance },
        land: { availableSak: updatedLand.availableSak },
        receipt: {
          landId,
          landTitle: land.titleAr,
          sakAmount: qty,
          pricePerSakUsd: pricePerSak.toNumber(),
          goldPricePerOunceUsd: marketQuote.pricePerOunce.toNumber(),
          goldPricePerGramUsd: marketQuote.pricePerGram.toNumber(),
          goldWeightGrams: toDecimal(qty).mul(marketQuote.sakToGoldRatio).toNumber(),
          priceSource: marketQuote.source,
          priceTimestamp: (marketQuote.sourceUpdatedAt ?? marketQuote.fetchedAt).toISOString(),
          totalCostSak: subtotalUsd.toNumber(),
          walletBalanceAfter: wallet.balance.toNumber(),
          remainingInventory: updatedLand.availableSak.toNumber(),
          maturityDate: holding.maturityDate.toISOString(),
          transactionId,
          holdingId: holding.id,
          orderId: order.id,
          purchasedAt: transaction.createdAt.toISOString(),
        },
      };
    });

    // Idempotent commission triggers after the investment is committed.
    try {
      await commissionsService.calculateCommission((result.holding as any).id, "referral");
    } catch (err: any) {
      log.error("Referral commission trigger failed", { error: err.message });
    }
    try {
      await commissionsService.calculateCommission((result.holding as any).id, "broker");
    } catch (err: any) {
      log.error("Broker commission trigger failed", { error: err.message });
    }

    return result;
  }

  sellSak(
    userId: string,
    input: { sakAmount: string; method?: string; holdingId?: string | null },
  ) {
    return this.accountingService.createSellRequest({
      userId,
      sakAmount: input.sakAmount,
      method: input.method,
      holdingId: input.holdingId,
    });
  }

  async convert(
    userId: string,
    input: {
      direction: "buy" | "sell";
      landId?: string;
      sakAmount: string | number;
      method?: string;
      holdingId?: string | null;
    },
  ) {
    if (input.direction === "buy") {
      if (!input.landId) throw new ValidationError("landId is required for buy conversion");
      const result = await this.buySak(userId, {
        landId: input.landId,
        sakAmount: Number(input.sakAmount),
      });
      return { direction: "buy", ...result };
    }
    const result = await this.sellSak(userId, {
      sakAmount: String(input.sakAmount),
      method: input.method,
      holdingId: input.holdingId,
    });
    return { direction: "sell", ...result };
  }
}
