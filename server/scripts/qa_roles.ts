import { prisma } from "../src/lib/prisma.js";
const roles = await prisma.role.findMany({
  select: { name: true, rolePermissions: { select: { permission: { select: { name: true } } } } },
});
for (const r of roles) console.log(r.name, "=>", r.rolePermissions.map((x: any) => x.permission.name).sort().join(", "));
const inv = await prisma.role.findUnique({ where: { name: "investor" }, include: { rolePermissions: { include: { permission: true } } } });
console.log("has payments.read:", inv?.rolePermissions.some((rp: any) => rp.permission.name === "payments.read"));
console.log("has kyc.read:", inv?.rolePermissions.some((rp: any) => rp.permission.name === "kyc.read"));
console.log("has users.read:", inv?.rolePermissions.some((rp: any) => rp.permission.name === "users.read"));
console.log("has kyc.review/update:", inv?.rolePermissions.some((rp: any) => rp.permission.name.startsWith("kyc.")));
await prisma.$disconnect();