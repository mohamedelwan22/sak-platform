import { prisma } from "../src/lib/prisma.js";
const o = await prisma.order.findUnique({
  where: { id: "a5d16efd-829b-4ba2-9f6f-d68ebe5e6a01" },
  include: { holding: true, paymentRequest: true, transaction: true, user: { select: { email: true } } },
});
console.log("order:", JSON.stringify(o, null, 2));
const sells = await prisma.order.findMany({ where: { type: "sell" }, include: { holding: { select: { userId: true } }, paymentRequest: true }, orderBy: { createdAt: "asc" } });
for (const s of sells) {
  console.log("sell", s.id.slice(0, 8), "user", s.userId.slice(0, 8), "holdingUser", s.holding?.userId?.slice(0, 8) ?? null, "qty", s.sakQuantity.toString(), "prId", s.paymentRequest?.id?.slice(0, 8) ?? null, "prOrderId", s.paymentRequest?.orderId?.slice(0, 8) ?? null);
}
await prisma.$disconnect();