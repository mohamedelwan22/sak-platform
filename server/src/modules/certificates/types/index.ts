export interface CertificateData {
  id: string;
  userId: string;
  holdingId: string;
  filePath: string;
  generatedAt: Date;
  createdAt: Date;
}

export interface CertificateWithHolding extends CertificateData {
  holding: {
    id: string;
    sakOwned: number;
    purchasePricePerSakUsd: number;
    purchaseDate: Date;
    maturityDate: Date;
    land: {
      id: string;
      titleEn: string;
      titleAr: string;
      country: string;
      city: string;
      assetType: string;
    };
  };
}

export interface CreateCertificateInput {
  userId: string;
  holdingId: string;
  filePath: string;
}

export interface CertificateFilters {
  userId?: string;
  holdingId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedCertificates {
  data: CertificateWithHolding[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
