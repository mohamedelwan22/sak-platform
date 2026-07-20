import type {
  CountryData,
  CountryWithCities,
  CreateCountryInput,
  UpdateCountryInput,
  CountryFilters,
  PaginatedCountries,
} from "../types/index.js";

export interface ICountryRepository {
  findAll(filters: CountryFilters): Promise<PaginatedCountries>;
  findById(id: string): Promise<CountryWithCities | null>;
  findByName(name: string): Promise<CountryData | null>;
  findByCode(code: string): Promise<CountryData | null>;
  create(data: CreateCountryInput): Promise<CountryData>;
  update(id: string, data: UpdateCountryInput): Promise<CountryData>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
