export interface CityData {
  id: string;
  countryId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CityWithCountry extends CityData {
  country: {
    id: string;
    name: string;
    code: string;
  };
}

export interface CreateCityInput {
  countryId: string;
  name: string;
  isActive?: boolean;
}

export interface UpdateCityInput {
  countryId?: string;
  name?: string;
  isActive?: boolean;
}

export interface CityFilters {
  countryId?: string;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedCities {
  data: CityWithCountry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
