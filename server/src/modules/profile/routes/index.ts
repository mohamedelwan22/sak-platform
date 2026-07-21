import { Router } from "express";
import { authenticate } from "../../auth/middleware/index.js";
import { prisma } from "../../../lib/prisma.js";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";

const router = Router();

router.get("/me", authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendNotFound(res, "User not found");
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { name: true } },
      kycSubmissions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });
  if (!user) {
    sendNotFound(res, "User not found");
    return;
  }
  const kycStatus = user.kycSubmissions?.[0]?.status ?? "not_submitted";
  sendSuccess(res, { ...user, kyc_status: kycStatus }, "Profile retrieved");
});

router.get("/wallet", authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendNotFound(res, "User not found");
    return;
  }
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: {
      id: true,
      balance: true,
      frozenBalance: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const mapped = wallet ? { ...wallet, sak_balance: wallet.balance } : null;
  sendSuccess(res, mapped, "Wallet retrieved");
});

router.get("/holdings", authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendNotFound(res, "User not found");
    return;
  }
  const holdings = await prisma.holding.findMany({
    where: { userId },
    include: {
      land: {
        select: {
          id: true,
          titleAr: true,
          country: true,
          city: true,
          coverImageUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const mapped = holdings.map((h) => ({
    id: h.id,
    sak_owned: h.sakOwned,
    maturity_date: h.maturityDate.toISOString(),
    status: h.status,
    land: h.land,
    created_at: h.createdAt.toISOString(),
  }));
  sendSuccess(res, mapped, "Holdings retrieved");
});

router.get("/transactions", authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendNotFound(res, "User not found");
    return;
  }
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!wallet) {
    sendSuccess(res, [], "No transactions");
    return;
  }
  const transactions = await prisma.transaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const mapped = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    direction: t.type === "deposit" || t.type === "transfer_in" ? "credit" : "debit",
    sak_amount: t.amount,
    usd_amount: t.amount,
    sak_price_at_time: null,
    created_at: t.createdAt.toISOString(),
    status: t.status,
    description: t.description,
    wallet_id: t.walletId,
  }));
  sendSuccess(res, mapped, "Transactions retrieved");
});

router.get("/payment-requests", authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendNotFound(res, "User not found");
    return;
  }
  const requests = await prisma.paymentRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const mapped = requests.map((r) => ({
    id: r.id,
    type: r.type,
    method: r.method,
    usd_amount: r.amount,
    currency: r.currency,
    sak_amount: r.sakAmount,
    status: r.status,
    rejection_reason: r.rejectionReason,
    admin_notes: r.adminNotes,
    proof_path: r.proofPath,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }));
  sendSuccess(res, mapped, "Payment requests retrieved");
});

router.post("/payment-requests", authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendNotFound(res, "User not found");
    return;
  }
  const { type, usdAmount, method, proofPath } = req.body;
  const request = await prisma.paymentRequest.create({
    data: {
      userId,
      type: type ?? "deposit",
      method: method ?? "bank_transfer",
      amount: Number(usdAmount),
      proofPath: proofPath ?? null,
    },
  });
  sendSuccess(res, request, "Payment request created");
});

router.get("/kyc", authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    sendNotFound(res, "User not found");
    return;
  }
  const submission = await prisma.kycSubmission.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  sendSuccess(res, submission, "KYC submission retrieved");
});

export default router;
