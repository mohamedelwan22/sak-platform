import { prisma } from "../src/lib/prisma.js";

const roles = await prisma.role.findMany({
  include: { rolePermissions: { include: { permission: true } } },
});
console.log("=== ROLES ===");
for (const r of roles) {
  console.log(
    `role=${r.name} perms=[${r.rolePermissions.map((rp) => rp.permission.name).join(", ")}]`,
  );
}

const perms = await prisma.permission.findMany({ orderBy: { name: "asc" } });
console.log(`\n=== PERMISSIONS (${perms.length}) ===`);
for (const p of perms) console.log(`${p.name} [${p.resource}]`);

const sakCfg = await prisma.sakConfig.findMany({ orderBy: { effectiveFrom: "desc" }, take: 3 });
console.log(`\n=== SAK_CONFIG (${sakCfg.length}) ===`);
for (const c of sakCfg) {
  console.log(`ratio=${c.sakToGoldRatio} sellFee=${c.sellFeePercent} from=${c.effectiveFrom}`);
}

const gold = await prisma.goldPriceHistory.findMany({ orderBy: { createdAt: "desc" }, take: 3 });
console.log(`\n=== GOLD_PRICE_HISTORY (last of ${await prisma.goldPriceHistory.count()}) ===`);
for (const g of gold) console.log(`gramPriceUsd=${g.gramPriceUsd} source=${g.source} at=${g.createdAt}`);

const projects = await prisma.project.findMany();
const lands = await prisma.land.findMany();
console.log(`\n=== PROJECTS (${projects.length}) / LANDS (${lands.length}) ===`);
for (const p of projects) console.log(`project=${p.titleEn} status=${p.status}`);
for (const l of lands) {
  console.log(`land=${l.titleEn} inv=${l.totalSakInventory} avail=${l.availableSak} maturity=${l.maturityMonths}`);
}

const countries = await prisma.country.findMany({ where: { status: "active" } });
console.log(`\n=== COUNTRIES (${countries.length}) ===`);
for (const c of countries) console.log(`${c.name} code=${c.code} iso2=${c.iso2}`);

const users = await prisma.user.findMany({
  select: { email: true, accountNumber: true, status: true, emailVerified: true, role: { select: { name: true } } },
});
console.log(`\n=== USERS (${users.length}) ===`);
for (const u of users) {
  console.log(`${u.email} acct=${u.accountNumber} status=${u.status} verified=${u.emailVerified} role=${u.role.name}`);
}

await prisma.$disconnect();