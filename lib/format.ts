"use client";

// Currency + language helpers.
//
// Prices in menu.json are stored as USD numbers (the source of truth).
// The user-facing display is converted via the static `rate` below.
// Rates are intentionally hardcoded — for a live restaurant you should
// refresh them periodically from a free FX feed (e.g. exchangerate.host).
// They're declared here so a non-developer can update the numbers without
// touching any other file.

export type CurrencyCode = "USD" | "INR" | "EUR" | "AED" | "SAR" | "QAR";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rate: number;     // multiplier vs base USD
  decimals: number; // how many decimal places to show
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "USD", symbol: "$",   label: "USD", rate: 1,     decimals: 2 },
  { code: "INR", symbol: "₹",   label: "INR", rate: 84,    decimals: 0 },
  { code: "EUR", symbol: "€",   label: "EUR", rate: 0.92,  decimals: 2 },
  { code: "AED", symbol: "AED", label: "AED", rate: 3.67,  decimals: 2 },
  { code: "SAR", symbol: "SAR", label: "SAR", rate: 3.75,  decimals: 2 },
  { code: "QAR", symbol: "QAR", label: "QAR", rate: 3.64,  decimals: 2 },
];

export type LanguageCode = "en" | "de" | "fr" | "ar" | "hi" | "ko";

export interface LanguageMeta {
  code: LanguageCode;
  short: string;
  label: string;
  flag: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", short: "EN", label: "English", flag: "🇬🇧" },
  { code: "de", short: "DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", short: "FR", label: "Français", flag: "🇫🇷" },
  { code: "ar", short: "AR", label: "العربية", flag: "🇸🇦" },
  { code: "hi", short: "HI", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ko", short: "KO", label: "한국어", flag: "🇰🇷" },
];

const CURRENCY_KEY = "lfh_currency";
const LANGUAGE_KEY = "lfh_language";

export const getCurrency = (): CurrencyMeta => {
  if (typeof localStorage === "undefined") return CURRENCIES[0];
  const code = (localStorage.getItem(CURRENCY_KEY) || "USD") as CurrencyCode;
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
};

export const setCurrency = (code: CurrencyCode) => {
  try {
    localStorage.setItem(CURRENCY_KEY, code);
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("lfh:currency-changed"));
  }
};

export const getLanguage = (): LanguageMeta => {
  if (typeof localStorage === "undefined") return LANGUAGES[0];
  const code = (localStorage.getItem(LANGUAGE_KEY) || "en") as LanguageCode;
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
};

export const setLanguage = (code: LanguageCode) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, code);
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("lfh:language-changed"));
  }
};

// formatPrice converts a USD price to the user's chosen currency and
// returns a display string like "₹1,091" or "AED 47.67".
export const formatPrice = (price: string | number, currency?: CurrencyMeta): string => {
  const cur = currency || getCurrency();
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (!Number.isFinite(n)) return `${cur.symbol}0`;
  const converted = n * cur.rate;
  const formatted = converted.toLocaleString("en-US", {
    minimumFractionDigits: cur.decimals,
    maximumFractionDigits: cur.decimals,
  });
  const tight = cur.symbol.length === 1;
  return tight ? `${cur.symbol}${formatted}` : `${cur.symbol} ${formatted}`;
};
