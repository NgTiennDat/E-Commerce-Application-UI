import { type NextRequest, NextResponse } from "next/server"

const PRODUCT_API_BASE = process.env.PRODUCT_API_URL ?? "http://localhost:8222/api/v1"

export async function PATCH(
  request: NextRequest,
  context: { params: { id?: string } } | { params: Promise<{ id?: string }> },
) {
  try {
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

    const body = await request.json().catch(() => null)
    const status = body?.status

    if (!status) {
      return NextResponse.json({ message: "Status is required" }, { status: 400 })
    }

    const backendResponse = await fetch(`${PRODUCT_API_BASE}/products/${productId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ status }),
      cache: "no-store",
    })

    const backendJson = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        backendJson?.message ||
        backendJson?.meta?.message ||
        backendJson?.error ||
        "Failed to update status"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const data = backendJson?.data ?? backendJson
    const meta = backendJson?.meta ?? {}

    return NextResponse.json({ data, meta }, { status: backendResponse.status })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred while updating status" }, { status: 500 })
  }
}
