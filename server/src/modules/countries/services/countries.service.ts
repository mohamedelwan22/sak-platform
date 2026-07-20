import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { CountryRepository } from "../repositories/countries.repository.js";
import type {
  CountryData,
  CountryWithCities,
  CreateCountryInput,
  UpdateCountryInput,
  CountryFilters,
  PaginatedCountries,
} from "../types/index.js";

export class CountryService {
  constructor(private readonly countryRepository: CountryRepository) {}

  async findAll(filters: CountryFilters): Promise<PaginatedCountries> {
    return this.countryRepository.findAll(filters);
  }

  async findById(id: string): Promise<CountryWithCities> {
    const country = await this.countryRepository.findById(id);
    if (!country) throw new NotFoundError("Country not found");
    return country;
  }

  async create(input: CreateCountryInput): Promise<CountryData> {
    const existingName = await this.countryRepository.findByName(input.name);
    if (existingName) throw new ConflictError("A country with this name already exists");

    const existingCode = await this.countryRepository.findByCode(input.code);
    if (existingCode) throw new ConflictError("A country with this code already exists");

    return this.countryRepository.create(input);
  }

  async update(id: string, input: UpdateCountryInput): Promise<CountryData> {
    const existing = await this.countryRepository.findById(id);
    if (!existing) throw new NotFoundError("Country not found");

    if (input.name && input.name !== existing.name) {
      const nameTaken = await this.countryRepository.findByName(input.name);
      if (nameTaken) throw new ConflictError("A country with this name already exists");
    }

    if (input.code && input.code !== existing.code) {
      const codeTaken = await this.countryRepository.findByCode(input.code);
      if (codeTaken) throw new ConflictError("A country with this code already exists");
    }

    return this.countryRepository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.countryRepository.findById(id);
    if (!existing) throw new NotFoundError("Country not found");

    if (existing._count.cities > 0) {
      throw new ConflictError(
        "Cannot delete country with existing cities. Remove all cities first.",
      );
    }

    await this.countryRepository.delete(id);
  }

  async count(): Promise<number> {
    return this.countryRepository.count();
  }
}
