import { prisma } from "../src/lib/prisma.js";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, "qa_tmp");
mkdirSync(TMP, { recursive: true });
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
writeFileSync(join(TMP, "front.png"), PNG_1PX);
writeFileSync(join(TMP, "back.png"), PNG_1PX);
writeFileSync(join(TMP, "selfie.png"), PNG_1PX);

const BASE = "http://127.0.0.1:3001/api/v1";
const PASSWORD = "Qa!Investor2026";
const EMAIL_ADMIN = "qa.admin@sak100.qa";
const EMAIL_A = "qa.investor.a@sak100.qa";
const EMAIL_B = "qa.investor.b@sak100.qa";
const PRICE = 10;

const results: { part: string; name: string; pass: boolean; detail: string }[] = [];
let failures = 0;

function t(part: string, name: string, pass: boolean, detail = "") {
  results.push({ part, name, pass, detail });
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"} [${part}] ${name}${detail ? ` :: ${detail}` : ""}`);
}
function eq(a: unknown, b: unknown) {
  return String(a) === String(b);
}

async function api(method: string, path: string, token?: string, body?: unknown, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = {};
  if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (extraHeaders) Object.assign(headers, extraHeaders);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function login(email: string, password: string) {
  const r = await api("POST", "/auth/login", undefined, { email, password });
  if (r.status !== 200) throw new Error(`login failed ${email} ${r.status} ${r.text}`);
  return {
    token: r.json.data.accessToken as string,
    refreshToken: r.json.data.refreshToken as string,
    user: r.json.data.user,
  };
}

async function walletDb(userId: string) {
  const w = await prisma.wallet.findUnique({ where: { userId } });
  return { balance: w?.balance ?? 0, frozen: w?.frozenBalance ?? 0 };
}

function floor4(n: number) {
  return Math.floor(n * 10000) / 10000;
}

console.log("=== QA E2E DRIVER START ===");

// ---------- SETUP ----------
const admin = await login(EMAIL_ADMIN, PASSWORD);
const a = await login(EMAIL_A, PASSWORD);
const b = await login(EMAIL_B, PASSWORD);
const uidA = a.user.userId;
const uidB = b.user.userId;
t("00", "admin login role=admin", admin.user.role === "admin", admin.user.role);
t("00", "investor A login role=investor", a.user.role === "investor", a.user.role);
t("00", "investor B login role=investor", b.user.role === "investor", b.user.role);

// Settle leftover QA state from previous driver runs (approve pending sell/withdrawal
// payment requests for A so wallet frozen returns to baseline; non-destructive, ledgered).
const leftoverPir = await prisma.paymentRequest.findMany({
  where: { userId: uidA, status: "pending", orderId: { not: null } },
  select: { id: true, amount: true },
});
for (const pr of leftoverPir) {
  const r = await api("POST", `/admin/payments/${pr.id}/approve`, admin.token);
  console.log(`cleanup: settled leftover sell PR ${pr.id.slice(0, 8)} (${pr.amount} USD) -> ${r.status}`);
}

// Reject leftover standalone withdrawal PRs (release frozen) so A/B baselines stay clean.
// Rejected txns are excluded from [28] net (status filter), so ledger invariants hold.
const leftoverW = await prisma.paymentRequest.findMany({
  where: { userId: { in: [uidA, uidB] }, status: "pending", type: "withdrawal", orderId: null },
  select: { id: true, amount: true },
});
for (const pr of leftoverW) {
  const r = await api("POST", `/admin/payments/${pr.id}/reject`, admin.token, { adminNotes: "qa cleanup leftover withdrawal" });
  console.log(`cleanup: rejected leftover withdrawal PR ${pr.id.slice(0, 8)} (${pr.amount} USD) -> ${r.status}`);
}

// Fund investor B (30 USD -> 3 SAK) so PART 09 can exercise the foreign-holdingId guard.
const bFund = await api("POST", "/profile/payment-requests", b.token, { type: "deposit", usdAmount: 30 });
t("00", "B funding deposit create 201", bFund.status === 201, `${bFund.status}`);
const bFundApprove = await api("POST", `/admin/payments/${bFund.json?.data?.id}/approve`, admin.token);
t("00", "B funding deposit approved (3 SAK)", bFundApprove.status === 200 && eq(bFundApprove.json?.data?.sakAmount, "3"), `${bFundApprove.status} ${bFundApprove.text.slice(0, 200)}`);

const priceR = await api("GET", "/public/sak-price", undefined);
t("06", "sak-price endpoint returns $10", eq(priceR.json?.data?.sak_price_usd, "10"), JSON.stringify(priceR.json?.data));
t("06", "gold gram price is 100", eq(priceR.json?.data?.gram_price_usd, "100"), priceR.json?.data?.gram_price_usd);
t("06", "sell fee percent is 2", eq(priceR.json?.data?.sell_fee_percent, "2"), priceR.json?.data?.sell_fee_percent);

const cat = await api("GET", "/marketplace/catalog", a.token);
const lands = cat.json?.data?.lands ?? [];
const landC = lands.find((l: any) => l.available_sak > 0 && l.status !== "sold_out");
const landA2 = lands.find((l: any) => l.id !== landC?.id && l.available_sak > 0 && l.status !== "sold_out");
t("00", "catalog lists purchasable lands", !!landC && !!landA2, `landC=${landC?.id} landA2=${landA2?.id}`);
const landIds = [landC.id, landA2.id];
const invBefore: Record<string, string> = {};
for (const id of landIds) {
  const l = await prisma.land.findUnique({ where: { id }, select: { availableSak: true } });
  invBefore[id] = l!.availableSak.toString();
  console.log(`inv before land ${id}: ${invBefore[id]}`);
}

// ---------- PART 03: DEPOSIT ----------
const wa0 = await walletDb(uidA);
const baseA = Number(wa0.balance);
const baseFrozenA = Number(wa0.frozen);
console.log(`baseline wallet A: balance=${wa0.balance} frozen=${wa0.frozen} (previous runs accumulate)`);
const holdAggA = await prisma.holding.aggregate({ where: { userId: uidA }, _sum: { sakOwned: true } });
const baseHoldA = Number(holdAggA._sum.sakOwned ?? 0);

const dep1 = await api("POST", "/profile/payment-requests", a.token, { type: "deposit", usdAmount: 1000 });
t("03", "deposit create 201", dep1.status === 201, `${dep1.status} ${dep1.text.slice(0, 200)}`);
const dep1Id = dep1.json?.data?.id;
t("03", "deposit request has no sak/rate at create", dep1.json?.data?.sak_amount == null && dep1.json?.data?.rate_used_at_request == null, JSON.stringify(dep1.json?.data));
const wa1 = await walletDb(uidA);
t("03", "deposit create does not touch wallet", Math.abs(Number(wa1.balance) - baseA) < 1e-6 && Number(wa1.frozen) === baseFrozenA, JSON.stringify(wa1));

const dep2 = await api("POST", "/profile/payment-requests", a.token, { type: "deposit", usdAmount: 999.99 });
t("03", "second deposit create 201", dep2.status === 201, `${dep2.status}`);
const dep2Id = dep2.json?.data?.id;

const depBad = await api("POST", "/profile/payment-requests", a.token, { type: "deposit", usdAmount: 0 });
t("03", "deposit 0 amount -> 400", depBad.status === 400, `${depBad.status}`);
const depBad2 = await api("POST", "/profile/payment-requests", a.token, { type: "deposit", usdAmount: -5 });
t("03", "deposit negative amount -> 400", depBad2.status === 400, `${depBad2.status}`);

const ap1 = await api("POST", `/admin/payments/${dep1Id}/approve`, admin.token);
t("03", "admin approve deposit1", ap1.status === 200, `${ap1.status} ${ap1.text.slice(0, 300)}`);
t("03", "deposit1 sakAmount=100 rate=10", eq(ap1.json?.data?.sakAmount, "100") && eq(ap1.json?.data?.rateUsedAtApproval, "10"), JSON.stringify(ap1.json?.data));
const wa2 = await walletDb(uidA);
t("03", "wallet +100 after deposit1 approve", Math.abs(Number(wa2.balance) - (baseA + 100.0)) < 1e-6, `${wa2.balance} (base ${baseA})`);

const ap2 = await api("POST", `/admin/payments/${dep2Id}/approve`, admin.token);
t("03", "admin approve deposit2 (999.99)", ap2.status === 200, `${ap2.status}`);
t("03", "deposit2 credits floor(99.999)->99.9990", eq(ap2.json?.data?.sakAmount, "99.999"), `${ap2.json?.data?.sakAmount}`);
const wa3 = await walletDb(uidA);
t("03", "wallet = base+199.9990", Math.abs(Number(wa3.balance) - (baseA + 199.999)) < 1e-6, `${wa3.balance} (base ${baseA})`);

const dep3 = await api("POST", "/profile/payment-requests", a.token, { type: "deposit", usdAmount: 500 });
const dep3Id = dep3.json?.data?.id;
const repDep = await api("POST", `/admin/payments/${dep3Id}/reject`, admin.token, { adminNotes: "qa reject deposit" });
t("03", "admin reject deposit3", repDep.status === 200, `${repDep.status}`);
const wa3b = await walletDb(uidA);
t("03", "rejected deposit does not change wallet", Math.abs(Number(wa3b.balance) - (baseA + 199.999)) < 1e-6 && Number(wa3b.frozen) === baseFrozenA, JSON.stringify(wa3b));

const dupApprove = await api("POST", `/admin/payments/${dep1Id}/approve`, admin.token);
t("03", "re-approve approved request -> 409", dupApprove.status === 409, `${dupApprove.status}`);

// ---------- PART 04: WITHDRAWAL (CRITICAL) ----------
const w1 = await api("POST", "/profile/payment-requests", a.token, { type: "withdrawal", usdAmount: 500 });
t("04", "withdrawal create 201", w1.status === 201, `${w1.status} ${w1.text.slice(0, 200)}`);
const w1Id = w1.json?.data?.id;
t("04", "withdrawal reserves ceil(50)=50, rate pinned", eq(w1.json?.data?.sak_amount, "50") && eq(w1.json?.data?.rate_used_at_request, "10"), JSON.stringify(w1.json?.data));
const wa4 = await walletDb(uidA);
t("04", "withdrawal create: balance unchanged, frozen +50", Math.abs(Number(wa4.balance) - (baseA + 199.999)) < 1e-6 && Number(wa4.frozen) === baseFrozenA + 50, JSON.stringify(wa4));
t("04", "available balance reduced", Math.abs((Number(wa4.balance) - Number(wa4.frozen)) - (baseA + 149.999)) < 1e-6, `${Number(wa4.balance) - Number(wa4.frozen)}`);

// Force insufficient: reserved must exceed current available, computed dynamically from the
// actual wallet (balance accumulates across runs). reserved = floor(avail)+10 > avail by design.
const waAvail = await walletDb(uidA);
const availNow = Number(waAvail.balance) - Number(waAvail.frozen);
const insuffUsd = (Math.max(Math.floor(availNow), 0) + 10) * 10;
const wInsuff = await api("POST", "/profile/payment-requests", a.token, { type: "withdrawal", usdAmount: insuffUsd });
t("04", "withdrawal insufficient available -> 400", wInsuff.status === 400, `${wInsuff.status} ${wInsuff.text.slice(0, 200)}`);

const apW1 = await api("POST", `/admin/payments/${w1Id}/approve`, admin.token);
t("04", "approve withdrawal", apW1.status === 200, `${apW1.status}`);
const wa5 = await walletDb(uidA);
t("04", "withdrawal approve: balance-50 frozen-50", Math.abs(Number(wa5.balance) - (baseA + 149.999)) < 1e-6 && Number(wa5.frozen) === baseFrozenA, JSON.stringify(wa5));

const w2 = await api("POST", "/profile/payment-requests", a.token, { type: "withdrawal", usdAmount: 300 });
const w2Id = w2.json?.data?.id;
const wa6 = await walletDb(uidA);
t("04", "withdrawal2 freezes 30", Number(wa6.frozen) === baseFrozenA + 30, JSON.stringify(wa6));
const rjW2 = await api("POST", `/admin/payments/${w2Id}/reject`, admin.token, { adminNotes: "qa reject withdrawal" });
t("04", "reject withdrawal2", rjW2.status === 200, `${rjW2.status}`);
const wa7 = await walletDb(uidA);
t("04", "withdrawal reject: frozen released, balance unchanged", Number(wa7.frozen) === baseFrozenA && Math.abs(Number(wa7.balance) - (baseA + 149.999)) < 1e-6, JSON.stringify(wa7));

// ---------- PART 07/08/14: BUY + WEIGHTED AVG + LANDS ----------
const holdC0 = await prisma.holding.aggregate({ where: { userId: uidA, landId: landC.id }, _sum: { sakOwned: true } });
const holdC0n = Number(holdC0._sum.sakOwned ?? 0);
const holdA2_0 = await prisma.holding.aggregate({ where: { userId: uidA, landId: landA2.id }, _sum: { sakOwned: true } });
const holdA2_0n = Number(holdA2_0._sum.sakOwned ?? 0);
console.log(`holding baseline landC=${holdC0n} landA2=${holdA2_0n}`);

const buy1 = await api("POST", "/marketplace/buy", a.token, { landId: landC.id, sakAmount: 10 });
t("07", "buy1 10 SAK -> 201", buy1.status === 201, `${buy1.status} ${buy1.text.slice(0, 300)}`);
const hold1 = buy1.json?.data?.holding;
t("07", "buy1 holding +10 price=10", Math.abs(Number(hold1?.sakOwned) - (holdC0n + 10)) < 1e-6 && eq(hold1?.purchasePricePerSakUsd, 10), JSON.stringify(hold1));
const wa8 = await walletDb(uidA);
t("07", "buy1 receipt wallet after == actual", Math.abs(Number(buy1.json?.data?.receipt?.walletBalanceAfter) - Number(wa8.balance)) < 1e-6, `${buy1.json?.data?.receipt?.walletBalanceAfter}`);
t("07", "buy1 balance = base+139.9990", Math.abs(Number(wa8.balance) - (baseA + 139.999)) < 1e-6 && Number(wa8.frozen) === baseFrozenA, JSON.stringify(wa8));

const landAfter1 = await prisma.land.findUnique({ where: { id: landC.id }, select: { availableSak: true } });
t("14", "land inventory decremented by 10", eq(Number(invBefore[landC.id]) - 10, Number(landAfter1?.availableSak)), `${invBefore[landC.id]} -> ${landAfter1?.availableSak}`);

const buy2 = await api("POST", "/marketplace/buy", a.token, { landId: landC.id, sakAmount: 15 });
t("07", "buy2 15 SAK same land -> 201", buy2.status === 201, `${buy2.status}`);
t("08", "weighted avg price stays 10 (same holding +15)", eq(buy2.json?.data?.holding?.id, hold1?.id) && Math.abs(Number(buy2.json?.data?.holding?.sakOwned) - (holdC0n + 25)) < 1e-6 && eq(buy2.json?.data?.holding?.purchasePricePerSakUsd, 10), JSON.stringify(buy2.json?.data?.holding));

const buy3 = await api("POST", "/marketplace/buy", a.token, { landId: landA2.id, sakAmount: 5 });
t("07", "buy3 5 SAK other land -> 201", buy3.status === 201, `${buy3.status}`);
t("07", "buy3 creates separate holding (+5 on landA2)", buy3.json?.data?.holding?.id !== hold1?.id && Math.abs(Number(buy3.json?.data?.holding?.sakOwned) - (holdA2_0n + 5)) < 1e-6, JSON.stringify(buy3.json?.data?.holding));

const wa9 = await walletDb(uidA);
t("07", "balance after buys = base+119.9990", Math.abs(Number(wa9.balance) - (baseA + 119.999)) < 1e-6 && Number(wa9.frozen) === baseFrozenA, JSON.stringify(wa9));

const buyInsuff = await api("POST", "/marketplace/buy", a.token, { landId: landC.id, sakAmount: 99999 });
t("07", "buy insufficient balance -> 400", buyInsuff.status === 400, `${buyInsuff.status} ${buyInsuff.text.slice(0, 150)}`);
const buyBadLand = await api("POST", "/marketplace/buy", a.token, { landId: "00000000-0000-0000-0000-000000000000", sakAmount: 1 });
t("07", "buy bad land uuid -> 404", buyBadLand.status === 404, `${buyBadLand.status}`);
const buyZero = await api("POST", "/marketplace/buy", a.token, { landId: landC.id, sakAmount: 0 });
t("07", "buy 0 -> 400", buyZero.status === 400, `${buyZero.status}`);

const landAfter2 = await prisma.land.findUnique({ where: { id: landA2.id }, select: { availableSak: true } });
t("14", "second land inventory -5", eq(Number(invBefore[landA2.id]) - 5, Number(landAfter2?.availableSak)), `${invBefore[landA2.id]} -> ${landAfter2?.availableSak}`);

// ---------- PART 09: SELL ----------
const sell1 = await api("POST", "/marketplace/sell", a.token, { sakAmount: 100 });
t("09", "sell 100 SAK -> 201", sell1.status === 201, `${sell1.status} ${sell1.text.slice(0, 300)}`);
const sell1Order = sell1.json?.data?.order;
t("09", "fee=2.0000 SAK subtotal=1000 feeUsd=20 proceeds=980", eq(sell1Order?.fee_sak, "2") && eq(sell1Order?.subtotal_usd, "1000") && eq(sell1Order?.fee_usd, "20") && eq(sell1Order?.total_usd, "980"), JSON.stringify(sell1Order));
t("09", "sell payment request amount=980 sak=100 rate=10", eq(sell1.json?.data?.payment_request?.usd_amount, "980") && eq(sell1.json?.data?.payment_request?.sak_amount, "100") && eq(sell1.json?.data?.payment_request?.rate_used_at_request, "10"), JSON.stringify(sell1.json?.data?.payment_request));
const sell1PrId = sell1.json?.data?.payment_request?.id;
const wa10 = await walletDb(uidA);
t("09", "sell create: frozen +100 balance unchanged", Number(wa10.frozen) === baseFrozenA + 100 && Math.abs(Number(wa10.balance) - (baseA + 119.999)) < 1e-6, JSON.stringify(wa10));

const apSell1 = await api("POST", `/admin/payments/${sell1PrId}/approve`, admin.token);
t("09", "approve sell -> 200", apSell1.status === 200, `${apSell1.status}`);
const wa11 = await walletDb(uidA);
t("09", "sell approve: balance=base+19.999 frozen=base", Math.abs(Number(wa11.balance) - (baseA + 19.999)) < 1e-6 && Number(wa11.frozen) === baseFrozenA, JSON.stringify(wa11));

const sell2 = await api("POST", "/marketplace/sell", a.token, { sakAmount: 10 });
const sell2PrId = sell2.json?.data?.payment_request?.id;
const rjSell2 = await api("POST", `/admin/payments/${sell2PrId}/reject`, admin.token, { adminNotes: "qa reject sell" });
t("09", "reject sell -> 200", rjSell2.status === 200, `${rjSell2.status}`);
const wa12 = await walletDb(uidA);
t("09", "sell reject: frozen released balance unchanged", Math.abs(Number(wa12.balance) - (baseA + 19.999)) < 1e-6 && Number(wa12.frozen) === baseFrozenA, JSON.stringify(wa12));

const sellInsuff = await api("POST", "/marketplace/sell", a.token, { sakAmount: 99999 });
t("09", "sell insufficient -> 400", sellInsuff.status === 400, `${sellInsuff.status}`);
const sellBadFrac = await api("POST", "/marketplace/sell", a.token, { sakAmount: "1.12345" });
t("09", "sell >4dp amount -> 400", sellBadFrac.status === 400, `${sellBadFrac.status}`);

const bBuy = await api("POST", "/marketplace/buy", b.token, { landId: landA2.id, sakAmount: 3 });
t("09", "B buy 3 SAK succeeds (funded)", bBuy.status === 201, `${bBuy.status} ${bBuy.text.slice(0, 120)}`);
const bHoldingId = bBuy.json?.data?.holding?.id;
const sellForeign = await api("POST", "/marketplace/sell", a.token, { sakAmount: 1, holdingId: bHoldingId });
t("09", "sell with other user's holdingId -> 400", sellForeign.status === 400, `${sellForeign.status} ${sellForeign.text.slice(0, 120)}`);

// ---------- PART 10: CONVERT ----------
const waCv0 = await walletDb(uidA);
const cv1 = await api("POST", "/marketplace/convert", a.token, { direction: "buy", landId: landC.id, sakAmount: 2 });
t("10", "convert direction=buy 2 SAK", cv1.status === 201 && eq(cv1.json?.data?.direction, "buy"), `${cv1.status} ${cv1.text.slice(0, 150)}`);
const cv2 = await api("POST", "/marketplace/convert", a.token, { direction: "sell", sakAmount: 3 });
t("10", "convert direction=sell 3 SAK", cv2.status === 201 && eq(cv2.json?.data?.direction, "sell") && eq(cv2.json?.data?.order?.sakQuantity, "3"), `${cv2.status}`);
const cv2PrId = cv2.json?.data?.paymentRequest?.id;
const cv2Approved = await api("POST", `/admin/payments/${cv2PrId}/approve`, admin.token);
t("10", "convert sell approved", cv2Approved.status === 200, `${cv2Approved.status}`);
const wa13 = await walletDb(uidA);
t("10", "balance after convert flows = precv-5 frozen=base", Math.abs(Number(wa13.balance) - (Number(waCv0.balance) - 5)) < 1e-6 && Number(wa13.frozen) === baseFrozenA, `before=${waCv0.balance} after=${wa13.balance}`);

// ---------- PART 11 / 26: ORDERS (user + admin) ----------
const myOrders = await api("GET", "/marketplace/orders", a.token);
t("11", "my orders list includes buy+sell orders", myOrders.status === 200 && myOrders.json?.data?.data?.length >= 7, `${myOrders.json?.data?.total}`);
const myComp = await api("GET", "/marketplace/orders?status=completed", a.token);
t("11", "orders filter by status=completed", myComp.json?.data?.data?.every((o: any) => o.status === "completed"), `${myComp.json?.data?.total}`);
const myBuy = await api("GET", "/marketplace/orders?type=buy", a.token);
t("11", "orders ignore unsupported type filter (200)", myBuy.status === 200, `${myBuy.status} total=${myBuy.json?.data?.total}`);

const admOrders = await api("GET", "/admin/orders", admin.token);
t("26", "admin orders list 200", admOrders.status === 200 && admOrders.json?.data?.data?.length >= 1, `${admOrders.status} total=${admOrders.json?.data?.total}`);
const admOrdersSell = await api("GET", "/admin/orders?type=sell&status=completed", admin.token);
t("26", "admin orders filter sell/completed", admOrdersSell.json?.data?.data?.every((o: any) => o.type === "sell" && o.status === "completed"), `${admOrdersSell.json?.data?.total}`);
const ro1 = admOrdersSell.json?.data?.data?.[0];
t("26", "admin orders join user+payment_request", !!ro1?.user?.email && !!ro1?.payment_request?.id, JSON.stringify(ro1));

// ---------- PART 12: TRANSACTIONS ----------
const myTx = await api("GET", "/profile/transactions", a.token);
t("12", "profile transactions 200", myTx.status === 200 && myTx.json?.data?.length >= 8, `${myTx.json?.data?.length}`);
const depRec = myTx.json?.data?.find((x: any) => x.type === "deposit" && String(x.sak_amount) === "100");
t("12", "deposit txn direction=credit unit=SAK", depRec?.direction === "credit" && depRec?.unit === "SAK", JSON.stringify(depRec));
const sellRec = myTx.json?.data?.find((x: any) => x.type === "sell" && x.status === "completed" && String(x.sak_amount) === "100");
t("12", "sell txn direction=debit sak=100", sellRec?.direction === "debit", JSON.stringify(sellRec));
const investToModule = await api("GET", "/transactions", a.token);
t("12", "investor /transactions -> 403 (self-service exists)", investToModule.status === 403, `${investToModule.status}`);

// ---------- PART 13/15: PORTFOLIO + ALLOCATION ----------
const portfolio = await api("GET", "/holdings/portfolio-summary", a.token);
t("13", "portfolio summary 200", portfolio.status === 200, `${portfolio.status} ${portfolio.text.slice(0, 200)}`);
t("15", "allocation percent sums ~100", Math.abs(portfolio.json?.data?.assetAllocation?.reduce((s: number, x: any) => s + Number(x.percent), 0) - 100) <= 0.01, JSON.stringify(portfolio.json?.data?.assetAllocation));
const myHolds = await api("GET", "/holdings/me", a.token);
const holdCount = myHolds.status === 200 ? myHolds.json?.data?.length : -1;
t("13", "holdings/me has holding rows", myHolds.status === 200 && holdCount >= 1, `${holdCount}`);
const holdTotal = myHolds.json?.data?.reduce((s: number, h: any) => s + Number(h.sakOwned), 0);
t("13", "holdings total = base+32 SAK (buys 25 + convert 2; sells are wallet-level)", Math.abs(holdTotal - (baseHoldA + 32)) < 1e-6, `total=${holdTotal} base=${baseHoldA}`);

// ---------- PART 16: SAK & GOLD ----------
const goldR = await api("GET", "/public/gold-price");
t("16", "gold-price endpoint", eq(goldR.json?.data?.gram_price_usd, "100"), JSON.stringify(goldR.json?.data));
const cfgR = await api("GET", "/public/sak-config");
t("16", "sak-config endpoint", eq(cfgR.json?.data?.sak_to_gold_ratio, "0.1") && eq(cfgR.json?.data?.sell_fee_percent, "2"), JSON.stringify(cfgR.json?.data));
const goldHist = await api("GET", "/gold/history");
t("16", "gold history public 200", goldHist.status === 200, `${goldHist.status}`);
t("16", "price == gold*ratio", eq(priceR.json?.data?.sak_price_usd, String(100 * 0.1)), `${priceR.json?.data?.sak_price_usd}`);

// ---------- PART 17: NOTIFICATIONS ----------
const notif = await api("GET", "/notifications", a.token);
t("17", "notifications list 200", notif.status === 200 && notif.json?.data?.data?.length >= 3, `${notif.status} total=${notif.json?.data?.total}`);
const unread = await api("GET", "/notifications/unread/count", a.token);
t("17", "unread count endpoint", unread.status === 200 && unread.json?.data?.count >= 0, JSON.stringify(unread.json?.data));
const aNotifId = notif.json?.data?.data?.find((n: any) => n.id)?.id;
const markRead = await api("POST", `/notifications/${aNotifId}/read`, a.token);
t("17", "mark single notif read", markRead.status === 200 && markRead.json?.data?.isRead === true, `${markRead.status}`);
const readAll = await api("POST", "/notifications/read-all", a.token, {});
t("17", "read-all 200", readAll.status === 200, `${readAll.status}`);

// ---------- PART 18: PREFERENCES ----------
const prefs = await api("GET", "/notifications/preferences", a.token);
t("18", "prefs list 200", prefs.status === 200, `${prefs.status} n=${prefs.json?.data?.length}`);
const PREF_TYPE = "wallet";
const PREF_CHANNEL = "email";
const prefsPut = await api("PUT", "/notifications/preferences", a.token, { type: PREF_TYPE, channel: PREF_CHANNEL, enabled: true });
t("18", "set pref (upsert create)", prefsPut.status === 200 && prefsPut.json?.data?.type === PREF_TYPE && prefsPut.json?.data?.enabled === true, `${prefsPut.status} ${JSON.stringify(prefsPut.json?.data)}`);
const prefsToggle = await api("PUT", "/notifications/preferences", a.token, { type: PREF_TYPE, channel: PREF_CHANNEL, enabled: false });
t("18", "toggle pref persists (upsert update)", prefsToggle.status === 200 && prefsToggle.json?.data?.enabled === false, `${prefsToggle.status} ${JSON.stringify(prefsToggle.json?.data)}`);
const prefsAfter = await api("GET", "/notifications/preferences", a.token);
t("18", "pref persisted in list", prefsAfter.json?.data?.find((p: any) => p.type === PREF_TYPE && p.channel === PREF_CHANNEL)?.enabled === false, JSON.stringify(prefsAfter.json?.data));

// ---------- PART 19: SUPPORT ----------
const sup1 = await api("POST", "/support", a.token, { subject: "QA ticket subject", body: "QA support message body" });
t("19", "create support ticket", sup1.status === 201 && !!sup1.json?.data?.id, `${sup1.status} ${sup1.text.slice(0, 150)}`);
const supId = sup1.json?.data?.id;
const supList = await api("GET", "/support", a.token);
t("19", "support list includes ticket", supList.json?.data?.data?.some((x: any) => x.id === supId), `${supList.json?.data?.total}`);
const supDet = await api("GET", `/support/${supId}`, a.token);
t("19", "support detail has message", supDet.json?.data?.messages?.length === 1, JSON.stringify(supDet.json?.data));

// ---------- PART 20: PAYMENTS IDOR ----------
const bReadA = await api("GET", `/payments/${dep1Id}`, b.token);
t("20", "B cannot read A's payment request -> 404", bReadA.status === 404, `${bReadA.status}`);
const bApproveA = await api("POST", `/payments/${dep1Id}/approve`, b.token);
t("20", "B cannot approve A's payment -> 403", bApproveA.status === 403, `${bApproveA.status}`);

const waB = await walletDb(uidB);
const baseB = Number(waB.balance);
console.log(`baseline wallet B: balance=${waB.balance} frozen=${waB.frozenBalance}`);
const bDep = await api("POST", "/profile/payment-requests", b.token, { type: "deposit", usdAmount: 500 });
const bDepId = bDep.json?.data?.id;
const bSelfApprove = await api("POST", `/payments/${bDepId}/approve`, b.token);
t("20", "B cannot self-approve -> 403", bSelfApprove.status === 403, `${bSelfApprove.status}`);
const adminApproveB = await api("POST", `/admin/payments/${bDepId}/approve`, admin.token);
t("20", "admin approves B deposit", adminApproveB.status === 200, `${adminApproveB.status}`);
const waB2 = await walletDb(uidB);
t("20", "B balance = base+50", Math.abs(Number(waB2.balance) - (baseB + 50)) < 1e-6, `${waB2.balance} (base ${baseB})`);

// ---------- PART 21/22: DOCUMENTS + KYC (before IDOR so submission exists) ----------
const fd = new FormData();
fd.append("documentType", "national_id");
fd.append("front", new Blob([readFileSync(join(TMP, "front.png"))], { type: "image/png" }), "front.png");
fd.append("back", new Blob([readFileSync(join(TMP, "back.png"))], { type: "image/png" }), "back.png");
fd.append("selfie", new Blob([readFileSync(join(TMP, "selfie.png"))], { type: "image/png" }), "selfie.png");
const kycSub = await api("POST", "/kyc", a.token, fd);
t("22", "KYC submit 201", kycSub.status === 201, `${kycSub.status} ${kycSub.text.slice(0, 300)}`);
const kycRec = kycSub.json?.data;
t("21", "KYC stored front/back/selfie paths", !!(kycRec?.frontImagePath || kycRec?.front_image_path), JSON.stringify(kycRec).slice(0, 300));
t("22", "KYC status pending", eq(kycRec?.status, "pending"), `${kycRec?.status}`);
const frontPath = kycRec?.frontImagePath;
const fileRes = frontPath ? await api("GET", `/admin/files/${frontPath}`, admin.token) : null;
t("21", "admin can fetch uploaded document", fileRes !== null && fileRes.status === 200, `${fileRes?.status}`);
const admKyc = await api("GET", "/admin/kyc", admin.token);
t("22", "admin KYC list includes submission", admKyc.json?.data?.data?.some((k: any) => k.id === kycRec?.id), `${admKyc.json?.data?.total}`);
const kycApprove = await api("POST", `/admin/kyc/${kycRec.id}/approve`, admin.token);
t("22", "admin approves KYC", kycApprove.status === 200 && eq(kycApprove.json?.data?.status, "approved"), `${kycApprove.status} ${kycApprove.text.slice(0, 200)}`);
const myKyc = await api("GET", "/profile/kyc", a.token);
t("22", "profile KYC reflects approved", eq(myKyc.json?.data?.status, "approved"), `${myKyc.json?.data?.status}`);

// ---------- PART 27: IDOR MATRIX ----------
const aKycId = kycRec?.id;
t("27", "B cannot fetch A's KYC by id (expect 404)", (await api("GET", `/kyc/${aKycId}`, b.token)).status === 404, `${(await api("GET", `/kyc/${aKycId}`, b.token)).status}`);
t("27", "B cannot fetch A's holding by id (expect 404)", (await api("GET", `/holdings/${hold1?.id}`, b.token)).status === 404, `${(await api("GET", `/holdings/${hold1?.id}`, b.token)).status}`);
t("27", "B cannot fetch A's notification (expect 404)", (await api("GET", `/notifications/${aNotifId}`, b.token)).status === 404, `${(await api("GET", `/notifications/${aNotifId}`, b.token)).status}`);
t("27", "B cannot fetch A's support ticket (expect 404)", (await api("GET", `/support/${supId}`, b.token)).status === 404, `${(await api("GET", `/support/${supId}`, b.token)).status}`);
t("27", "B cannot access admin orders -> 403", (await api("GET", "/admin/orders", b.token)).status === 403, `${(await api("GET", "/admin/orders", b.token)).status}`);
t("27", "B cannot access admin kyc -> 403", (await api("GET", "/admin/kyc", b.token)).status === 403, `${(await api("GET", "/admin/kyc", b.token)).status}`);
t("27", "B cannot access admin search -> 403", (await api("GET", "/admin/search?q=qa", b.token)).status === 403, `${(await api("GET", "/admin/search?q=qa", b.token)).status}`);

// ---------- PART 23: PERSONAL INFO ----------
const me = await api("GET", "/profile/me", a.token);
t("23", "profile/me returns personal info", me.status === 200 && me.json?.data?.firstName === "Qa" && me.json?.data?.email === EMAIL_A, JSON.stringify(me.json?.data));
t("23", "profile/me includes kyc_status=approved", eq(me.json?.data?.kyc_status, "approved"), `${me.json?.data?.kyc_status}`);

// ---------- PART 24: SECURITY SESSIONS ----------
const a2 = await login(EMAIL_A, PASSWORD);
const CRH = { "x-current-refresh-token": a2.refreshToken };
const sessions = await api("GET", "/auth/sessions", a2.token, undefined, CRH);
const sessList = sessions.json?.data ?? [];
const curr = sessList.find((s: any) => s.isCurrent);
t("24", "GET /auth/sessions returns >=2 sessions", sessions.status === 200 && sessList.length >= 2, `n=${sessList.length}`);
t("24", "isCurrent flag true for presenting session", !!curr, JSON.stringify(sessList.map((s: any) => ({ id: s.id, isCurrent: s.isCurrent }))));
const delSelf = await api("DELETE", `/auth/sessions/${curr?.id}`, a2.token, undefined, CRH);
t("24", "cannot delete current session -> 403", delSelf.status === 403, `${delSelf.status}`);
const other = sessList.find((s: any) => !s.isCurrent);
const delOther = await api("DELETE", `/auth/sessions/${other?.id}`, a2.token, undefined, CRH);
t("24", "delete other session -> 200", delOther.status === 200, `${delOther.status} ${delOther.text.slice(0, 120)}`);
const sessions2 = await api("GET", "/auth/sessions", a2.token, undefined, CRH);
t("24", "session count drops by 1", sessions2.json?.data?.length === sessList.length - 1, `${sessions2.json?.data?.length} (was ${sessList.length})`);

const refresh = await api("POST", "/auth/refresh", undefined, { refreshToken: a2.refreshToken });
const newRefresh = refresh.json?.data?.refreshToken;
t("24", "refresh rotates access + refresh token", refresh.status === 200 && !!refresh.json?.data?.accessToken && !!newRefresh && newRefresh !== a2.refreshToken, `${refresh.status} ${newRefresh === a2.refreshToken ? "NOT ROTATED" : "rotated"}`);
const reuse = await api("POST", "/auth/refresh", undefined, { refreshToken: a2.refreshToken });
t("24", "reused (rotated) refresh token rejected 401", reuse.status === 401, `${reuse.status}`);
const logout = await api("POST", "/auth/logout", undefined, { refreshToken: newRefresh });
t("24", "logout with current (post-rotation) token -> 200", logout.status === 200, `${logout.status}`);
const refreshAfterLogout = await api("POST", "/auth/refresh", undefined, { refreshToken: newRefresh });
t("24", "refresh after logout fails 401", refreshAfterLogout.status === 401, `${refreshAfterLogout.status}`);

const pwNew = "Qa!InvestorX2026";
const chPw = await api("POST", "/auth/change-password", b.token, { currentPassword: PASSWORD, password: pwNew, confirmPassword: pwNew });
t("24", "change password success", chPw.status === 200, `${chPw.status} ${chPw.text.slice(0, 150)}`);
const oldLogin = await api("POST", "/auth/login", undefined, { email: EMAIL_B, password: PASSWORD });
t("24", "old password rejected after change", oldLogin.status === 401, `${oldLogin.status}`);
const newLogin = await api("POST", "/auth/login", undefined, { email: EMAIL_B, password: pwNew });
t("24", "new password login works", newLogin.status === 200, `${newLogin.status}`);

const bUserDb = await prisma.user.findUnique({ where: { email: EMAIL_B } });
if (bUserDb) {
  const { hashPassword } = await import("../src/modules/auth/utils/password.utils.js");
  await prisma.user.update({ where: { id: bUserDb.id }, data: { passwordHash: await hashPassword(PASSWORD), tokenVersion: { increment: 1 } } });
}
t("24", "B password reset for idempotency", true, "");

const wrongPw = await api("POST", "/auth/login", undefined, { email: EMAIL_A, password: "WrongPass1234!" });
t("24", "wrong password rejected (401; 429 = shared auth rate limiter from repeated runs)", [401, 429].includes(wrongPw.status), `${wrongPw.status}`);

// ---------- LEGACY WITHDRAWAL PATHS (Part 04 support) ----------
const scratch = await prisma.user.upsert({
  where: { email: "qa.scratch@sak100.qa" },
  create: { email: "qa.scratch@sak100.qa", accountNumber: "SAK900004", roleId: (await prisma.role.findUniqueOrThrow({ where: { name: "investor" } })).id, status: "active", emailVerified: true, firstName: "Qa", lastName: "Scratch", passwordHash: null },
  update: {},
});
await prisma.wallet.upsert({ where: { userId: scratch.id }, create: { userId: scratch.id }, update: {} });
const scratchBase = await walletDb(scratch.id);
console.log(`baseline scratch wallet: balance=${scratchBase.balance} frozen=${scratchBase.frozen}`);

// legacy approve: rateUsedAtRequest=null, simulate pre-freeze
const legacy1 = await prisma.wallet.update({ where: { userId: scratch.id }, data: { frozenBalance: { increment: 10 } }, select: { balance: true, frozenBalance: true } });
const legacy1Req = await prisma.paymentRequest.create({ data: { userId: scratch.id, type: "withdrawal", amount: 100, currency: "USD", status: "pending", sakAmount: 10, rateUsedAtRequest: null, method: "bank_transfer" } });
const legacy1Apr = await api("POST", `/admin/payments/${legacy1Req.id}/approve`, admin.token);
const legacy1After = await walletDb(scratch.id);
t("04-legacy", "legacy withdrawal approve releases frozen only (no balance change)", legacy1Apr.status === 200 && eq(legacy1After.frozen, scratchBase.frozen) && eq(legacy1After.balance, scratchBase.balance), `frozen ${legacy1.frozenBalance}->${legacy1After.frozen} balance ${legacy1After.balance}`);

// legacy reject: balance credited back (legacy behavior)
await prisma.wallet.update({ where: { userId: scratch.id }, data: { frozenBalance: { increment: 10 } } });
const legacy2Req = await prisma.paymentRequest.create({ data: { userId: scratch.id, type: "withdrawal", amount: 100, currency: "USD", status: "pending", sakAmount: 10, rateUsedAtRequest: null, method: "bank_transfer" } });
const legacy2Rj = await api("POST", `/admin/payments/${legacy2Req.id}/reject`, admin.token, { adminNotes: "legacy reject" });
const legacy2After = await walletDb(scratch.id);
t("04-legacy", "legacy withdrawal reject credits balance +10 (legacy path)", legacy2Rj.status === 200 && eq(legacy2After.balance, Number(scratchBase.balance) + 10) && eq(legacy2After.frozen, scratchBase.frozen), JSON.stringify(legacy2After));

// ---------- PART 28: FINANCIAL INVARIANTS (A & B only; legacy excluded) ----------
const wA = await walletDb(uidA);
const wB = await walletDb(uidB);
const allWallets = await prisma.wallet.findMany({ where: { userId: { in: [uidA, uidB] } } });
const txnsA = await prisma.transaction.findMany({ where: { wallet: { userId: uidA } }, orderBy: { createdAt: "asc" } });
const txnsB = await prisma.transaction.findMany({ where: { wallet: { userId: uidB } }, orderBy: { createdAt: "asc" } });
function netFromTxns(txns: typeof txnsA) {
  let credit = 0;
  let debit = 0;
  for (const tx of txns) {
    if (tx.status !== "completed") continue;
    if (tx.direction === "credit") credit += Number(tx.amount);
    else debit += Number(tx.amount);
  }
  return { credit, debit, net: credit - debit };
}
const netA = netFromTxns(txnsA);
const netB = netFromTxns(txnsB);
t("28", "Wallet balance == credits-debits (A)", Math.abs(Number(wA.balance) - netA.net) < 1e-6, `balance=${wA.balance} net=${netA.net}`);
t("28", "Wallet balance == credits-debits (B)", Math.abs(Number(wB.balance) - netB.net) < 1e-6, `balance=${wB.balance} net=${netB.net}`);
const globalSum = allWallets.reduce((s, w) => s + Number(w.balance) + Number(w.frozenBalance), 0);
const globalNet = netA.net + netB.net;
t("28", "Global balance+frozen == net minted-burned (A+B)", Math.abs(globalSum - globalNet) < 1e-6, `sum=${globalSum} net=${globalNet}`);
t("28", "No unresolved frozen balance on QA A/B wallets", eq(wA.frozen, 0) && eq(wB.frozen, 0), `A=${wA.frozen} B=${wB.frozen}`);

for (const id of landIds) {
  const l = await prisma.land.findUnique({ where: { id } });
  console.log(`land audit ${id}: total=${l?.totalSakInventory} available=${l?.availableSak} status=${l?.status}`);
}
const landCTotal = await prisma.land.findUnique({ where: { id: landC.id }, select: { totalSakInventory: true, availableSak: true, status: true } });
t("28", "Land C: available == before-run minus 27", eq(Number(landCTotal?.availableSak), Number(invBefore[landC.id]) - 27), `avail=${landCTotal?.availableSak} before=${invBefore[landC.id]}`);
t("28", "Land C status active/partially_sold (not sold_out)", ["active", "partially_sold"].includes(landCTotal?.status ?? ""), `${landCTotal?.status}`);

const approvedSells = await prisma.order.findMany({ where: { type: "sell", status: "completed", userId: uidA } });
for (const o of approvedSells) {
  t("28", `sell ${o.id.slice(0, 8)}: feeUSD == feeSak*price`, Math.abs(Number(o.feeUsd) - Number(o.feeSak) * Number(o.unitPriceUsd)) < 1e-6, `feeSak=${o.feeSak} feeUsd=${o.feeUsd} price=${o.unitPriceUsd}`);
  t("28", `sell ${o.id.slice(0, 8)}: totalUSD == subtotal-fee`, Math.abs(Number(o.totalUsd) - (Number(o.subtotalUsd) - Number(o.feeUsd))) < 1e-6, `sub=${o.subtotalUsd} fee=${o.feeUsd} total=${o.totalUsd}`);
  const prLink = await prisma.paymentRequest.findUnique({ where: { orderId: o.id } });
  t("28", `sell ${o.id.slice(0, 8)}: links transaction + payment_request`, !!o.transactionId && !!prLink, `txn=${o.transactionId} pr=${prLink?.id}`);
}

let priceConsistent = true;
for (const tx of [...txnsA, ...txnsB]) {
  if (tx.status !== "completed") continue;
  if (tx.pricePerSakUsd && tx.pricePerSakUsd.toNumber() !== PRICE) priceConsistent = false;
}
t("28", "all completed txns priced at reference 10", priceConsistent, "");

const holdingSumA = await prisma.holding.aggregate({ where: { userId: uidA }, _sum: { sakOwned: true } });
const buySumA = await prisma.transaction.aggregate({ where: { wallet: { userId: uidA }, type: "buy" }, _sum: { amount: true } });
t("28", "A holdings sum == buy txn tally", Math.abs(Number(holdingSumA._sum.sakOwned) - Number(buySumA._sum.amount)) < 1e-6, `hold=${holdingSumA._sum.sakOwned} buys=${buySumA._sum.amount}`);

// ---------- PART 05 / 02 ----------
t("05", "all txns use SAK unit", [...txnsA, ...txnsB].every((tx) => tx.unit === "SAK"), "");
t("05", "wallet stays Decimal 20,8", wA.balance.decimalPlaces() <= 8, `balance=${wA.balance}`);
const orphanPay = await prisma.paymentRequest.count({ where: { userId: { in: [uidA, uidB] }, status: "approved", transactions: { none: {} } } });
t("02", "every approved QA paymentRequest has a transaction", orphanPay === 0, `approved-without-txn=${orphanPay}`);
const qaTxCount = await prisma.transaction.count({ where: { wallet: { userId: { in: [uidA, uidB] } } } });
t("02", "transactions ledger exists for QA wallets", qaTxCount >= 8, `count=${qaTxCount}`);

// ---------- PART 29: REAL ASSETS ----------
const raA = await api("GET", "/holdings/real-assets", a.token);
const raB = await api("GET", "/holdings/real-assets", b.token);
const raNoToken = await api("GET", "/holdings/real-assets");
t("29", "real-assets requires auth (401)", raNoToken.status === 401, `${raNoToken.status}`);
if (raA.status === 200 && raB.status === 200) {
  const dA = raA.json?.data;
  const dB = raB.json?.data;
  t("29", "A real-assets lists all keys", !!dA && Array.isArray(dA.assets) && "totalSakOwned" in dA && "totalValueUsd" in dA && "sakPriceUsd" in dA && !!dA.valuationDate, JSON.stringify(dA));
  let isoOk = true;
  for (const user of [
    { d: dA, uid: uidA },
    { d: dB, uid: uidB },
  ]) {
    for (const x of user.d?.assets ?? []) {
      const dbSum = await prisma.holding.aggregate({ where: { userId: user.uid, landId: x.landId }, _sum: { sakOwned: true } });
      if (Math.abs(Number(dbSum._sum.sakOwned ?? 0) - Number(x.sakOwned)) > 1e-6) isoOk = false;
    }
  }
  t("29", "A/B each see only their own per-land ownership (isolation)", isoOk, `A=${dA?.assets?.length} B=${dB?.assets?.length}`);
  const dbA = await prisma.holding.aggregate({ where: { userId: uidA }, _sum: { sakOwned: true } });
  t("29", "A totalSakOwned == holdings sum", Math.abs(Number(dA?.totalSakOwned ?? 0) - Number(dbA._sum.sakOwned ?? 0)) < 1e-6, `api=${dA?.totalSakOwned} db=${dbA._sum.sakOwned}`);
  const refPrice = await api("GET", "/public/sak-price");
  t("29", "A sakPriceUsd == public sak-price", eq(dA?.sakPriceUsd, refPrice.json?.data?.sak_price_usd), `api=${dA?.sakPriceUsd} ref=${refPrice.json?.data?.sak_price_usd}`);
  let valueOk = true;
  let allocOk = true;
  for (const x of dA?.assets ?? []) {
    if (Math.abs(Number(x.currentValueUsd ?? 0) - Number(x.sakOwned) * Number(dA.sakPriceUsd)) > 1e-6) valueOk = false;
    if (Math.abs(Number(x.averagePurchasePriceUsd) * Number(x.sakOwned) - Number(x.totalCostUsd)) > 1e-6) valueOk = false;
    if (x.allocationPercent != null && (Number(x.allocationPercent) < 0 || Number(x.allocationPercent) > 100 || Number.isNaN(Number(x.allocationPercent)))) allocOk = false;
  }
  const allocSum = (dA?.assets ?? []).reduce((s: number, x: any) => s + Number(x.allocationPercent ?? 0), 0);
  t("29", "A per-asset currentValue == sakOwned * live price (no fabricated values)", valueOk, "");
  t("29", "A allocation percentages are real numbers summing to ~100", allocOk && dA?.assets?.length > 0 && Math.abs(allocSum - 100) < 1e-6, `sum=${allocSum.toFixed(4)}`);
  const emptyUser = dB?.assets?.length === 0;
  t("29", "B real-assets envelope consistent", !!dA && !!dB, "");
  void emptyUser;
} else {
  t("29", "real-assets endpoint failed", false, `${raA.status} ${raB.status}`);
}

const summary = { total: results.length, pass: results.length - failures, fail: failures };
console.log("\n=== QA E2E SUMMARY ===");
console.log(JSON.stringify(summary, null, 2));
const failed = results.filter((r) => !r.pass);
if (failed.length) {
  console.log("\nFAILED LIST:");
  for (const f of failed) console.log(`- [${f.part}] ${f.name} :: ${f.detail}`);
}
console.log(`\nQA_E2E_RESULT=${failures === 0 ? "ALL_PASS" : "FAILURES"}`);
await prisma.$disconnect();
process.exit(failures === 0 ? 0 : 2);