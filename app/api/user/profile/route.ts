import { type NextRequest, NextResponse } from "next/server"

const AUTH_API_BASE = process.env.AUTH_API_URL ?? "http://localhost:8040/api/v1"

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")

    if (!authorization) {
      return NextResponse.json({ message: "Missing authorization token" }, { status: 401 })
    }

    const backendResponse = await fetch(`${AUTH_API_BASE}/user/profile`, {
      method: "GET",
      headers: {
        Authorization: authorization,
      },
      cache: "no-store",
    })

    const backendJson = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        backendJson?.message ||
        backendJson?.meta?.message ||
        backendJson?.error ||
        "Failed to fetch profile"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const data = backendJson?.data

    if (!data) {
      return NextResponse.json({ message: "Unexpected profile response" }, { status: 500 })
    }

    const user = {
      id: data.id ?? data.userId ?? null,
      username: data.username,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: data.fullName ?? [data.firstName, data.lastName].filter(Boolean).join(" "),
      phoneNumber: data.phoneNumber,
      address: data.address,
      avatarUrl: data.avatarUrl,
      roles: data.roles ?? [],
      accountNonLocked: data.accountNonLocked,
      accountNonExpired: data.accountNonExpired,
      enabled: data.enabled,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred while fetching profile" }, { status: 500 })
  }
}
