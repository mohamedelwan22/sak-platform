import { prisma } from "../src/lib/prisma.js";

try {
  const r = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log("DB OK", JSON.stringify(r));
  const count = await prisma.user.count();
  console.log("users:", count);
} catch (e) {
  console.error("DB FAIL", (e as Error).message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}