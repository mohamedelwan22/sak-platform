export interface CountryData {
  id: string;
  name: string;
  code: string;
  iso2: string | null;
  iso3: string | null;
  phoneCode: string | null;
  currency: string | null;
  currencyCode: string | null;
  nationality: string | null;
  flag: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CountryWithCities extends CountryData {
  _count: { cities: number };
}

export interface CreateCountryInput {
  name: string;
  code: string;
  iso2?: string | null;
  iso3?: string | null;
  phoneCode?: string | null;
  currency?: string | null;
  currencyCode?: string | null;
  nationality?: string | null;
  flag?: string | null;
  status?: string;
}

export interface UpdateCountryInput {
  name?: string;
  code?: string;
  iso2?: string | null;
  iso3?: string | null;
  phoneCode?: string | null;
  currency?: string | null;
  currencyCode?: string | null;
  nationality?: string | null;
  flag?: string | null;
  status?: string;
}

export interface CountryFilters {
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedCountries {
  data: CountryWithCities[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
