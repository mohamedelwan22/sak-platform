import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { CityRepository } from "../repositories/cities.repository.js";
import type {
  CityData,
  CityWithCountry,
  CreateCityInput,
  UpdateCityInput,
  CityFilters,
  PaginatedCities,
} from "../types/index.js";
import { CountryService } from "../../countries/services/countries.service.js";
import { CountryRepository } from "../../countries/repositories/countries.repository.js";

const countryService = new CountryService(new CountryRepository());

export class CityService {
  constructor(private readonly cityRepository: CityRepository) {}

  async findAll(filters: CityFilters): Promise<PaginatedCities> {
    return this.cityRepository.findAll(filters);
  }

  async findById(id: string): Promise<CityWithCountry> {
    const city = await this.cityRepository.findById(id);
    if (!city) throw new NotFoundError("City not found");
    return city;
  }

  async create(input: CreateCityInput): Promise<CityData> {
    await countryService.findById(input.countryId);

    const existing = await this.cityRepository.findByNameAndCountry(input.name, input.countryId);
    if (existing) throw new ConflictError("A city with this name already exists in this country");

    return this.cityRepository.create(input);
  }

  async update(id: string, input: UpdateCityInput): Promise<CityData> {
    const existing = await this.cityRepository.findById(id);
    if (!existing) throw new NotFoundError("City not found");

    if (input.countryId) {
      await countryService.findById(input.countryId);
    }

    if (input.name && (input.name !== existing.name || input.countryId !== existing.countryId)) {
      const countryId = input.countryId ?? existing.countryId;
      const duplicate = await this.cityRepository.findByNameAndCountry(input.name, countryId);
      if (duplicate)
        throw new ConflictError("A city with this name already exists in this country");
    }

    return this.cityRepository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.cityRepository.findById(id);
    if (!existing) throw new NotFoundError("City not found");
    await this.cityRepository.delete(id);
  }

  async count(): Promise<number> {
    return this.cityRepository.count();
  }
}
