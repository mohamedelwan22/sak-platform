import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { notifyAdminsOfNewBrokerApplication } from "../../notifications/services/notification-preference.service.js";

/** Application states an admin may still act on (verify / reject / re-review). */
const APPLICATION_STATES = ["pending", "under_review", "rejected"];

export class BrokersService {
  /**
   * Create broker profile for a user
   */
  async createBrokerProfile(
    userId: string,
    data: {
      displayName: string;
      company?: string;
      licenseNumber?: string;
      phone?: string;
      bio?: string;
    },
  ): Promise<any> {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if broker profile already exists
    const existing = await prisma.brokerProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ValidationError("Broker profile already exists for this user");
    }

    const broker = await prisma.brokerProfile.create({
      data: {
        userId,
        displayName: data.displayName,
        company: data.company,
        licenseNumber: data.licenseNumber,
        phone: data.phone,
        bio: data.bio,
        verificationStatus: "pending",
      },
    });

    try {
      await notifyAdminsOfNewBrokerApplication(prisma, {
        id: broker.id,
        displayName: broker.displayName,
      });
    } catch {
      // Admin notification failure must not break application submission.
    }

    return this.formatBroker(broker);
  }

  /**
   * Get broker profile
   */
  async getBrokerProfile(brokerId: string): Promise<any> {
    const broker = await prisma.brokerProfile.findUnique({
      where: { id: brokerId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        documents: true,
      },
    });

    if (!broker) {
      throw new NotFoundError("Broker not found");
    }

    return {
      ...this.formatBroker(broker),
      user: broker.user,
      documents: broker.documents,
    };
  }

  /**
   * Update broker profile
   */
  async updateBrokerProfile(brokerId: string, data: any): Promise<any> {
    const broker = await prisma.brokerProfile.findUnique({
      where: { id: brokerId },
    });

    if (!broker) {
      throw new NotFoundError("Broker not found");
    }

    const updated = await prisma.brokerProfile.update({
      where: { id: brokerId },
      data,
    });

    return this.formatBroker(updated);
  }

  /**
   * Verify broker profile (admin action)
   */
  async verifyBroker(
    brokerId: string,
    status: "verified" | "rejected",
    approverId: string,
    rejectionReason?: string,
  ): Promise<any> {
    const [broker, approver] = await Promise.all([
      prisma.brokerProfile.findUnique({ where: { id: brokerId } }),
      prisma.user.findUnique({ where: { id: approverId } }),
    ]);

    if (!broker) throw new NotFoundError("Broker not found");
    if (!approver) throw new NotFoundError("Approver not found");

    // Lifecycle guard: only application states may be verified/rejected.
    if (!APPLICATION_STATES.includes(broker.verificationStatus)) {
      throw new ValidationError(
        `Cannot update verification of a ${broker.verificationStatus} broker`,
      );
    }

    const updated = await prisma.brokerProfile.update({
      where: { id: brokerId },
      data: {
        verificationStatus: status,
        verifiedAt: status === "verified" ? new Date() : null,
        verifiedBy: approverId,
        isActive: status === "verified" ? true : broker.isActive,
        rejectionReason: status === "rejected" ? (rejectionReason ?? null) : null,
      },
    });

    return this.formatBroker(updated);
  }

  /**
   * Get all brokers with filtering
   */
  async getBrokers(filters: {
    verificationStatus?: string;
    statuses?: string[];
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; pagination: any }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    const where: any = {};
    if (filters.statuses?.length) {
      where.verificationStatus = { in: filters.statuses };
    } else if (filters.verificationStatus) {
      where.verificationStatus = filters.verificationStatus;
    }
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      const q = String(filters.search);
      where.OR = [
        { displayName: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { phone: { contains: q, mode: "insensitive" } } },
        { user: { firstName: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [total, brokers] = await Promise.all([
      prisma.brokerProfile.count({ where }),
      prisma.brokerProfile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              status: true,
              createdAt: true,
            },
          },
          _count: { select: { documents: true } },
        },
      }),
    ]);

    return {
      data: brokers.map((b) => ({
        ...this.formatBroker(b),
        user: b.user,
        documentsCount: b._count?.documents ?? 0,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get broker's clients
   */
  async getBrokerClients(brokerId: string, filters: any = {}): Promise<any[]> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    const clients = await prisma.brokerClient.findMany({
      where: { brokerId },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });

    return clients.map((c) => c.client);
  }

  private formatBroker(broker: any) {
    return {
      id: broker.id,
      userId: broker.userId,
      displayName: broker.displayName,
      company: broker.company,
      licenseNumber: broker.licenseNumber,
      phone: broker.phone,
      bio: broker.bio,
      profileImageUrl: broker.profileImageUrl,
      verificationStatus: broker.verificationStatus,
      verifiedAt: broker.verifiedAt,
      verifiedBy: broker.verifiedBy,
      rejectionReason: broker.rejectionReason,
      isActive: broker.isActive,
      createdAt: broker.createdAt,
    };
  }
}

export const brokersService = new BrokersService();
