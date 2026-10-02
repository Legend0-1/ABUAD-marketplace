'use client'

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { CountryInfo } from '@/lib/institutions'

/**
 * Country picker for registration. The list of available countries is
 * admin-controlled (fetched from /api/countries) and passed in as `countries`.
 * Value/onChange are the plain ISO alpha-2 country code string, so it drops into
 * existing form state directly. No "Other" option: the country list is curated
 * by the admin, so a student can only pick a country the platform operates in.
 */
export function CountrySelect({
  value,
  onChange,
  countries,
  id,
  placeholder = 'Select your country',
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  countries: CountryInfo[]
  id?: string
  placeholder?: string
  disabled?: boolean
}) {
  const loading = countries.length === 0
  return (
    <Select value={value || ''} onValueChange={onChange} disabled={disabled || loading}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={loading ? 'Loading countries…' : placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {countries.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.flag} {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
