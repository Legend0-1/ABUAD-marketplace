'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown, Loader2, BadgeCheck, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Bank = { name: string; code: string }

export type BankAccountValue = {
  bankName: string
  bankCode?: string
  accountNumber: string
  accountName: string
}

/**
 * Bank + account-number + account-name fields with live confirmation.
 *
 * - Bank Name is a searchable dropdown (pick, don't type), populated from
 *   /api/banks (live Paystack list, or a static fallback).
 * - When Paystack is configured, entering a 10-digit account number auto-verifies
 *   the account and shows the real account holder's name for the user to confirm
 *   (like a mobile bank transfer). The name field is read-only in this mode.
 * - When Paystack isn't configured, the account name is a normal text input.
 *
 * State is lifted: the parent owns { bankName, bankCode, accountNumber, accountName }
 * and receives partial patches via onChange.
 */
export function BankAccountFields({
  value,
  onChange,
}: {
  value: BankAccountValue
  onChange: (patch: Partial<BankAccountValue>) => void
}) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [configured, setConfigured] = useState<boolean | null>(null) // null = still loading
  const [open, setOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  // Guards against re-resolving the same (bank, number) pair repeatedly.
  const lastKey = useRef<string>('')

  useEffect(() => {
    let cancelled = false
    api<{ configured: boolean; banks: Bank[] }>('/api/banks').then(({ data }) => {
      if (cancelled) return
      setBanks(data?.banks ?? [])
      setConfigured(data ? !!data.configured : false)
    })
    return () => { cancelled = true }
  }, [])

  // Auto-verify account name when we have a bank code + a full account number.
  useEffect(() => {
    if (configured !== true) return
    const code = value.bankCode
    const num = value.accountNumber
    if (!code || !/^\d{10}$/.test(num)) return
    const key = `${code}:${num}`
    if (key === lastKey.current) return
    lastKey.current = key
    setResolving(true)
    setResolveError(null)
    api<{ accountName?: string }>('/api/banks/resolve', {
      method: 'POST',
      body: { accountNumber: num, bankCode: code, bankName: value.bankName },
    }).then(({ data, error }) => {
      if (error) {
        setResolveError(error)
        onChange({ accountName: '' })
        return
      }
      if (data?.accountName) onChange({ accountName: data.accountName })
    }).finally(() => setResolving(false))
    // We intentionally exclude onChange/value.bankName from deps to avoid loops;
    // re-resolution is keyed on (bankCode, accountNumber) only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, value.bankCode, value.accountNumber])

  const selectBank = (b: Bank) => {
    lastKey.current = '' // allow re-resolve against the newly chosen bank
    setResolveError(null)
    onChange({ bankName: b.name, bankCode: b.code, accountName: '' })
    setOpen(false)
  }

  const onAccountNumber = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 10)
    lastKey.current = ''
    setResolveError(null)
    onChange({ accountNumber: digits, accountName: '' })
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {/* Bank picker */}
      <div className="sm:col-span-2">
        <Label>Bank Name <span className="text-destructive">*</span></Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              {value.bankName || <span className="text-muted-foreground">Select your bank…</span>}
              <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-(--radix-popover-trigger-width) min-w-[16rem]"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search banks…" />
              <CommandList>
                <CommandEmpty>
                  {configured === null ? 'Loading banks…' : 'No bank found.'}
                </CommandEmpty>
                <CommandGroup>
                  {banks.map((b) => (
                    <CommandItem
                      key={`${b.code}-${b.name}`}
                      value={b.name}
                      onSelect={() => selectBank(b)}
                    >
                      <Check className={cn('w-4 h-4', value.bankName === b.name ? 'opacity-100' : 'opacity-0')} />
                      {b.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Account number */}
      <div>
        <Label htmlFor="ba-number">Account Number <span className="text-destructive">*</span></Label>
        <Input
          id="ba-number"
          inputMode="numeric"
          value={value.accountNumber}
          onChange={(e) => onAccountNumber(e.target.value)}
          placeholder="10-digit account number"
          maxLength={10}
        />
      </div>

      {/* Account name — verified display (configured) or manual input (fallback) */}
      <div>
        <Label htmlFor="ba-name">Account Name <span className="text-destructive">*</span></Label>
        {configured === false ? (
          <Input
            id="ba-name"
            value={value.accountName}
            onChange={(e) => onChange({ accountName: e.target.value })}
            placeholder="e.g. Okafor Chioma"
          />
        ) : (
          <div className="h-9 flex items-center rounded-md border bg-muted/40 px-3 text-sm overflow-hidden">
            {configured === null ? (
              <span className="text-muted-foreground">Loading…</span>
            ) : resolving ? (
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking account…
              </span>
            ) : value.accountName ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-primary truncate">
                <BadgeCheck className="w-4 h-4 shrink-0" /> {value.accountName}
              </span>
            ) : (
              <span className="text-muted-foreground">Pick bank + enter number to verify</span>
            )}
          </div>
        )}
      </div>

      {resolveError && (
        <p className="sm:col-span-2 text-xs text-destructive inline-flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {resolveError}
        </p>
      )}
      {configured === true && value.accountName && !resolving && (
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Please confirm this is your account name before continuing.
        </p>
      )}
    </div>
  )
}
