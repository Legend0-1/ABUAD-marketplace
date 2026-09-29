'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import {
  Home, Store, Package, MessageSquare, Truck, ShieldCheck, LayoutDashboard,
  Sparkles, ChevronDown, X, Plus, LifeBuoy,
  Shirt, WashingMachine, Printer, Footprints, Smartphone, BookOpen,
  Plug, BedDouble, Tag, FileText,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Truck, FileText, Shirt, WashingMachine, Printer, Footprints,
  Smartphone, BookOpen, Sparkles, Plug, BedDouble, Tag,
}

export function Sidebar() {
  const {
    user, view, setView, setAuthModalOpen,
    sidebarOpen, setSidebarOpen,
  } = useStore()
  const [categories, setCategories] = useState<any[]>([])
  const [catsExpanded, setCatsExpanded] = useState(true)
  // Desktop rail expands on hover / keyboard focus instead of a click toggle.
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await api<{ categories: any[] }>('/api/categories')
      if (data?.categories) setCategories(data.categories)
    })()
  }, [])

  const go = (v: Parameters<typeof setView>[0], needsAuth = false) => {
    if (needsAuth && !user) { setAuthModalOpen(true); setSidebarOpen(false); return }
    setView(v)
    setSidebarOpen(false)
  }

  const isCat = (slug: string) => view.name === 'category' && (view as any).slug === slug

  // Primary feature links — the marketplace analogue of MovieBox's
  // Home / TV / Movie / Most-Watched rail.
  const primary: { label: string; icon: LucideIcon; active: boolean; onClick: () => void; auth?: boolean }[] = [
    { label: 'Home', icon: Home, active: view.name === 'home', onClick: () => go({ name: 'home' }) },
    { label: 'Sell an Item', icon: Plus, active: view.name === 'sell', onClick: () => go({ name: 'sell' }, true), auth: true },
    { label: 'My Storefront', icon: Store, active: view.name === 'storefront', onClick: () => go({ name: 'storefront' }, true), auth: true },
    { label: 'Orders', icon: Package, active: view.name === 'orders', onClick: () => go({ name: 'orders' }, true), auth: true },
    { label: 'Inbox', icon: MessageSquare, active: view.name === 'inbox' || view.name === 'inboxThread', onClick: () => go({ name: 'inbox' }, true), auth: true },
    { label: 'Deliveries', icon: Truck, active: view.name === 'deliveries', onClick: () => go({ name: 'deliveries' }, true), auth: true },
    { label: 'Contact Admin', icon: LifeBuoy, active: view.name === 'contact-admin', onClick: () => go({ name: 'contact-admin' }, true), auth: true },
  ]

  const NavRow = ({
    label, icon: Icon, active, onClick, badge, accent, collapsed,
  }: { label: string; icon: LucideIcon; active?: boolean; onClick: () => void; badge?: number; accent?: boolean; collapsed: boolean }) => (
    <button
      onClick={onClick}
      data-active={active ? 'true' : 'false'}
      title={collapsed ? label : undefined}
      className={cn(
        'nav-item w-full flex items-center rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:text-white',
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
        active && 'text-white',
        accent && 'text-primary hover:text-primary',
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0', active && 'text-primary')} />
      {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
      {!collapsed && badge ? (
        <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  )

  const renderContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={cn('flex items-center h-16 shrink-0 border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'gap-2 px-4')}>
        <button onClick={() => go({ name: 'home' })} className="flex items-center gap-2 min-w-0">
          <img src="/logo-header.png" alt="UNI MART" className="h-8 w-auto shrink-0" />
        </button>
        {/* Mobile close (drawer only — never collapsed) */}
        {!collapsed && (
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1.5 rounded-md text-sidebar-foreground/70 hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1">
        {primary.map((p) => (
          <NavRow key={p.label} label={p.label} icon={p.icon} active={p.active} onClick={p.onClick} accent={p.label === 'Sell an Item'} collapsed={collapsed} />
        ))}

        {/* Categories group */}
        <div className="pt-3">
          {!collapsed ? (
            <button
              onClick={() => setCatsExpanded((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/45 hover:text-sidebar-foreground/70"
            >
              <span className="flex-1 text-left">Categories</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', !catsExpanded && '-rotate-90')} />
            </button>
          ) : (
            <div className="mx-2 my-1 border-t border-sidebar-border" />
          )}

          {(collapsed || catsExpanded) && (
            <div className="space-y-1 mt-1">
              {categories.map((c) => {
                const Icon = CATEGORY_ICONS[c.icon || 'Tag'] || Tag
                return (
                  <NavRow
                    key={c.id}
                    label={c.name}
                    icon={Icon}
                    active={isCat(c.slug)}
                    onClick={() => go({ name: 'category', slug: c.slug, categoryName: c.name })}
                    badge={c._count?.products || undefined}
                    collapsed={collapsed}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Admin / HR */}
        {(user?.isAdmin || user?.isHR) && (
          <div className="pt-3">
            {!collapsed && <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/45">Staff</p>}
            {(user?.isAdmin || user?.isHR) && (
              <NavRow label="HR Dashboard" icon={Truck} active={view.name === 'hr-queue'} onClick={() => go({ name: 'hr-queue' })} accent collapsed={collapsed} />
            )}
            {user?.isAdmin && (
              <NavRow label="Admin Dashboard" icon={LayoutDashboard} active={view.name === 'admin'} onClick={() => go({ name: 'admin' })} accent collapsed={collapsed} />
            )}
          </div>
        )}
      </nav>

      {/* Sell promo card, pinned bottom */}
      {!collapsed && (
        <div className="p-3 shrink-0">
          <div className="glass-card rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-lg cta-gradient flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold text-white">Sell on UNI MART</p>
                <p className="text-[11px] text-sidebar-foreground/60">Turn your items into cash</p>
              </div>
            </div>
            <button
              onClick={() => go({ name: 'sell' }, true)}
              className="mt-1 w-full cta-gradient rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Start Selling
            </button>
          </div>
        </div>
      )}

      {/* Trust footer strip */}
      {!collapsed && (
        <div className="px-4 pb-4 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-sidebar-foreground/50">
            <ShieldCheck className="w-3.5 h-3.5 text-verified" />
            <span>Matric-verified students only</span>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop rail — fixed at 76px, expands to 256px on hover/focus as an
          overlay. Because it's position:fixed and the page keeps a constant
          76px left padding, expanding floats over content without shifting it. */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(false) }}
        className={cn(
          'hidden lg:flex fixed left-0 top-0 bottom-0 z-40 bg-sidebar border-r border-sidebar-border transition-[width] duration-200',
          hovered ? 'w-64 shadow-2xl' : 'w-[76px]',
        )}
      >
        {renderContent(!hovered)}
      </aside>

      {/* Mobile drawer — always full width, always expanded */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border shadow-2xl animate-in slide-in-from-left duration-200">
            {renderContent(false)}
          </div>
        </div>
      )}
    </>
  )
}
