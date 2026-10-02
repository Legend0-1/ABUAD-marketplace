// Currency layer for UNI MART.
//
// IMPORTANT: every monetary value in the database (order.totalAmount,
// sellerPayout, serviceCharge, product.price, storefront.totalSales, …) is
// stored in Nigerian Naira (NGN). NGN is the real transaction currency —
// buyers pay in NGN via Paystack and sellers are paid out to Nigerian banks.
//
// This module lets each user *view* those NGN figures in their own local
// currency as the platform expands to other countries. It does NOT change how
// money is charged or paid out — it is presentation only. Conversion happens
// at exactly one place (convertFromNgn) so that when a live FX source is wired
// in later, this is the only thing that changes.
//
// Today FX_RATES is a small static table of approximate rates. To go live with
// real rates, replace getRate() with a cached fetch from an FX provider
// (e.g. exchangerate.host / openexchangerates) keyed on the same codes.

export type CurrencyCode =
  | 'NGN' | 'USD' | 'GBP' | 'EUR' | 'GHS' | 'KES' | 'ZAR' | 'CAD' | 'GHc'

export type CurrencyInfo = {
  code: string
  name: string
  symbol: string
  locale: string // BCP-47 locale used for Intl formatting
  // Approximate number of NGN in one unit of this currency. converted =
  // amountNGN / nairaPerUnit. NGN itself is 1. These are deliberately rough
  // and static; see note above about wiring a live source.
  nairaPerUnit: number
}

// Order roughly by relevance to the platform's expansion path.
export const CURRENCIES: Record<string, CurrencyInfo> = {
  NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG', nairaPerUnit: 1 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', nairaPerUnit: 1550 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB', nairaPerUnit: 1980 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', locale: 'en-IE', nairaPerUnit: 1690 },
  GHS: { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', locale: 'en-GH', nairaPerUnit: 103 },
  KES: { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE', nairaPerUnit: 12 },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA', nairaPerUnit: 86 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA', nairaPerUnit: 1130 },
}

export const DEFAULT_CURRENCY: CurrencyCode = 'NGN'

/** Normalize any input (null, unknown code, wrong case) to a supported currency. */
export function normalizeCurrency(code: string | null | undefined): string {
  if (!code) return DEFAULT_CURRENCY
  const upper = String(code).toUpperCase()
  return CURRENCIES[upper] ? upper : DEFAULT_CURRENCY
}

export function getCurrencyInfo(code: string | null | undefined): CurrencyInfo {
  return CURRENCIES[normalizeCurrency(code)]
}

function getRate(code: string): number {
  return getCurrencyInfo(code).nairaPerUnit
}

/** Convert an amount stored in NGN into the target currency's numeric value. */
export function convertFromNgn(amountNgn: number, code: string | null | undefined): number {
  const n = Number(amountNgn) || 0
  return n / getRate(code)
}

/**
 * Format an NGN-denominated amount for display in the user's chosen currency.
 * Converts first, then formats with the currency's locale + symbol.
 */
export function formatMoney(
  amountNgn: number,
  code: string | null | undefined,
  opts: { decimals?: number } = {},
): string {
  const info = getCurrencyInfo(code)
  const value = convertFromNgn(amountNgn, info.code)
  // Naira is conventionally shown without decimals here; others get 2 unless
  // overridden. Large NGN figures stay readable this way.
  const decimals = opts.decimals ?? (info.code === 'NGN' ? 0 : 2)
  try {
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  } catch {
    // Fallback if the runtime doesn't know the currency/locale.
    return `${info.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  }
}

/** Compact form for chart axes / tight spaces, e.g. ₦1.2M, $3.4K. */
export function formatMoneyCompact(amountNgn: number, code: string | null | undefined): string {
  const info = getCurrencyInfo(code)
  const value = convertFromNgn(amountNgn, info.code)
  try {
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.code,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return `${info.symbol}${Math.round(value).toLocaleString()}`
  }
}
