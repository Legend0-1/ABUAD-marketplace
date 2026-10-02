'use client'

import { useState } from 'react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  getInstitutionsInCategory, OTHER_INSTITUTION, OTHER_CATEGORY,
} from '@/lib/institutions'

/**
 * Institution picker, dependent on the chosen country AND institution category.
 * Only the institutions in the selected category are listed, so the dropdown
 * stays short. A trailing "Other (not listed)" reveals a free-text box for a
 * school we don't have yet. If the category itself is "Other / Not listed", we
 * skip the dropdown entirely and show the free-text box straight away.
 *
 * Plain string value/onChange so it drops into existing form state unchanged.
 *
 * NOTE: the parent should pass key={countryCode + '|' + category} and reset
 * `value` to '' whenever the country or category changes, so this component
 * re-initialises cleanly (including its "Other" mode) for the new selection.
 */
export function InstitutionSelect({
  countryCode,
  category,
  value,
  onChange,
  id,
  placeholder = 'Select your institution',
}: {
  countryCode: string
  category: string
  value: string
  onChange: (v: string) => void
  id?: string
  placeholder?: string
}) {
  const isOtherCategory = category === OTHER_CATEGORY
  const institutions = getInstitutionsInCategory(countryCode, category)
  const hasList = institutions.length > 0

  // Initialise "Other" mode once: either the category is the free-text sentinel,
  // or we were handed a value we don't recognise within this category.
  const [otherMode, setOtherMode] = useState(
    () => isOtherCategory || (!!value && hasList && !institutions.includes(value.trim())),
  )

  // Free-text only: the "Other" category has no list to pick from.
  if (isOtherCategory) {
    return (
      <Input
        id={id}
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your institution"
        maxLength={120}
      />
    )
  }

  const hasCategory = !!category && hasList
  const selectValue = otherMode
    ? OTHER_INSTITUTION
    : (institutions.includes(value.trim()) ? value : '')

  const handleSelect = (v: string) => {
    if (v === OTHER_INSTITUTION) {
      setOtherMode(true)
      onChange('')
    } else {
      setOtherMode(false)
      onChange(v)
    }
  }

  return (
    <div className="space-y-2">
      <Select value={selectValue} onValueChange={handleSelect} disabled={!hasCategory}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={hasCategory ? placeholder : 'Select institution type first'} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {institutions.map((inst) => (
            <SelectItem key={inst} value={inst}>{inst}</SelectItem>
          ))}
          <SelectItem value={OTHER_INSTITUTION}>{OTHER_INSTITUTION}</SelectItem>
        </SelectContent>
      </Select>
      {otherMode && hasCategory && (
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your institution"
          maxLength={120}
        />
      )}
    </div>
  )
}
