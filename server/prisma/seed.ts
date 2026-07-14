import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...\n");

  // ─────────────────────────────────────────
  // Seed Roles
  // ─────────────────────────────────────────
  const roles = [
    {
      name: "super_admin",
      description: "Super Administrator with full system access",
    },
    {
      name: "admin",
      description: "Administrator with limited system access",
    },
    {
      name: "investor",
      description: "Regular investor with platform access",
    },
  ];

  for (const role of roles) {
    const existing = await prisma.role.findUnique({ where: { name: role.name } });
    if (!existing) {
      await prisma.role.create({ data: role });
      console.log(`  ✓ Role "${role.name}" created`);
    } else {
      console.log(`  ○ Role "${role.name}" already exists`);
    }
  }

  // ─────────────────────────────────────────
  // Seed Countries
  // ─────────────────────────────────────────
  const countries = [
    { name: "Egypt", code: "EGY" },
    { name: "Saudi Arabia", code: "SAU" },
    { name: "United Arab Emirates", code: "ARE" },
    { name: "Jordan", code: "JOR" },
    { name: "Lebanon", code: "LBN" },
    { name: "Kuwait", code: "KWT" },
    { name: "Bahrain", code: "BHR" },
    { name: "Qatar", code: "QAT" },
    { name: "Oman", code: "OMN" },
    { name: "Iraq", code: "IRQ" },
  ];

  for (const country of countries) {
    const existing = await prisma.country.findUnique({ where: { code: country.code } });
    if (!existing) {
      await prisma.country.create({ data: country });
      console.log(`  ✓ Country "${country.name}" (${country.code}) created`);
    } else {
      console.log(`  ○ Country "${country.name}" (${country.code}) already exists`);
    }
  }

  // ─────────────────────────────────────────
  // Seed Cities
  // ─────────────────────────────────────────
  const cityData: Array<{ countryCode: string; name: string }> = [
    { countryCode: "EGY", name: "Cairo" },
    { countryCode: "EGY", name: "Alexandria" },
    { countryCode: "EGY", name: "Giza" },
    { countryCode: "SAU", name: "Riyadh" },
    { countryCode: "SAU", name: "Jeddah" },
    { countryCode: "SAU", name: "Dammam" },
    { countryCode: "ARE", name: "Dubai" },
    { countryCode: "ARE", name: "Abu Dhabi" },
    { countryCode: "ARE", name: "Sharjah" },
    { countryCode: "JOR", name: "Amman" },
    { countryCode: "JOR", name: "Zarqa" },
    { countryCode: "LBN", name: "Beirut" },
    { countryCode: "LBN", name: "Tripoli" },
    { countryCode: "KWT", name: "Kuwait City" },
    { countryCode: "KWT", name: "Hawalli" },
    { countryCode: "BHR", name: "Manama" },
    { countryCode: "QAT", name: "Doha" },
    { countryCode: "OMN", name: "Muscat" },
    { countryCode: "IRQ", name: "Baghdad" },
    { countryCode: "IRQ", name: "Basra" },
  ];

  for (const city of cityData) {
    const country = await prisma.country.findUnique({ where: { code: city.countryCode } });
    if (!country) {
      console.log(`  ✗ Country "${city.countryCode}" not found, skipping city "${city.name}"`);
      continue;
    }

    const existing = await prisma.city.findUnique({
      where: { countryId_name: { countryId: country.id, name: city.name } },
    });

    if (!existing) {
      await prisma.city.create({
        data: {
          countryId: country.id,
          name: city.name,
        },
      });
      console.log(`  ✓ City "${city.name}" (${city.countryCode}) created`);
    } else {
      console.log(`  ○ City "${city.name}" (${city.countryCode}) already exists`);
    }
  }

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
