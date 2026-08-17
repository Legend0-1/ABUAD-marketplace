'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { AuthModal } from '@/components/auth-modal'
import { ToastStack } from '@/components/toast-stack'
import { HomePage } from '@/views/home'
import { CategoryPage } from '@/views/category'
import { ProductPage } from '@/views/product'
import { SearchPage } from '@/views/search'
import { SellPage } from '@/views/sell'
import { StorefrontPage } from '@/views/storefront'
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

export default function Home() {
  const { user, setUser, view, authModalOpen, setAuthModalOpen } = useStore()
  const [bootstrapping, setBootstrapping] = useState(true)

  // Bootstrap session on first load
  useEffect(() => {
    (async () => {
      const { data } = await api<{ user: any }>('/api/auth/me')
      if (data?.user) setUser(data.user)
      setBootstrapping(false)
    })()
  }, [setUser])

  // For first-time visitors who are not logged in, show the auth modal automatically
  useEffect(() => {
    if (!bootstrapping && !user) {
      const dismissed = typeof window !== 'undefined' && sessionStorage.getItem('abuad_auth_dismissed') === '1'
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
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading UNI MART…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {view.name === 'home' && <HomePage />}
        {view.name === 'category' && <CategoryPage slug={view.slug} name={view.categoryName} />}
        {view.name === 'product' && <ProductPage productId={view.id} />}
        {view.name === 'search' && <SearchPage q={view.q} />}
        {view.name === 'sell' && <SellPage />}
        {view.name === 'storefront' && <StorefrontPage />}
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
      </main>
      <Footer />
      <AuthModal open={authModalOpen} onOpenChange={(o) => {
        setAuthModalOpen(o)
        if (!o && !user) {
          if (typeof window !== 'undefined') sessionStorage.setItem('abuad_auth_dismissed', '1')
        }
      }} />
      <CartDrawer />
      <ToastStack />
    </div>
  )
}
