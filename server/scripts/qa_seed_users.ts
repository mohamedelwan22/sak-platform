import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/modules/auth/utils/password.utils.js";

const QA_PASSWORD = "Qa!Investor2026";

async function upsertUser(opts: {
  email: string;
  accountNumber: string;
  firstName: string;
  lastName: string;
  role: "admin" | "investor";
  phone?: string;
}) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: opts.role },
    select: { id: true },
  });
  const passwordHash = await hashPassword(QA_PASSWORD);
  const existing = await prisma.user.findUnique({ where: { email: opts.email } });
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          roleId: role.id,
          status: "active",
          emailVerified: true,
          isLocked: false,
          failedAttempts: 0,
          passwordHash,
          firstName: opts.firstName,
          lastName: opts.lastName,
          phone: opts.phone ?? null,
        },
      })
    : await prisma.user.create({
        data: {
          email: opts.email,
          accountNumber: opts.accountNumber,
          roleId: role.id,
          status: "active",
          emailVerified: true,
          passwordHash,
          firstName: opts.firstName,
          lastName: opts.lastName,
          phone: opts.phone ?? null,
        },
      });

  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0, frozenBalance: 0 },
    update: {},
  });

  console.log(`${opts.email} (${opts.role}) id=${user.id} acct=${user.accountNumber}`);
  return user;
}

const a = await upsertUser({
  email: "qa.investor.a@sak100.qa",
  accountNumber: "SAK900001",
  firstName: "Qa",
  lastName: "InvestorA",
  role: "investor",
});
const b = await upsertUser({
  email: "qa.investor.b@sak100.qa",
  accountNumber: "SAK900002",
  firstName: "Qa",
  lastName: "InvestorB",
  role: "investor",
});
const adm = await upsertUser({
  email: "qa.admin@sak100.qa",
  accountNumber: "SAK900003",
  firstName: "Qa",
  lastName: "Admin",
  role: "admin",
});

console.log(
  JSON.stringify({
    qaPassword: QA_PASSWORD,
    investorA: { userId: a.id, email: a.email },
    investorB: { userId: b.id, email: b.email },
    admin: { userId: adm.id, email: adm.email },
  }),
);

await prisma.$disconnect();