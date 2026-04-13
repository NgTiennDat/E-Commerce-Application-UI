import { type NextRequest, NextResponse } from "next/server"

const CATEGORY_API_BASE = process.env.PRODUCT_API_URL ?? "http://localhost:8222/api/v1"

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")
    const cookie = request.headers.get("cookie")

    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") ?? "0"
    const size = searchParams.get("size") ?? "10"
    const keyword = searchParams.get("keyword")
    const isActive = searchParams.get("isActive")
    const parentId = searchParams.get("parentId")
    const hasChildren = searchParams.get("hasChildren")

    const backendQuery = new URLSearchParams({ page, size })

    const appendIfPresent = (key: string, value: string | null) => {
      if (value === null || value === undefined || value === "" || value === "null") return
      backendQuery.append(key, value)
    }

    appendIfPresent("keyword", keyword)
    appendIfPresent("isActive", isActive)
    appendIfPresent("parentId", parentId)
    appendIfPresent("hasChildren", hasChildren)

    const backendResponse = await fetch(`${CATEGORY_API_BASE}/categories?${backendQuery.toString()}`, {
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
        "Failed to fetch categories"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const categories = backendJson?.data ?? backendJson?.categories ?? []
    const meta = backendJson?.meta ?? {}

    return NextResponse.json({ categories, meta })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred while fetching categories" }, { status: 500 })
  }
}
