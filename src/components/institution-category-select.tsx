'use client'

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getInstitutionCategories, OTHER_CATEGORY } from '@/lib/institutions'

/**
 * Institution-category picker, dependent on the chosen country. Lists the
 * category labels for that country (e.g. Federal / State / Private University,
 * Polytechnic, College of Education for Nigeria — different systems elsewhere),
 * plus an "Other / Not listed" sentinel for anything that doesn't fit. The chosen
 * category then narrows the Institution dropdown, so neither list is ever huge.
 *
 * Plain string value/onChange so it drops into existing form state. The parent
 * should reset this value (and the institution) to '' when the country changes.
 */
export function InstitutionCategorySelect({
  countryCode,
  value,
  onChange,
  id,
  placeholder = 'Select institution type',
}: {
  countryCode: string
  value: string
  onChange: (v: string) => void
  id?: string
  placeholder?: string
}) {
  const categories = getInstitutionCategories(countryCode)
  const hasCountry = !!countryCode && categories.length > 0

  return (
    <Select value={value || ''} onValueChange={onChange} disabled={!hasCountry}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={hasCountry ? placeholder : 'Select your country first'} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {categories.map((c) => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
        <SelectItem value={OTHER_CATEGORY}>{OTHER_CATEGORY}</SelectItem>
      </SelectContent>
    </Select>
  )
}
