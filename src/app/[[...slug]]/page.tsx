'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Sidebar } from '@/components/sidebar'
import { AuthModal } from '@/components/auth-modal'
import { CampusGate } from '@/components/campus-gate'
import { ToastStack } from '@/components/toast-stack'
import { HomePage } from '@/views/home'
import { CategoryPage } from '@/views/category'
import { ProductPage } from '@/views/product'
import { SearchPage } from '@/views/search'
import { SellPage } from '@/views/sell'
import { StorefrontPage } from '@/views/storefront'
import { SellerDashboardPage } from '@/views/seller-dashboard'
import { StorefrontViewPage } from '@/views/storefront-view'
import { OrdersPage } from '@/views/orders'
import { InboxPage } from '@/views/inbox'
import { InboxThreadPage } from '@/views/inbox-thread'
import { ProfilePage } from '@/views/profile'
import { AdminPage } from '@/views/admin'
import { AgreementPage } from '@/views/agreement'
import { SetupStorefrontPage } from '@/views/setup-storefront'
import { CartDrawer } from '@/components/cart-drawer'
import { AboutPage } from '@/views/about'
import { CampusSafetyPage } from '@/views/campus-safety'
import { ServiceChargePage } from '@/views/service-charge'
import { SustainabilityPage } from '@/views/sustainability'
import { DisputeResolutionPage } from '@/views/dispute-resolution'
import { ReportUserPage } from '@/views/report-user'
import { ProtectAccountPage } from '@/views/protect-account'
import { FeedbackPage } from '@/views/feedback'
import { DeliveryPartnerRegisterPage } from '@/views/delivery-partner-register'
import { DeliveriesPage } from '@/views/deliveries'
import { HRQueuePage } from '@/views/hr-queue'
import { ResetPasswordPage } from '@/views/reset-password'
import { PrivacyPolicyPage } from '@/views/privacy-policy'
import { ContactAdminPage } from '@/views/contact-admin'

import { pathToView } from '@/lib/routing'

export default function Home() {
  const { user, setUser, view, setView, setViewFromPopstate, authModalOpen, setAuthModalOpen } = useStore()
  const [bootstrapping, setBootstrapping] = useState(true)

  // Bootstrap session on first load
  useEffect(() => {
    (async () => {
      const { data } = await api<{ user: any }>('/api/auth/me')
      if (data?.user) setUser(data.user)
      setBootstrapping(false)
    })()
  }, [setUser])

  // Real URL-based routing: parse the current path into a view on first
  // load (so a hard refresh or a shared/bookmarked link lands on the right
  // page), and keep it in sync with the browser's back/forward buttons.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)

    // Legacy pattern: some server-side redirects (Paystack callbacks, older
    // emails) still land here as `?view=orders` rather than a real path.
    // Translate those once, then fall through to normal path-based routing.
    const legacyView = params.get('view')
    if (legacyView) {
      const emailVerify = params.get('emailVerify')
      if (emailVerify === 'success') toast.success('Email verified!')
      else if (emailVerify === 'error') toast.error('That verification link is invalid or expired.')

      if (legacyView === 'reset-password') {
        const token = params.get('token')
        if (token) setView({ name: 'reset-password', token })
      } else {
        const parsed = pathToView(`/${legacyView}`, params)
        if (parsed) setView(parsed)
      }
      window.history.replaceState({}, '', window.location.pathname === '/' ? '/' : window.location.pathname)
      return
    }

    const initial = pathToView(window.location.pathname, params)
    if (initial) {
      setViewFromPopstate(initial)
    } else {
      // Unrecognized path -- send them home rather than showing a blank page.
      window.history.replaceState({}, '', '/')
    }

    const onPopState = () => {
      const p = new URLSearchParams(window.location.search)
      const v = pathToView(window.location.pathname, p)
      setViewFromPopstate(v || { name: 'home' })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // For first-time visitors who are not logged in, show the auth modal automatically
  useEffect(() => {
    if (!bootstrapping && !user) {
      const dismissed = typeof window !== 'undefined' && sessionStorage.getItem('unimart_auth_dismissed') === '1'
      if (!dismissed) {
        setAuthModalOpen(true)
      }
    } else if (user) {
      setAuthModalOpen(false)
    }
  }, [bootstrapping, user, setAuthModalOpen])

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading UNI MART…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Constant rail-width padding: the sidebar expands on hover as a fixed
          overlay, so content must NOT reflow with it — keep this at 76px. */}
      <div className="flex flex-col min-h-screen lg:pl-[76px]">
        <Header />
        <main className="flex-1">
          {/* Browse surfaces are campus-scoped: logged-out visitors see a
              sign-in prompt, and users without a campus are asked to set one.
              Account/utility views below stay reachable so a user can still
              get to their profile to fix their campus. */}
          {view.name === 'home' && <CampusGate><HomePage /></CampusGate>}
          {view.name === 'category' && <CampusGate><CategoryPage slug={view.slug} name={view.categoryName} /></CampusGate>}
          {view.name === 'product' && <CampusGate><ProductPage productId={view.id} /></CampusGate>}
          {view.name === 'search' && <CampusGate><SearchPage q={view.q} /></CampusGate>}
          {view.name === 'storefrontView' && <CampusGate><StorefrontViewPage ownerId={view.ownerId} /></CampusGate>}
          {view.name === 'sell' && <SellPage />}
          {view.name === 'storefront' && <StorefrontPage />}
          {view.name === 'seller-dashboard' && <SellerDashboardPage />}
          {view.name === 'storefrontView' && <StorefrontViewPage ownerId={view.ownerId} />}
          {view.name === 'orders' && <OrdersPage />}
          {view.name === 'inbox' && <InboxPage />}
          {view.name === 'inboxThread' && <InboxThreadPage conversationId={view.conversationId} />}
          {view.name === 'profile' && <ProfilePage />}
          {view.name === 'admin' && <AdminPage />}
          {view.name === 'agreement' && <AgreementPage />}
          {view.name === 'setup-storefront' && <SetupStorefrontPage />}
          {view.name === 'about' && <AboutPage />}
          {view.name === 'campus-safety' && <CampusSafetyPage />}
          {view.name === 'service-charge' && <ServiceChargePage />}
          {view.name === 'sustainability' && <SustainabilityPage />}
          {view.name === 'dispute-resolution' && <DisputeResolutionPage />}
          {view.name === 'report-user' && <ReportUserPage />}
          {view.name === 'protect-account' && <ProtectAccountPage />}
          {view.name === 'feedback' && <FeedbackPage />}
          {view.name === 'delivery-partner-register' && <DeliveryPartnerRegisterPage />}
          {view.name === 'deliveries' && <DeliveriesPage />}
          {view.name === 'hr-queue' && <HRQueuePage />}
          {view.name === 'reset-password' && <ResetPasswordPage token={view.token} />}
          {view.name === 'privacy-policy' && <PrivacyPolicyPage />}
          {view.name === 'contact-admin' && <ContactAdminPage />}
        </main>
        <Footer />
      </div>
      <AuthModal open={authModalOpen} onOpenChange={(o) => {
        setAuthModalOpen(o)
        if (!o && !user) {
          if (typeof window !== 'undefined') sessionStorage.setItem('unimart_auth_dismissed', '1')
        }
      }} />
      <CartDrawer />
      <ToastStack />
    </div>
  )
}
