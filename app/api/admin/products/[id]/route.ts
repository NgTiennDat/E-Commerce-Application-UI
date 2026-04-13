import { type NextRequest, NextResponse } from "next/server"
import { resolveParams, type ParamsContext } from "@/lib/resolve-params"

const PRODUCT_API_BASE = process.env.PRODUCT_API_URL ?? "http://localhost:8222/api/v1"
const PRODUCT_ADMIN_API_BASE = `${PRODUCT_API_BASE}/admin`

export async function PATCH(
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

    if (!authorization && !cookie) {
      return NextResponse.json({ message: "Missing credentials" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
    }

    const backendResponse = await fetch(`${PRODUCT_ADMIN_API_BASE}/products/${productId}`, {
      method: "PATCH",
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
        "Failed to update product"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const data = backendJson?.data ?? backendJson
    const meta = backendJson?.meta ?? {}

    return NextResponse.json({ data, meta }, { status: backendResponse.status })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred while updating product" }, { status: 500 })
  }
}

export async function DELETE(
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

    if (!authorization && !cookie) {
      return NextResponse.json({ message: "Missing credentials" }, { status: 401 })
    }

    const backendResponse = await fetch(`${PRODUCT_ADMIN_API_BASE}/products/${productId}`, {
      method: "DELETE",
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
        "Failed to delete product"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const data = backendJson?.data ?? backendJson
    const meta = backendJson?.meta ?? {}

    return NextResponse.json({ data, meta }, { status: backendResponse.status })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred while deleting product" }, { status: 500 })
  }
}
