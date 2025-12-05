import { type NextRequest, NextResponse } from "next/server"

const AUTH_API_BASE = process.env.AUTH_API_URL ?? "http://localhost:8040/api/v1"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Updated to target the user registration endpoint exposed by the backend
    const backendResponse = await fetch(`${AUTH_API_BASE}/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const backendJson = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        backendJson?.message ||
        backendJson?.meta?.message ||
        backendJson?.error ||
        "Registration failed"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const data = backendJson?.data

    // Backend returns { userId, username, email, roles, accessToken }
    if (!data?.accessToken) {
      return NextResponse.json({ message: "Unexpected registration response" }, { status: 500 })
    }

    const user = data?.user
      ? data.user
      : {
          id: data.userId,
          username: data.username,
          email: data.email,
          roles: data.roles ?? [],
        }

    return NextResponse.json({
      token: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      tokenType: data.tokenType ?? "Bearer",
      user,
    })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred during registration" }, { status: 500 })
  }
}
