import { type NextRequest, NextResponse } from "next/server"

const PRODUCT_API_BASE = process.env.PRODUCT_API_URL ?? "http://localhost:8222/api/v1"

export async function GET(
  request: NextRequest,
  context: { params: { id?: string } } | { params: Promise<{ id?: string }> },
) {
  try {
    // Next may provide params as a Promise; normalize it so we can safely access id
    const resolvedParams =
      "params" in context && typeof (context as { params: unknown }).params === "object"
        ? await Promise.resolve((context as { params: { id?: string } } | { params: Promise<{ id?: string }> }).params)
        : { id: undefined }

    const productId = (resolvedParams as { id?: string }).id
    const authorization = request.headers.get("authorization")
    const cookie = request.headers.get("cookie")

    if (!productId) {
      return NextResponse.json({ message: "Product id is required" }, { status: 400 })
    }

    if (!authorization && !cookie) {
      return NextResponse.json({ message: "Missing credentials" }, { status: 401 })
    }

    const backendResponse = await fetch(`${PRODUCT_API_BASE}/products/${productId}/related`, {
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
        "Failed to fetch related products"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const products = backendJson?.data ?? backendJson?.products ?? []
    const meta = backendJson?.meta ?? {}

    return NextResponse.json({ products, meta })
  } catch (error) {
    return NextResponse.json(
      { message: "An error occurred while fetching related products" },
      { status: 500 },
    )
  }
}
