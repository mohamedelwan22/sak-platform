const BASE = "http://127.0.0.1:3001/api/v1";
async function api(method: string, path: string, token?: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return res.status;
}
const rA = await api("POST", "/auth/login", undefined, { email: "qa.investor.a@sak100.qa", password: "Qa!Investor2026" });
const rB = await api("POST", "/auth/login", undefined, { email: "qa.investor.b@sak100.qa", password: "Qa!Investor2026" });
const dataA = await fetch(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "qa.admin@sak100.qa", password: "Qa!Investor2026" }) }).then((r) => r.json());
let a = "", b = "", adm = dataA.data.accessToken;
for (const [email, pw] of [["qa.investor.a@sak100.qa", "Qa!Investor2026"], ["qa.investor.b@sak100.qa", "Qa!Investor2026"]] as const) {
  const x = await fetch(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) }).then((r) => r.json());
  if (email.startsWith("qa.investor.a")) a = x.data.accessToken; else b = x.data.accessToken;
}
// B reaching admin endpoints
console.log("B /admin/orders:", await api("GET", "/admin/orders", b));
console.log("B /admin/kyc:", await api("GET", "/admin/kyc", b));
// IDOR reads
const holdsA = await fetch(`${BASE}/holdings/me`, { headers: { Authorization: `Bearer ${a}` } }).then((r) => r.json());
const holdId = holdsA.data?.[0]?.id;
console.log("A holdings count:", holdsA.data?.length, "first:", holdId);
if (holdId) {
  console.log("A can read own holding:", await api("GET", `/holdings/${holdId}`, a));
  console.log("B read A holding:", await api("GET", `/holdings/${holdId}`, b));
}
const kycList = await fetch(`${BASE}/kyc`, { headers: { Authorization: `Bearer ${a}` } }).then((r) => r.json());
const kycId = kycList.data?.data?.[0]?.id;
console.log("A kyc list count:", kycList.data?.data?.length, "first:", kycId);
if (kycId) {
  console.log("B read A kyc:", await api("GET", `/kyc/${kycId}`, b));
}
// sanity: admin still works
console.log("admin /admin/orders:", await api("GET", "/admin/orders", adm));
console.log("admin /admin/kyc:", await api("GET", "/admin/kyc", adm));