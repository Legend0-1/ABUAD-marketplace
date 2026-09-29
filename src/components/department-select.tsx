'use client'

import { useState } from 'react'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  ABUAD_DEPARTMENT_GROUPS, OTHER_DEPARTMENT, isKnownDepartment,
} from '@/lib/departments'

/**
 * A department picker backed by the ABUAD programme list, grouped by college.
 * If the current value isn't a known programme (e.g. an older free-typed value,
 * or one not in our list), it falls back to an "Other" mode with a free-text
 * box so no one is ever blocked. Exposes a plain string value/onChange so it
 * drops into existing form state unchanged.
 */
export function DepartmentSelect({
  value,
  onChange,
  id,
  placeholder = 'Select your department',
}: {
  value: string
  onChange: (v: string) => void
  id?: string
  placeholder?: string
}) {
  // Initialise "Other" mode once, if the incoming value is a non-empty value we
  // don't recognise. Re-mounting the component (e.g. reopening a dialog) re-runs
  // this against the latest value.
  const [otherMode, setOtherMode] = useState(() => !!value && !isKnownDepartment(value))

  const selectValue = otherMode ? OTHER_DEPARTMENT : (isKnownDepartment(value) ? value : '')

  const handleSelect = (v: string) => {
    if (v === OTHER_DEPARTMENT) {
      setOtherMode(true)
      onChange('')
    } else {
      setOtherMode(false)
      onChange(v)
    }
  }

  return (
    <div className="space-y-2">
      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {ABUAD_DEPARTMENT_GROUPS.map((g) => (
            <SelectGroup key={g.college}>
              <SelectLabel>{g.college}</SelectLabel>
              {g.departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectGroup>
          ))}
          <SelectItem value={OTHER_DEPARTMENT}>{OTHER_DEPARTMENT}</SelectItem>
        </SelectContent>
      </Select>
      {otherMode && (
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your department"
          maxLength={100}
        />
      )}
    </div>
  )
}
