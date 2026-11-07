/**
 * Geographical data helpers backed by the `country-state-city` library.
 *
 * This module is completely independent of the application's PostgreSQL
 * geographical records (Country/City tables). All country, state, and city
 * data comes from the locally bundled `country-state-city` dataset.
 *
 * Customer locations are persisted using stable ISO codes and text names
 * directly on the user profile (countryCode, stateCode, cityName columns),
 * not UUID foreign keys. This means any country in the library can be
 * selected without requiring an administrator to pre-register it in the
 * database.
 */

import Country from "country-state-city/lib/country";
import State from "country-state-city/lib/state";
import City from "country-state-city/lib/city";
import type { ICountry, IState, ICity } from "country-state-city/lib/interface";

/**
 * All countries from the geographical library. No database filtering.
 */
export function getAllCountries(): ICountry[] {
  return Country.getAllCountries();
}

/**
 * Get states/governorates for a country ISO code from the library.
 * Returns an empty array if the country has no states in the dataset.
 */
export function getStatesForCountry(countryIsoCode: string): IState[] {
  return State.getStatesOfCountry(countryIsoCode);
}

/**
 * Get cities for a state/governorate from the library.
 */
export function getCitiesForState(
  countryIsoCode: string,
  stateIsoCode: string,
): ICity[] {
  return City.getCitiesOfState(countryIsoCode, stateIsoCode);
}

/**
 * Look up a state object by country ISO code and state name.
 * Returns undefined if not found.
 */
export function findStateByName(
  countryIsoCode: string,
  stateName: string,
): IState | undefined {
  return State.getStatesOfCountry(countryIsoCode).find((s) => s.name === stateName);
}
