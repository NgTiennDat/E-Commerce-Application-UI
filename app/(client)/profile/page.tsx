"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, LogOut, MapPin, Phone, Shield, User, UserCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { clearAuthSession } from "@/lib/client-auth"

type UserProfile = {
  id: number | null
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  phoneNumber?: string
  address?: string
  avatarUrl?: string
  enabled?: boolean
  roles?: string[]
  createdAt?: string
  updatedAt?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchProfile = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        clearAuthSession()
        router.push("/")
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })

        const json = await response.json()

        if (!response.ok) {
          setError(json?.message || "Unable to load profile")
          return
        }

        if (!cancelled) {
          setProfile(json.user)
        }
      } catch (err) {
        if (!cancelled) {
          setError("An error occurred while loading your profile")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchProfile()

    return () => {
      cancelled = true
    }
  }, [router])

  const handleLogout = () => {
    clearAuthSession()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
      <Card className="w-full max-w-3xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatarUrl} alt={profile?.fullName || profile?.username || "User"} />
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-primary" />
                {profile?.fullName || profile?.username || "Your profile"}
              </CardTitle>
              <CardDescription>{profile?.email || "Signed in user"}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile?.roles?.length
              ? profile.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="uppercase tracking-wide">
                    {role}
                  </Badge>
                ))
              : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Username" value={profile?.username} />
            <InfoRow label="Full name" value={profile?.fullName} />
            <InfoRow label="First name" value={profile?.firstName} />
            <InfoRow label="Last name" value={profile?.lastName} />
            <InfoRow label="Phone" value={profile?.phoneNumber} icon={<Phone className="h-4 w-4 text-muted-foreground" />} />
            <InfoRow label="Address" value={profile?.address} icon={<MapPin className="h-4 w-4 text-muted-foreground" />} />
            <InfoRow
              label="Account status"
              value={profile?.enabled ? "Enabled" : "Disabled"}
              icon={<Shield className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : "N/A"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/shop">Back to shop</Link>
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value?: string | number | null
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{value ?? "Not provided"}</span>
      </div>
    </div>
  )
}
