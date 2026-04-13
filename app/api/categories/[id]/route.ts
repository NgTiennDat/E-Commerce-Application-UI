import { type NextRequest, NextResponse } from "next/server"
import { resolveParams, type ParamsContext } from "@/lib/resolve-params"

const CATEGORY_API_BASE = process.env.PRODUCT_API_URL ?? "http://localhost:8222/api/v1"

export async function GET(
  request: NextRequest,
  context: ParamsContext,
) {
  try {
    const { id: categoryId } = await resolveParams(context)
    const authorization = request.headers.get("authorization")
    const cookie = request.headers.get("cookie")

    if (!categoryId) {
      return NextResponse.json({ message: "Category id is required" }, { status: 400 })
    }

    const backendResponse = await fetch(`${CATEGORY_API_BASE}/categories/${categoryId}`, {
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
        "Failed to fetch category"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const category = backendJson?.data ?? backendJson
    const meta = backendJson?.meta ?? {}

    return NextResponse.json({ category, meta })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred while fetching category" }, { status: 500 })
  }
}
