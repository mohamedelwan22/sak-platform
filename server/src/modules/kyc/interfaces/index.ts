import type {
  KycSubmissionData,
  KycSubmissionWithUser,
  CreateKycInput,
  ReviewKycInput,
  KycFilters,
  PaginatedKycSubmissions,
} from "../types/index.js";

export interface IKycRepository {
  findAll(filters: KycFilters): Promise<PaginatedKycSubmissions>;
  findById(id: string): Promise<KycSubmissionWithUser | null>;
  findByUserId(userId: string): Promise<KycSubmissionData | null>;
  create(data: CreateKycInput): Promise<KycSubmissionData>;
  review(id: string, data: ReviewKycInput): Promise<KycSubmissionData>;
  count(): Promise<number>;
}
