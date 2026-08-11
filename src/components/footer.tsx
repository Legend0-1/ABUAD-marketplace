'use client'

import { useStore } from '@/lib/store'
import { Shield, Heart } from 'lucide-react'

export function Footer() {
  const { setView, user } = useStore()
  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      <div className="amazon-header-dark">
        <button
          onClick={() => setView({ name: 'home' })}
          className="w-full text-center py-4 hover:bg-white/5 transition text-sm font-medium"
        >
          ↑ Back to top
        </button>
      </div>
      <div className="max-w-[1500px] mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-bold mb-3 text-white/90">Get to Know Us</h4>
          <ul className="space-y-2 text-white/70">
            <li className="hover:text-white cursor-pointer">About ABUAD Marketplace</li>
            <li className="hover:text-white cursor-pointer">Campus Safety Policy</li>
            <li className="hover:text-white cursor-pointer">Our 20% Service Charge</li>
            <li className="hover:text-white cursor-pointer">Sustainability</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3 text-white/90">Make Money with Us</h4>
          <ul className="space-y-2 text-white/70">
            <li className="hover:text-white cursor-pointer" onClick={() => user ? setView({ name: 'sell' }) : null}>Sell on ABUAD Marketplace</li>
            <li className="hover:text-white cursor-pointer" onClick={() => user ? setView({ name: 'setup-storefront' }) : null}>Set up a Storefront</li>
            <li className="hover:text-white cursor-pointer">Become a Delivery Partner</li>
            <li className="hover:text-white cursor-pointer">Protect Your Account</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3 text-white/90">Help & Safety</h4>
          <ul className="space-y-2 text-white/70">
            <li className="hover:text-white cursor-pointer" onClick={() => setView({ name: 'agreement' })}>Seller Agreement</li>
            <li className="hover:text-white cursor-pointer">Report a User</li>
            <li className="hover:text-white cursor-pointer">Food Safety & Approval</li>
            <li className="hover:text-white cursor-pointer">Dispute Resolution</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3 text-white/90">Trust & Verification</h4>
          <ul className="space-y-2 text-white/70">
            <li className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Matric Verified</li>
            <li className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Buyer Acknowledgement Payouts</li>
            <li className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Admin Silent Oversight</li>
            <li className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Food Storefront Approval</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6">
        <div className="max-w-[1500px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-white/95 flex items-center justify-center text-primary font-black">A</div>
            <span>© {new Date().getFullYear()} ABUAD Marketplace. Built for Afe Babalola University students, by students.</span>
          </div>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3 h-3 fill-current" /> for ABUAD
          </p>
        </div>
      </div>
    </footer>
  )
}
