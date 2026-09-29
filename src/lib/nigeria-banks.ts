/**
 * Static fallback list of Nigerian banks, used ONLY when Paystack is not
 * configured (no PAYSTACK_SECRET_KEY) or its /bank endpoint is unreachable.
 *
 * When Paystack IS configured, the live list from `listBanks()` is used instead
 * and this file is ignored. At payout time the authoritative bank code is always
 * re-resolved from the bank NAME via Paystack (`resolveBankCode`), so these codes
 * are for display/selection only and never the sole basis for moving money.
 *
 * Codes below are the standard CBN/NIP institution codes for the major banks.
 */
export const FALLBACK_NIGERIAN_BANKS: { name: string; code: string }[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'FairMoney Microfinance Bank', code: '51318' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Globus Bank', code: '00103' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Microfinance Bank', code: '50211' },
  { name: 'Lotus Bank', code: '303' },
  { name: 'Moniepoint Microfinance Bank', code: '50515' },
  { name: 'OPay (Paycom)', code: '999992' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Parallex Bank', code: '104' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'PremiumTrust Bank', code: '105' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Rubies Microfinance Bank', code: '125' },
  { name: 'Sparkle Microfinance Bank', code: '51310' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'SunTrust Bank', code: '100' },
  { name: 'TAJBank', code: '302' },
  { name: 'Titan Trust Bank', code: '102' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'VFD Microfinance Bank', code: '566' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
].sort((a, b) => a.name.localeCompare(b.name))
