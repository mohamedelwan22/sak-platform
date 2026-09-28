import type { PrismaClient } from "@prisma/client";

/**
 * Phase 10 — extensible audience segment registry.
 * Segments are server-side resolvers; the admin UI only sees keys + labels.
 * Add a new segment by registering it here — no other wiring required.
 */
export interface SegmentDefinition {
  key: string;
  labelEn: string;
  labelAr: string;
  resolve: (prisma: PrismaClient) => Promise<string[]>;
}

export const SEGMENT_REGISTRY: SegmentDefinition[] = [
  {
    key: "kyc_approved_investors",
    labelEn: "KYC-approved investors",
    labelAr: "المستثمرون المعتمدون (KYC)",
    resolve: async (prisma) => {
      const rows = await prisma.kycSubmission.findMany({
        where: { status: "approved" },
        select: { userId: true },
        distinct: ["userId"],
      });
      return rows.map((r) => r.userId);
    },
  },
  {
    key: "investors_with_holdings",
    labelEn: "Investors with active holdings",
    labelAr: "المستثمرون بحيازات نشطة",
    resolve: async (prisma) => {
      const rows = await prisma.holding.findMany({
        where: { status: "active" },
        select: { userId: true },
        distinct: ["userId"],
      });
      return rows.map((r) => r.userId);
    },
  },
  {
    key: "active_investors",
    labelEn: "Active investor accounts",
    labelAr: "حسابات المستثمرين النشطة",
    resolve: async (prisma) => {
      const rows = await prisma.user.findMany({
        where: {
          role: { name: "investor" },
          status: "active",
          deletedAt: null,
        },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },
  },
  {
    key: "verified_brokers",
    labelEn: "Verified brokers",
    labelAr: "الوسطاء المعتمدون",
    resolve: async (prisma) => {
      const rows = await prisma.brokerProfile.findMany({
        where: { verificationStatus: "approved", isActive: true },
        select: { userId: true },
      });
      return rows.map((r) => r.userId);
    },
  },
];

export function getSegment(key: string): SegmentDefinition | undefined {
  return SEGMENT_REGISTRY.find((s) => s.key === key);
}

export function listSegments(): Array<{ key: string; labelEn: string; labelAr: string }> {
  return SEGMENT_REGISTRY.map(({ key, labelEn, labelAr }) => ({ key, labelEn, labelAr }));
}
