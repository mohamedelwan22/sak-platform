import { prisma } from "../src/lib/prisma.js";

const BASE = "http://127.0.0.1:3001/api/v1";
const ADMIN_EMAIL = "qa.admin@sak100.qa";
const PASSWORD = "Qa!Investor2026";

async function api(method: string, path: string, token?: string, body?: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: unknown = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const login = await api("POST", "/auth/login", undefined, {
  email: ADMIN_EMAIL,
  password: PASSWORD,
});
if (login.status !== 200) {
  console.error("LOGIN FAILED", login.status, JSON.stringify(login.json));
  process.exit(1);
}
const token = (login.json as { data: { accessToken: string } }).data.accessToken;
console.log("admin login OK");

const saPriceBefore = await api("GET", "/public/sak-price");
console.log("price BEFORE:", JSON.stringify(saPriceBefore.json?.data));

const gold = await api("POST", "/gold", token, { gramPriceUsd: 100, source: "qa-setup" });
console.log("gold post:", gold.status, JSON.stringify(gold.json?.data ?? gold.json));

const effectiveFrom = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const sak = await api("POST", "/sak", token, {
  sakToGoldRatio: 0.1,
  sellFeePercent: 2,
  effectiveFrom,
});
console.log("sak config post:", sak.status, JSON.stringify(sak.json?.data ?? sak.json));

const saPriceAfter = await api("GET", "/public/sak-price");
console.log("price AFTER:", JSON.stringify(saPriceAfter.json?.data));

const goldRows = await prisma.goldPriceHistory.findMany({
  orderBy: { createdAt: "desc" },
  take: 3,
  select: { gramPriceUsd: true, source: true, createdAt: true },
});
console.log("gold rows:", JSON.stringify(goldRows));
const cfg = await prisma.sakConfig.findMany({
  orderBy: { effectiveFrom: "desc" },
  take: 3,
  select: { sakToGoldRatio: true, sellFeePercent: true, effectiveFrom: true },
});
console.log("sak cfg rows:", JSON.stringify(cfg));

await prisma.$disconnect();