import { type NextRequest, NextResponse } from "next/server"

const PRODUCT_API_BASE = process.env.PRODUCT_API_URL ?? "http://localhost:8222/api/v1"

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    const cookie = request.headers.get("cookie")
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page")
    const size = searchParams.get("size")

    if (!authorization && !cookie) {
      return NextResponse.json({ message: "Missing credentials" }, { status: 401 })
    }

    const backendResponse = await fetch(
      `${PRODUCT_API_BASE}/products/all-product${page || size ? `?${new URLSearchParams({ ...(page ? { page } : {}), ...(size ? { size } : {}) }).toString()}` : ""}`,
      {
        method: "GET",
        headers: {
          ...(authorization ? { Authorization: authorization } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        cache: "no-store",
      }
    )

    const backendJson = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        backendJson?.message ||
        backendJson?.meta?.message ||
        backendJson?.error ||
        "Failed to fetch products"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const products = backendJson?.data ?? []
    const meta = backendJson?.meta ?? {}

    return NextResponse.json({ products, meta })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred while fetching products" }, { status: 500 })
  }
}
