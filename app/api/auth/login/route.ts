import { type NextRequest, NextResponse } from "next/server"

const AUTH_API_BASE = process.env.AUTH_API_URL ?? "http://localhost:8040/api/v1"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailOrUsername, password } = body ?? {}

    if (!emailOrUsername || !password) {
      return NextResponse.json({ message: "Email/username and password are required" }, { status: 400 })
    }

    const backendResponse = await fetch(`${AUTH_API_BASE}/auth/doLogin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Backend expects "usernameOrEmail"
      body: JSON.stringify({ usernameOrEmail: emailOrUsername, password }),
      cache: "no-store",
    })

    const backendJson = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        backendJson?.message ||
        backendJson?.meta?.message ||
        backendJson?.error ||
        "Invalid email/username or password"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const data = backendJson?.data

    if (!data?.accessToken || !data?.user) {
      return NextResponse.json({ message: "Unexpected authentication response" }, { status: 500 })
    }

    return NextResponse.json({
      token: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: data.tokenType,
      user: data.user,
    })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred during authentication" }, { status: 500 })
  }
}
