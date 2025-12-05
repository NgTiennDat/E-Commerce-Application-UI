"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingCart, LogOut, User, Star, CheckCircle2, Percent, PackageSearch } from "lucide-react"

interface UserData {
  id: number
  email: string
  username: string
  name?: string
  fullName?: string
}

interface Product {
  id: number
  sku: string
  name: string
  shortDescription?: string
  description?: string
  price: number
  finalPrice: number
  discountPercent: number
  availableQuantity: number
  inStock: boolean
  imageUrl?: string
  brand?: string
  rating?: number
  ratingCount?: number
  isFeatured?: boolean
  isNew?: boolean
  category?: {
    id: number
    name: string
    description?: string
    slug?: string
    imageUrl?: string
    icon?: string
    isActive?: boolean
  }
}

interface ProductMeta {
  page?: number
  size?: number
  pages?: number
  total?: number
}

export default function ShopPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [meta, setMeta] = useState<ProductMeta>({})
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(8)
  const displayName = user?.name || user?.fullName || user?.username || "Customer"
  const totalPages =
    meta.pages ??
    (meta.total && size ? Math.max(1, Math.ceil(meta.total / size)) : undefined)
  const currentPage = meta.page ?? page

  useEffect(() => {
    // Check for valid token
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/")
      return
    }

    try {
      setUser(JSON.parse(userData))
    } catch {
      router.push("/")
      return
    }

    const fetchProducts = async () => {
      setProductsLoading(true)
      setProductsError(null)
      try {
        const query = new URLSearchParams({ page: page.toString(), size: size.toString() }).toString()
        const response = await fetch(`/api/products/all-product?${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })

        const json = await response.json()

        if (!response.ok) {
          setProductsError(json?.message || "Failed to load products")
          return
        }

        setProducts(json.products ?? [])
        setMeta(json.meta ?? {})
      } catch (error) {
        setProductsError("An error occurred while loading products")
      } finally {
        setProductsLoading(false)
      }
    }

    fetchProducts()
    setIsLoading(false)
  }, [router, page, size])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const goToPage = (newPage: number) => {
    if (newPage < 0) return
    if (totalPages !== undefined && newPage >= totalPages) return
    setPage(newPage)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            E-Commerce Shop
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Welcome, {displayName}</span>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/profile">Profile</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Products</h2>
            <p className="text-sm text-muted-foreground">
              Browse the latest inventory fetched from the product service
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {products.length} items
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={productsLoading || currentPage <= 0}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {currentPage + 1}
              {totalPages ? ` of ${totalPages}` : ""}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={productsLoading || (totalPages !== undefined && currentPage + 1 >= totalPages)}
            >
              Next
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Page size</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value) || 8)
                setPage(0)
              }}
              disabled={productsLoading}
            >
              {[8, 12, 16, 20].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {productsError && (
          <Alert variant="destructive">
            <AlertDescription>{productsError}</AlertDescription>
          </Alert>
        )}

        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="h-64 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <PackageSearch className="h-10 w-10" />
            <p>No products available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden flex flex-col">
                <CardHeader className="p-0">
                  <img
                    src={product.imageUrl || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                </CardHeader>
                <CardContent className="p-4 space-y-3 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                    {product.isNew && <Badge>New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.shortDescription}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">
                      ${product.finalPrice.toFixed(2)}
                    </span>
                    {product.discountPercent > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Percent className="h-4 w-4" />
                        <span className="line-through">${product.price.toFixed(2)}</span>
                        <Badge variant="secondary" className="ml-1">
                          -{product.discountPercent}%
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{product.rating ?? "—"}</span>
                      {product.ratingCount ? <span>({product.ratingCount})</span> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className={`h-4 w-4 ${product.inStock ? "text-green-500" : "text-destructive"}`} />
                      <span>{product.inStock ? "In stock" : "Out of stock"}</span>
                    </div>
                  </div>
                  {product.category?.name && (
                    <Badge variant="outline" className="w-fit">
                      {product.category.name}
                    </Badge>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button className="w-full" disabled={!product.inStock}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
