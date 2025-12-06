import { type NextRequest, NextResponse } from "next/server"

const PRODUCT_API_BASE = process.env.PRODUCT_API_URL ?? "http://localhost:8222/api/v1"

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    const cookie = request.headers.get("cookie")
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") ?? "0"
    const size = searchParams.get("size") ?? "12"
    const keyword = searchParams.get("keyword")
    const categoryId = searchParams.get("categoryId")
    const status = searchParams.get("status")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const brand = searchParams.get("brand")
    const isFeatured = searchParams.get("isFeatured")
    const isNew = searchParams.get("isNew")

    if (!authorization && !cookie) {
      return NextResponse.json({ message: "Missing credentials" }, { status: 401 })
    }

    const backendQuery = new URLSearchParams({ page, size })

    const appendIfPresent = (key: string, value: string | null) => {
      if (value === null || value === undefined || value === "" || value === "null") return
      backendQuery.append(key, value)
    }

    appendIfPresent("keyword", keyword)
    appendIfPresent("categoryId", categoryId)
    appendIfPresent("status", status)
    appendIfPresent("minPrice", minPrice)
    appendIfPresent("maxPrice", maxPrice)
    appendIfPresent("brand", brand)
    appendIfPresent("isFeatured", isFeatured)
    appendIfPresent("isNew", isNew)

    const backendResponse = await fetch(`${PRODUCT_API_BASE}/products?${backendQuery}`, {
      method: "GET",
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      cache: "no-store",
    })

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
