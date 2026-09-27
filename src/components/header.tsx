'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import {
  Search, ShoppingCart, User, Menu, Store, Package, MessageSquare,
  LayoutDashboard, LogOut, ChevronDown, Shield, Truck, Plus, Sun, Moon,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function Header() {
  const { user, setUser, setView, setAuthModalOpen, setAuthMode, cart, setCartOpen, setSidebarOpen, theme, toggleTheme, setView: sv } = useStore()
  const [searchQ, setSearchQ] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  // Poll for unread inbox count (lightweight)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const poll = async () => {
      const { data } = await api<{ conversations: any[] }>('/api/messages/conversations')
      if (cancelled) return
      if (data?.conversations) {
        const lastSeen = Number(sessionStorage.getItem('unimart_inbox_seen') || 0)
        const unread = data.conversations.filter((c) => {
          if (!c.lastMessage) return false
          if (c.lastMessage.senderId === user.id) return false
          return new Date(c.lastMessage.createdAt).getTime() > lastSeen
        }).length
        setUnreadCount(unread)
      }
    }
    poll()
    const t = setInterval(poll, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [user])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQ.trim()) return
    sv({ name: 'search', q: searchQ.trim() })
  }

  const handleLogout = async () => {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
    sessionStorage.removeItem('unimart_inbox_seen')
    sessionStorage.removeItem('unimart_auth_dismissed')
    sv({ name: 'home' })
  }

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)

  return (
    <header className="amazon-header text-white sticky top-0 z-30">
      <div className="px-3 sm:px-5">
        <div className="flex items-center gap-2 sm:gap-4 h-16">
          {/* Mobile: open sidebar drawer */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo (desktop logo lives in the sidebar) */}
          <button onClick={() => sv({ name: 'home' })} className="lg:hidden flex items-center shrink-0">
            <img src="/logo-header.png" alt="UNI MART" className="h-7 w-auto" />
          </button>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex flex-1 min-w-0 max-w-2xl items-stretch rounded-full overflow-hidden glass focus-within:ring-2 focus-within:ring-primary/50 transition"
          >
            <div className="pl-4 flex items-center text-white/50">
              <Search className="w-4 h-4" />
            </div>
            <Input
              ref={searchRef}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search products, services, sellers…"
              className="flex-1 border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-white/50"
            />
            <button
              type="submit"
              className="px-5 cta-gradient flex items-center justify-center font-semibold text-sm"
              aria-label="Search"
            >
              <Search className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
            {/* Theme toggle — dark is default, light is opt-in. Shows the icon
                for the mode you'll switch TO. */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/10 transition text-white"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <>
                {/* Quick "Sell" CTA — real action, styled with the gold accent */}
                <button
                  onClick={() => sv({ name: 'sell' })}
                  className="hidden md:inline-flex items-center gap-1.5 cta-gold rounded-full px-3.5 py-1.5 text-xs font-bold"
                  title="Sell a product or service"
                >
                  <Plus className="w-3.5 h-3.5" /> Sell
                </button>

                {/* Inbox */}
                <button
                  onClick={() => sv({ name: 'inbox' })}
                  className="relative p-2 rounded-lg hover:bg-white/10 transition"
                  aria-label="Inbox"
                  title="Inbox"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center pulse-purple">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Cart */}
                <button
                  onClick={() => setCartOpen(true)}
                  className="flex items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition relative"
                  aria-label="Cart"
                >
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </div>
                </button>

                {/* Account */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-full hover:bg-white/10 transition">
                      <Avatar className="w-8 h-8 border border-white/20">
                        <AvatarImage src={user.profilePicture || undefined} />
                        <AvatarFallback className="bg-primary/20 text-white text-xs">
                          {user.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:flex flex-col items-start leading-tight">
                        <span className="text-[10px] text-white/60">Hello,</span>
                        <span className="text-xs font-bold flex items-center gap-1">
                          {user.fullName.split(' ')[0]} <ChevronDown className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 glass-panel border-white/10">
                    <DropdownMenuLabel className="flex flex-col gap-0.5">
                      <span className="font-bold">{user.fullName}</span>
                      <span className="text-xs text-muted-foreground font-normal">{user.matricNumber}</span>
                      <span className="text-xs text-muted-foreground font-normal">{user.department} • {user.level}</span>
                      {user.isAdmin && (
                        <Badge variant="secondary" className="w-fit mt-1 text-[10px]">
                          <Shield className="w-3 h-3 mr-1" /> Admin
                        </Badge>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => sv({ name: 'profile' })} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> Your Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sv({ name: 'orders' })} className="cursor-pointer">
                      <Package className="w-4 h-4 mr-2" /> Your Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sv({ name: 'storefront' })} className="cursor-pointer">
                      <Store className="w-4 h-4 mr-2" /> Your Storefront
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sv({ name: 'sell' })} className="cursor-pointer">
                      <Package className="w-4 h-4 mr-2" /> Sell a Product / Service
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sv({ name: 'inbox' })} className="cursor-pointer">
                      <MessageSquare className="w-4 h-4 mr-2" /> Inbox
                      {unreadCount > 0 && <Badge className="ml-auto">{unreadCount}</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sv({ name: 'agreement' })} className="cursor-pointer">
                      <Shield className="w-4 h-4 mr-2" /> Seller Agreement
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sv({ name: 'deliveries' })} className="cursor-pointer">
                      <Truck className="w-4 h-4 mr-2" /> Deliveries
                    </DropdownMenuItem>
                    {(user.isAdmin || user.isHR) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => sv({ name: 'hr-queue' })} className="cursor-pointer text-primary font-medium">
                          <Truck className="w-4 h-4 mr-2" /> HR Dashboard
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => sv({ name: 'admin' })} className="cursor-pointer text-primary font-medium">
                          <LayoutDashboard className="w-4 h-4 mr-2" /> Admin Dashboard
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 hover:text-white px-2 sm:px-3 rounded-full"
                  onClick={() => openAuth('login')}
                >
                  Log in
                </Button>
                <Button
                  size="sm"
                  className="hidden sm:inline-flex cta-gradient rounded-full font-bold"
                  onClick={() => openAuth('register')}
                >
                  Create Account
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
