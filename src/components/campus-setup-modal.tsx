'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { CountrySelect } from '@/components/country-select'
import { InstitutionCategorySelect } from '@/components/institution-category-select'
import { InstitutionSelect } from '@/components/institution-select'
import { GraduationCap, MapPin, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CountryInfo } from '@/lib/institutions'

/**
 * Campus-setup modal. Every student must have a campus so the marketplace can
 * scope what they see. New users get this once after they sign in without one;
 * existing users can re-open it to move (or correct) their campus.
 *
 * The picker mirrors the registration cascade — Country → Institution Type →
 * Institution — and the free-text "Other" path lets a student type a campus we
 * don't have in the catalog. Matching is by normalized name, so two students
 * who type the same campus land on the same one and can trade with each other.
 */
export function CampusSetupModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved?: () => void
}) {
  const { user, setUser, toast: storeToast } = useStore()
  const [busy, setBusy] = useState(false)
  const [countries, setCountries] = useState<CountryInfo[]>([])
  const [form, setForm] = useState({
    country: '',
    institutionCategory: '',
    institution: '',
  })

  // Seed from the user's current campus values when we open, so editing shows
  // what they already have rather than a blank form.
  useEffect(() => {
    if (!open) return
    setForm({
      country: user?.country || '',
      institutionCategory: user?.institutionType || '',
      institution: user?.institution || '',
    })
    let cancelled = false
    ;(async () => {
      const { data } = await api<{ countries: CountryInfo[] }>('/api/countries')
      if (cancelled || !data) return
      setCountries(data.countries)
      setForm((f) => {
        if (f.country) return f
        if (user?.country) return f
        // Preselect when exactly one country is available (Nigeria-only today).
        return data.countries.length === 1 ? { ...f, country: data.countries[0].code } : f
      })
    })()
    return () => { cancelled = true }
  }, [open, user?.country, user?.institution, user?.institutionType])

  const submit = async () => {
    if (!form.institution.trim()) {
      toast.error('Enter or select your campus')
      return
    }
    setBusy(true)
    const { data, error } = await api<{ user: any }>('/api/auth/me', {
      method: 'PUT',
      body: {
        country: form.country || undefined,
        institutionType: form.institutionCategory || undefined,
        institution: form.institution.trim(),
      },
    })
    setBusy(false)
    if (error) {
      toast.error('Could not save your campus', { description: error })
      return
    }
    if (data?.user) setUser(data.user)
    storeToast({ title: 'Campus saved', description: `You're now browsing ${form.institution.trim()}.`, variant: 'success' })
    onOpenChange(false)
    onSaved?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Set your campus</DialogTitle>
              <DialogDescription className="text-sm">
                UNI MART is split by campus — you'll only see listings from your own school.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 flex gap-3">
          <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Pick your institution below. If it isn't listed, choose <span className="font-medium text-foreground">Other (not listed)</span> and type its name exactly as your coursemates would — students who type the same name share one campus and can trade with each other.
          </p>
        </div>

        <div className="grid gap-3">
          <div>
            <Label htmlFor="campus-country">Country</Label>
            <CountrySelect
              id="campus-country"
              value={form.country}
              countries={countries}
              onChange={(v) => setForm((f) => ({ ...f, country: v, institutionCategory: '', institution: '' }))}
            />
          </div>
          <div>
            <Label htmlFor="campus-category">Institution Type</Label>
            <InstitutionCategorySelect
              id="campus-category"
              countryCode={form.country}
              value={form.institutionCategory}
              onChange={(v) => setForm((f) => ({ ...f, institutionCategory: v, institution: '' }))}
            />
          </div>
          <div>
            <Label htmlFor="campus-institution">Campus / Institution</Label>
            <InstitutionSelect
              key={form.country + '|' + form.institutionCategory}
              id="campus-institution"
              countryCode={form.country}
              category={form.institutionCategory}
              value={form.institution}
              onChange={(v) => setForm((f) => ({ ...f, institution: v }))}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          {user?.institution && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
          )}
          <Button onClick={submit} disabled={busy || !form.institution.trim()} className="cta-gradient border-0 rounded-full">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Save campus'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
