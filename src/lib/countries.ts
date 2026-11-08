/**
 * Centralized country calling code dataset for SAK100.
 *
 * All country data is sourced from the `country-state-city` library which
 * provides ISO 3166-1 alpha-2 country codes, international calling codes,
 * flags, and localized names. This is the single source of truth for all
 * phone-related country selection across the platform.
 *
 * No hardcoded country lists should exist elsewhere in the application.
 */

import Country from "country-state-city/lib/country";
import type { ICountry } from "country-state-city/lib/interface";

/**
 * A country entry with calling code information for phone selection.
 */
export interface CountryCallingCode {
  /** ISO 3166-1 alpha-2 country code (e.g., "EG", "SA", "US") */
  isoCode: string;
  /** English country name */
  name: string;
  /** Arabic country name where available */
  nameAr: string;
  /** International calling code with + prefix (e.g., "+20", "+966", "+1") */
  callingCode: string;
  /** Country flag emoji */
  flag: string;
  /** ISO 3166-1 alpha-3 code */
  iso3: string | null;
}

/**
 * Arabic country names for countries supported by the library.
 * Falls back to English name if no Arabic translation is available.
 */
const COUNTRY_NAMES_AR: Record<string, string> = {
  Egypt: "مصر",
  "Saudi Arabia": "المملكة العربية السعودية",
  "United Arab Emirates": "الإمارات العربية المتحدة",
  Kuwait: "الكويت",
  Qatar: "قطر",
  Bahrain: "البحرين",
  Oman: "عُمان",
  Jordan: "الأردن",
  Lebanon: "لبنان",
  Iraq: "العراق",
  "United States": "الولايات المتحدة",
  "United Kingdom": "المملكة المتحدة",
  Pakistan: "باكستان",
  India: "الهند",
  Iran: "إيران",
  Turkey: "تركيا",
  Germany: "ألمانيا",
  France: "فرنسا",
  Italy: "إيطاليا",
  Spain: "إسبانيا",
  "South Africa": "جنوب أفريقيا",
  Nigeria: "نيجيريا",
  Kenya: "كينيا",
  Ghana: "غانا",
  Morocco: "المغرب",
  Tunisia: "تونس",
  Algeria: "الجزائر",
  Sudan: "السودان",
  Canada: "كندا",
  Australia: "أستراليا",
  "New Zealand": "نيوزيلندا",
  Brazil: "البرازيل",
  Argentina: "الأرجنتين",
  Mexico: "المكسيك",
  "South Korea": "كوريا الجنوبية",
  China: "الصين",
  Japan: "اليابان",
  Malaysia: "ماليزيا",
  Indonesia: "إندونيسيا",
  Thailand: "تايلاند",
  Vietnam: "فيتنام",
  Philippines: "الفلبين",
  Singapore: "سنغافورة",
  Switzerland: "سويسرا",
  Austria: "النمسا",
  Netherlands: "هولندا",
  Belgium: "بلجيكا",
  Sweden: "السويد",
  Norway: "النرويج",
  Denmark: "الدنمارك",
  Finland: "فنلندا",
  Poland: "بولندا",
  Russia: "روسيا",
  Ukraine: "أوكرانيا",
  "Czech Republic": "جمهورية التشيك",
  Greece: "اليونان",
  Portugal: "البرتغال",
  Ireland: "أيرلندا",
  Hungary: "المجر",
  Romania: "رومانيا",
  Bulgaria: "بلغاريا",
  Croatia: "كرواتيا",
  Serbia: "صربيا",
  "Bosnia and Herzegovina": "البوسنة والهرسك",
  Albania: "ألبانيا",
  "North Macedonia": "مacedonia الشمالية",
  Slovenia: "سلوفينيا",
  Slovakia: "سلوفاكيا",
  Lithuania: "ليتوانيا",
  Latvia: "لاتفيا",
  Estonia: "إستونيا",
  Iceland: "أيسلندا",
  Luxembourg: "لوكسمبورغ",
  Malta: "مالطا",
  Cyprus: "قبرص",
  Georgia: "جورجيا",
  Armenia: "أرمينيا",
  Azerbaijan: "أذربيجان",
  Kazakhstan: "كازاخستان",
  Uzbekistan: "أوزبكستان",
  Israel: "إسرائيل",
  Palestine: "فلسطين",
  Yemen: "اليمن",
  "Syrian Arab Republic": "سوريا",
  "Sri Lanka": "سريلانكا",
  Nepal: "نيبال",
  Bangladesh: "بنغلاديش",
  Myanmar: "ميانمار",
  Cambodia: "كمبوديا",
  Laos: "لاوس",
  Mongolia: "منغوليا",
  "Papua New Guinea": "بابوا غينيا الجديدة",
  Fiji: "فيجي",
  "New Caledonia": "كاليدونيا الجديدة",
  "French Polynesia": "بولينيزيا الفرنسية",
  Samoa: "ساموا",
  Tonga: "تونغا",
  Vanuatu: "فانواتو",
  "Solomon Islands": "جزر سليمان",
  Kiribati: "كيريباتي",
  Tuvalu: "توفالو",
  Nauru: "ناورو",
  Palau: "بالاو",
  "Marshall Islands": "جزر مارشال",
  Micronesia: "ميكرونيزيا",
  "Cook Islands": "جزر كوك",
  Niue: "نيوي",
  Tokelau: "توكيلاو",
  "Wallis and Futuna": "واليس وفوتونا",
  "French Guiana": "غويانا الفرنسية",
  Guadeloupe: "غواديلوب",
  Martinique: "مارتينيك",
  "Saint Barthélemy": "سانت بارتيليمي",
  "Saint Martin": "سانت مارتن",
  "Saint Pierre and Miquelon": "سان بيير وميكلون",
  Curaçao: "كوراكاو",
  Aruba: "أروبا",
  "Sint Maarten": "سانت مارتن",
  Bonaire: "بونير",
  Saba: "سابا",
  "Saint Eustatius": "يوستاتيوس",
  Greenland: "غرينلاند",
  "Faroe Islands": "جزر فارو",
  Aland: "ألاند",
  Jersey: "جيرسي",
  Guernsey: "غرنزي",
  "Isle of Man": "جزيرة مان",
  Gibraltar: "جبل طارق",
  "Channel Islands": "جزر القنال",
  "British Virgin Islands": "جزر العذراء البريطانية",
  "US Virgin Islands": "جزر العذراء الأمريكية",
  "Cayman Islands": "جزر كايمان",
  Bermuda: "برمودا",
  Anguilla: "أنغويلا",
  Montserrat: "مونتسرات",
  "Turks and Caicos Islands": "جزر ترك وكايكوس",
  "Falkland Islands": "جزر فوكلاند",
  "South Georgia and the South Sandwich Islands": "جورجيا الجنوبية وجزر ساندويتش الجنوبية",
  "Saint Helena": "سانت هيلانة",
  "Ascension Island": "جزيرة أسينشين",
  "Tristan da Cunha": "تريستان دا كونيا",
};

/**
 * Normalize a raw `country-state-city` phonecode into a pure E.164 country
 * calling code ("+1", "+20", ...).
 *
 * The upstream data is not clean — it contains:
 *   "+1-809 and 1-829"  (Dominican Republic, alternates of area codes)
 *   "+1-684"            (American Samoa, NANP area suffix baked in)
 *   "1721"              (Sint Maarten, NANP area suffix without "+1")
 *   "+358-18"           (Aland, national area embedded)
 *   "+44-1481"          (Guernsey, national area embedded)
 * E.164 country calling codes never contain dashes, spaces, or area codes.
 * We collapse all of these to their base country code; NANP area codes are
 * part of the national number, not of the country calling code.
 */
export function normalizeCallingCode(
  phonecode: string | null | undefined,
): string | null {
  if (!phonecode) return null;
  // Drop alternate codes ("1-809 and 1-829" -> "1-809")
  const firstToken = String(phonecode).trim().split(/[\s,]+/)[0];
  // Drop embedded national area codes ("+1-809" -> "+1", "+44-1481" -> "+44")
  const head = firstToken.split("-")[0];
  const digits = head.replace(/\D/g, "");
  if (!digits) return null;
  // A 4-digit code starting with "1" is a NANP area code without its "1"
  // separated (Sint Maarten "1721") — the E.164 country code is "+1".
  if (/^1\d{3}$/.test(digits)) return "+1";
  return `+${digits}`;
}

/**
 * Build the complete country calling code dataset from country-state-city.
 * Returns all ~250 countries/territories with calling codes.
 */
export function getAllCountriesWithCallingCodes(): CountryCallingCode[] {
  const allCountries = Country.getAllCountries();

  return allCountries
    .map((c): CountryCallingCode | null => {
      const callingCode = normalizeCallingCode(c.phonecode);

      // Skip countries without a calling code
      if (!callingCode) return null;

      return {
        isoCode: c.isoCode,
        name: c.name,
        nameAr: COUNTRY_NAMES_AR[c.name] || c.name,
        callingCode,
        flag: c.flag || "🌐",
        iso3: (c as unknown as { iso3?: string | null }).iso3 ?? null,
      };
    })
    .filter((c): c is CountryCallingCode => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Look up a country by ISO alpha-2 code.
 */
export function getCountryByIsoCode(isoCode: string): CountryCallingCode | undefined {
  return getAllCountriesWithCallingCodes().find((c) => c.isoCode === isoCode);
}

/**
 * Look up countries by calling code (supports shared calling codes).
 * Multiple countries can share the same calling code (e.g., +1 for US/Canada).
 */
export function getCountriesByCallingCode(callingCode: string): CountryCallingCode[] {
  const normalized = callingCode.startsWith("+") ? callingCode : `+${callingCode}`;
  return getAllCountriesWithCallingCodes().filter((c) => c.callingCode === normalized);
}

/**
 * Search countries by name (English or Arabic), ISO code, or calling code.
 * A query that looks like a dialing code ("+1", "20", "966") matches calling
 * codes by prefix so every country sharing the code (all NANP for "+1") is
 * returned. Other queries match names/ISO codes as substrings.
 */
export function searchCountries(query: string): CountryCallingCode[] {
  const q = query.trim().toLowerCase();
  if (!q) return getAllCountriesWithCallingCodes();

  const all = getAllCountriesWithCallingCodes();
  const qDigits = q.replace(/\D/g, "");
  const isDialCodeQuery = /^\+?\d+$/.test(q);

  if (isDialCodeQuery) {
    return all.filter((c) => c.callingCode.replace(/\D/g, "").startsWith(qDigits));
  }

  return all.filter((c) =>
    c.name.toLowerCase().includes(q) ||
    c.nameAr.toLowerCase().includes(q) ||
    c.isoCode.toLowerCase().includes(q) ||
    c.callingCode.toLowerCase().includes(q),
  );
}

/**
 * Default country code (Egypt — the platform's primary market).
 */
export const DEFAULT_COUNTRY_ISO_CODE = "EG";

/**
 * Get the default country calling code.
 */
export const DEFAULT_CALLING_CODE = "+20";
