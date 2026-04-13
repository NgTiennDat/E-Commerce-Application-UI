import { type NextRequest, NextResponse } from "next/server"

const PRODUCT_API_BASE = process.env.PRODUCT_API_URL ?? "http://localhost:8222/api/v1"
const PRODUCT_ADMIN_API_BASE = `${PRODUCT_API_BASE}/admin`

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    const cookie = request.headers.get("cookie")

    if (!authorization && !cookie) {
      return NextResponse.json({ message: "Missing credentials" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
    }

    const backendResponse = await fetch(`${PRODUCT_ADMIN_API_BASE}/products/add-product`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
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
        "Failed to create product"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const data = backendJson?.data ?? backendJson
    const meta = backendJson?.meta ?? {}

    return NextResponse.json({ data, meta }, { status: backendResponse.status })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred while creating product" }, { status: 500 })
  }
}
