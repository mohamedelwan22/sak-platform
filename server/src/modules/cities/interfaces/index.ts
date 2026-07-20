import type {
  CityData,
  CityWithCountry,
  CreateCityInput,
  UpdateCityInput,
  CityFilters,
  PaginatedCities,
} from "../types/index.js";

export interface ICityRepository {
  findAll(filters: CityFilters): Promise<PaginatedCities>;
  findById(id: string): Promise<CityWithCountry | null>;
  findByNameAndCountry(name: string, countryId: string): Promise<CityData | null>;
  create(data: CreateCityInput): Promise<CityData>;
  update(id: string, data: UpdateCityInput): Promise<CityData>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
