"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { FolderTree, LayoutDashboard, LogOut, ShieldCheck, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { clearAuthSession, persistAuthSession, readStoredUser } from "@/lib/client-auth"
import { hasAdminAccess } from "@/lib/auth-session"

type StoredUser = {
  fullName?: string
  username?: string
  roles?: string[]
}

const adminLinks = [
  { href: "/admin/products", label: "Products", icon: LayoutDashboard },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
]

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [user, setUser] = useState<StoredUser | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const storedUser = readStoredUser()

    if (!token || !storedUser || !hasAdminAccess(storedUser.roles)) {
      clearAuthSession()
      setIsAuthorized(false)
      setIsCheckingAccess(false)
      router.replace("/")
      return
    }

    persistAuthSession({
      token,
      refreshToken: localStorage.getItem("refreshToken"),
      tokenType: localStorage.getItem("tokenType"),
      user: storedUser,
    })
    setUser(storedUser)
    setIsAuthorized(true)
    setIsCheckingAccess(false)
  }, [router])

  if (isCheckingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-muted/30 md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="sticky top-0 flex min-h-screen flex-col">
          <div className="border-b px-5 py-5">
            <div className="flex items-center gap-2 font-semibold tracking-tight">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>Admin Console</span>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Signed in as {user?.fullName || user?.username || "Admin"}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(user?.roles ?? []).map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-4">
            {adminLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t px-3 py-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href="/shop">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Shop
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => {
                  clearAuthSession()
                  router.push("/")
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div>{children}</div>
    </div>
  )
}
