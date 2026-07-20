import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import {
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from "../src/modules/permissions/constants/index.js";

const SALT_ROUNDS = 12;

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
    { name: "super_admin", description: "Super Administrator with full system access" },
    { name: "admin", description: "Administrator with limited system access" },
    { name: "investor", description: "Regular investor with platform access" },
    { name: "client", description: "Client with basic platform access" },
    { name: "support", description: "Support staff with customer service access" },
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
  // Seed Permissions
  // ─────────────────────────────────────────
  console.log("\n  Seeding permissions...");
  for (const perm of ALL_PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { name: perm.name } });
    if (!existing) {
      await prisma.permission.create({
        data: {
          name: perm.name,
          description: perm.description,
          resource: perm.resource,
          type:
            perm.action === "read"
              ? "read"
              : perm.action === "delete"
                ? "delete"
                : perm.action === "manage"
                  ? "admin"
                  : "write",
        },
      });
      console.log(`  ✓ Permission "${perm.name}" created`);
    } else {
      console.log(`  ○ Permission "${perm.name}" already exists`);
    }
  }

  // ─────────────────────────────────────────
  // Seed Role-Permission mappings
  // ─────────────────────────────────────────
  console.log("\n  Seeding role-permission mappings...");
  for (const [roleName, permissionNames] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.log(`  ✗ Role "${roleName}" not found, skipping permissions`);
      continue;
    }

    const existingMappings = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
    });

    if (existingMappings.length > 0) {
      console.log(`  ○ Role "${roleName}" already has ${existingMappings.length} permissions`);
      continue;
    }

    const permissions = await prisma.permission.findMany({
      where: { name: { in: permissionNames } },
    });

    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      });
      console.log(`  ✓ Role "${roleName}" → ${permissions.length} permissions assigned`);
    }
  }

  // ─────────────────────────────────────────
  // Seed Users
  // ─────────────────────────────────────────
  const users = [
    {
      email: "superadmin@sak100.com",
      password: "SuperAdmin@123",
      firstName: "Super",
      lastName: "Admin",
      roleName: "super_admin" as const,
    },
    {
      email: "admin@sak100.com",
      password: "Admin@123",
      firstName: "System",
      lastName: "Admin",
      roleName: "admin" as const,
    },
    {
      email: "investor@sak100.com",
      password: "Investor@123",
      firstName: "Test",
      lastName: "Investor",
      roleName: "investor" as const,
    },
    {
      email: "client@sak100.com",
      password: "Client@123",
      firstName: "Test",
      lastName: "Client",
      roleName: "client" as const,
    },
  ];

  for (const userData of users) {
    const existing = await prisma.user.findUnique({ where: { email: userData.email } });
    if (existing) {
      console.log(`  ○ User "${userData.email}" already exists`);
      continue;
    }

    const role = await prisma.role.findUnique({ where: { name: userData.roleName } });
    if (!role) {
      console.log(`  ✗ Role "${userData.roleName}" not found, skipping user "${userData.email}"`);
      continue;
    }

    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        roleId: role.id,
        status: "active",
        emailVerified: true,
      },
    });
    console.log(`  ✓ User "${userData.email}" (${userData.roleName}) created`);
  }

  // ─────────────────────────────────────────
  // Seed Countries
  // ─────────────────────────────────────────
  const countries = [
    {
      name: "Egypt",
      code: "EGY",
      iso2: "EG",
      iso3: "EGY",
      phoneCode: "+20",
      currency: "Egyptian Pound",
      currencyCode: "EGP",
      nationality: "Egyptian",
      flag: "🇪🇬",
    },
    {
      name: "Saudi Arabia",
      code: "SAU",
      iso2: "SA",
      iso3: "SAU",
      phoneCode: "+966",
      currency: "Saudi Riyal",
      currencyCode: "SAR",
      nationality: "Saudi",
      flag: "🇸🇦",
    },
    {
      name: "United Arab Emirates",
      code: "ARE",
      iso2: "AE",
      iso3: "ARE",
      phoneCode: "+971",
      currency: "UAE Dirham",
      currencyCode: "AED",
      nationality: "Emirati",
      flag: "🇦🇪",
    },
    {
      name: "Jordan",
      code: "JOR",
      iso2: "JO",
      iso3: "JOR",
      phoneCode: "+962",
      currency: "Jordanian Dinar",
      currencyCode: "JOD",
      nationality: "Jordanian",
      flag: "🇯🇴",
    },
    {
      name: "Lebanon",
      code: "LBN",
      iso2: "LB",
      iso3: "LBN",
      phoneCode: "+961",
      currency: "Lebanese Pound",
      currencyCode: "LBP",
      nationality: "Lebanese",
      flag: "🇱🇧",
    },
    {
      name: "Kuwait",
      code: "KWT",
      iso2: "KW",
      iso3: "KWT",
      phoneCode: "+965",
      currency: "Kuwaiti Dinar",
      currencyCode: "KWD",
      nationality: "Kuwaiti",
      flag: "🇰🇼",
    },
    {
      name: "Bahrain",
      code: "BHR",
      iso2: "BH",
      iso3: "BHR",
      phoneCode: "+973",
      currency: "Bahraini Dinar",
      currencyCode: "BHD",
      nationality: "Bahraini",
      flag: "🇧🇭",
    },
    {
      name: "Qatar",
      code: "QAT",
      iso2: "QA",
      iso3: "QAT",
      phoneCode: "+974",
      currency: "Qatari Riyal",
      currencyCode: "QAR",
      nationality: "Qatari",
      flag: "🇶🇦",
    },
    {
      name: "Oman",
      code: "OMN",
      iso2: "OM",
      iso3: "OMN",
      phoneCode: "+968",
      currency: "Omani Rial",
      currencyCode: "OMR",
      nationality: "Omani",
      flag: "🇴🇲",
    },
    {
      name: "Iraq",
      code: "IRQ",
      iso2: "IQ",
      iso3: "IRQ",
      phoneCode: "+964",
      currency: "Iraqi Dinar",
      currencyCode: "IQD",
      nationality: "Iraqi",
      flag: "🇮🇶",
    },
  ];

  for (const country of countries) {
    const existing = await prisma.country.findUnique({ where: { code: country.code } });
    if (!existing) {
      await prisma.country.create({ data: country });
      console.log(`  ✓ Country "${country.name}" (${country.code}) created`);
    } else {
      await prisma.country.update({
        where: { code: country.code },
        data: {
          iso2: country.iso2,
          iso3: country.iso3,
          phoneCode: country.phoneCode,
          currency: country.currency,
          currencyCode: country.currencyCode,
          nationality: country.nationality,
          flag: country.flag,
        },
      });
      console.log(`  ○ Country "${country.name}" (${country.code}) updated with extended fields`);
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
