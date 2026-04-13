import { type NextRequest, NextResponse } from "next/server"
import { resolveParams, type ParamsContext } from "@/lib/resolve-params"

const PRODUCT_API_BASE = process.env.PRODUCT_API_URL ?? "http://localhost:8222/api/v1"

export async function GET(
  request: NextRequest,
  context: ParamsContext,
) {
  try {
    const { id: productId } = await resolveParams(context)
    const authorization = request.headers.get("authorization")
    const cookie = request.headers.get("cookie")

    if (!productId) {
      return NextResponse.json({ message: "Product id is required" }, { status: 400 })
    }

    const backendResponse = await fetch(`${PRODUCT_API_BASE}/products/${productId}`, {
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
        "Failed to fetch product"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const product = backendJson?.data ?? backendJson
    const meta = backendJson?.meta ?? {}

    return NextResponse.json({ product, meta })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred while fetching product" }, { status: 500 })
  }
}
