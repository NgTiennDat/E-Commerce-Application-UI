"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, ShoppingBag } from "lucide-react"
import { hasAdminAccess } from "@/lib/auth-session"
import { persistAuthSession } from "@/lib/client-auth"

export function LoginForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  })
  const [errors, setErrors] = useState<{ emailOrUsername?: string; password?: string; general?: string }>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = () => {
    const newErrors: { emailOrUsername?: string; password?: string } = {}

    // Check if it's an email format, if so validate it
    if (formData.emailOrUsername.includes("@")) {
      if (!validateEmail(formData.emailOrUsername)) {
        newErrors.emailOrUsername = "Please enter a valid email address"
      }
    } else if (formData.emailOrUsername.length < 3) {
      newErrors.emailOrUsername = "Username must be at least 3 characters"
    }

    if (!formData.emailOrUsername) {
      newErrors.emailOrUsername = "Email or username is required"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailOrUsername: formData.emailOrUsername,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ general: data.message || "Invalid credentials. Please try again." })
        return
      }

      const normalizedRoles = persistAuthSession(data)
      const isAdmin = hasAdminAccess(normalizedRoles)

      router.push(isAdmin ? "/admin/products" : "/shop")
    } catch (error) {
      setErrors({ general: "An error occurred. Please try again later." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="rounded-full bg-primary p-3">
            <ShoppingBag className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>Sign in to your E-Commerce account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">Email or Username</Label>
            <Input
              id="emailOrUsername"
              type="text"
              placeholder="Enter your email or username"
              value={formData.emailOrUsername}
              onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
              className={errors.emailOrUsername ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {errors.emailOrUsername && <p className="text-sm text-destructive">{errors.emailOrUsername}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={errors.password ? "border-destructive" : ""}
              disabled={isLoading}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 mt-5">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
