import type {
  CertificateData,
  CertificateFilters,
  CertificateWithHolding,
  CreateCertificateInput,
  PaginatedCertificates,
} from "../types/index.js";

export interface ICertificateRepository {
  findAll(filters: CertificateFilters): Promise<PaginatedCertificates>;
  findById(id: string): Promise<CertificateWithHolding | null>;
  findByUserIdAndHoldingId(userId: string, holdingId: string): Promise<CertificateData | null>;
  create(data: CreateCertificateInput): Promise<CertificateData>;
  count(): Promise<number>;
}
