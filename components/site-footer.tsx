"use client"

import Link from "next/link"
import { ShoppingCart, Mail, Github, ExternalLink, ShieldCheck } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">E-Commerce</p>
                <p className="text-xs text-muted-foreground">Shop smarter. Manage faster.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              A focused storefront and admin panel built to keep catalog updates fast and shopping smooth.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Secure checkout
              </span>
              <span className="flex items-center gap-1">
                <ExternalLink className="h-4 w-4 text-primary" />
                Real-time sync
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Navigate</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <Link href="/shop" className="hover:text-foreground transition-colors">
                Shop
              </Link>
              <Link href="/profile" className="hover:text-foreground transition-colors">
                Profile
              </Link>
              <Link href="/admin/products" className="hover:text-foreground transition-colors">
                Admin
              </Link>
              <Link href="/register" className="hover:text-foreground transition-colors">
                Create account
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Support</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                support@example.com
              </span>
              <span className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                @ecommerce-app
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Need admin access? Contact support to enable your role.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} E-Commerce. All rights reserved.</span>
          <div className="flex gap-3">
            <Link href="/shop" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/shop" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/shop" className="hover:text-foreground transition-colors">
              Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
