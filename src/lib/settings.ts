import { db } from '@/lib/db'

/**
 * Admin-adjustable platform settings, stored in the `Setting` key/value table.
 * Values are strings in the DB and parsed by typed getters here. Missing keys
 * fall back to the DEFAULTS below, so the app works before any admin has set them.
 */
export const SETTING_KEYS = {
  /** Flat platform delivery fee in naira, added on top of the partner's own fee. */
  DELIVERY_FLAT_FEE: 'DELIVERY_FLAT_FEE',
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.DELIVERY_FLAT_FEE]: '1000',
}

export async function getSetting(key: string): Promise<string> {
  try {
    const row = await db.setting.findUnique({ where: { key } })
    if (row) return row.value
  } catch (e) {
    // Table may not exist yet (before db push) — fall back to defaults quietly.
    console.error('getSetting failed, using default', key, e)
  }
  return DEFAULTS[key] ?? ''
}

export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key)
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export async function setSetting(key: string, value: string, updatedById?: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value, updatedById: updatedById ?? null },
    update: { value, updatedById: updatedById ?? null },
  })
}

/** The platform's flat delivery fee in naira (admin-adjustable, default ₦1000). */
export async function getDeliveryFlatFee(): Promise<number> {
  return getNumberSetting(SETTING_KEYS.DELIVERY_FLAT_FEE, 1000)
}
