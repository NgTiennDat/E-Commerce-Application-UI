import type React from "react"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span>E-Commerce</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Login</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/register">Register</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/shop">Shop</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
