import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { KycRepository } from "../repositories/kyc.repository.js";
import type {
  KycSubmissionData,
  KycSubmissionWithUser,
  CreateKycInput,
  ReviewKycInput,
  KycFilters,
  PaginatedKycSubmissions,
} from "../types/index.js";

export class KycService {
  constructor(private readonly kycRepository: KycRepository) {}

  async findAll(filters: KycFilters): Promise<PaginatedKycSubmissions> {
    return this.kycRepository.findAll(filters);
  }

  async findById(id: string): Promise<KycSubmissionWithUser> {
    const submission = await this.kycRepository.findById(id);
    if (!submission) throw new NotFoundError("KYC submission not found");
    return submission;
  }

  async findByUserId(userId: string): Promise<KycSubmissionData | null> {
    return this.kycRepository.findByUserId(userId);
  }

  async create(input: CreateKycInput): Promise<KycSubmissionData> {
    return this.kycRepository.create(input);
  }

  async approve(id: string, reviewerId: string): Promise<KycSubmissionData> {
    const existing = await this.kycRepository.findById(id);
    if (!existing) throw new NotFoundError("KYC submission not found");
    if (existing.status === "approved") throw new ConflictError("KYC submission already approved");

    return this.kycRepository.review(id, {
      status: "approved",
      reviewedBy: reviewerId,
    });
  }

  async reject(id: string, input: ReviewKycInput): Promise<KycSubmissionData> {
    const existing = await this.kycRepository.findById(id);
    if (!existing) throw new NotFoundError("KYC submission not found");
    if (existing.status === "rejected") throw new ConflictError("KYC submission already rejected");

    return this.kycRepository.review(id, {
      status: "rejected",
      adminNotes: input.adminNotes,
      reviewedBy: input.reviewedBy,
    });
  }

  async count(): Promise<number> {
    return this.kycRepository.count();
  }
}
