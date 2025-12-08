"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShoppingCart, LogOut, User, Star, CheckCircle2, Percent, PackageSearch, Search, SlidersHorizontal, Filter } from "lucide-react"

interface UserData {
  id: number
  email: string
  username: string
  name?: string
  fullName?: string
  roles?: string[]
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
  status?: string
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
  code?: string
}

type ProductFilters = {
  keyword: string
  categoryName: string
  status: string
  minPrice: string
  maxPrice: string
  brand: string
  isFeatured: boolean
  isNew: boolean
}

const createDefaultFilters = (): ProductFilters => ({
  keyword: "",
  categoryName: "",
  status: "",
  minPrice: "",
  maxPrice: "",
  brand: "",
  isFeatured: false,
  isNew: false,
})

export default function ShopPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedError, setRelatedError] = useState<string | null>(null)
  const [relatedFor, setRelatedFor] = useState<Product | null>(null)
  const [meta, setMeta] = useState<ProductMeta>({})
  const [filters, setFilters] = useState<ProductFilters>(createDefaultFilters())
  const [appliedFilters, setAppliedFilters] = useState<ProductFilters>(createDefaultFilters())
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(12)
  const displayName = user?.name || user?.fullName || user?.username || "Customer"
  const normalizedRoles = user?.roles?.map((role) => String(role).toUpperCase().replace(/^ROLE_/, "")) ?? []
  const isAdmin =
    normalizedRoles.includes("ADMIN") ||
    normalizedRoles.includes("SELLER") ||
    normalizedRoles.includes("STAFF_SUPPORT") ||
    normalizedRoles.includes("INVENTORY_MANAGER") ||
    normalizedRoles.includes("DELIVERY_MANAGER") ||
    normalizedRoles.includes("PAYMENT_MANAGER")
  const totalItems = meta.total !== undefined ? Number(meta.total) : products.length
  const totalPages =
    meta.pages !== undefined
      ? Number(meta.pages)
      : totalItems && size
        ? Math.max(1, Math.ceil(totalItems / size))
        : undefined
  const currentPage = meta.page !== undefined ? Number(meta.page) : page

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
        const queryParams = new URLSearchParams({
          page: page.toString(),
          size: size.toString(),
        })

        const addIfPresent = (key: string, value?: string | boolean) => {
          if (value === undefined || value === null) return
          if (typeof value === "string" && value.trim() === "") return
          queryParams.append(key, String(value))
        }

        addIfPresent("keyword", appliedFilters.keyword.trim())
        addIfPresent("categoryName", appliedFilters.categoryName.trim())
        addIfPresent("status", appliedFilters.status)
        addIfPresent("minPrice", appliedFilters.minPrice.trim())
        addIfPresent("maxPrice", appliedFilters.maxPrice.trim())
        addIfPresent("brand", appliedFilters.brand.trim())
        if (appliedFilters.isFeatured) addIfPresent("isFeatured", true)
        if (appliedFilters.isNew) addIfPresent("isNew", true)

        const query = queryParams.toString()

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
  }, [router, page, size, appliedFilters])

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

  const applyFilters = () => {
    setPage(0)
    setAppliedFilters({ ...filters })
  }

  const resetFilters = () => {
    const cleared = createDefaultFilters()
    setFilters(cleared)
    setAppliedFilters(cleared)
    setPage(0)
  }

  const fetchRelatedProducts = async (product: Product) => {
    const token = localStorage.getItem("token")
    if (!token) {
      setRelatedError("Missing auth token")
      return
    }

    setRelatedFor(product)
    setRelatedLoading(true)
    setRelatedError(null)
    try {
      const response = await fetch(`/api/products/${product.id}/related`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      const json = await response.json()

      if (!response.ok) {
        setRelatedProducts([])
        setRelatedError(json?.message || "Failed to load related products")
        return
      }

      setRelatedProducts(json.products ?? json.data ?? [])
    } catch (error) {
      setRelatedProducts([])
      setRelatedError("An error occurred while loading related products")
    } finally {
      setRelatedLoading(false)
    }
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
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/products">Admin</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <SlidersHorizontal className="h-4 w-4" />
              Live catalog
            </p>
            <h2 className="text-2xl font-bold">Products</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-full border bg-background px-3 py-2">
              {totalItems} items
            </div>
            <div className="rounded-full border bg-background px-3 py-2">
              Page {currentPage + 1}
              {totalPages ? ` / ${totalPages}` : ""}
            </div>
          </div>
        </div>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Filter className="h-4 w-4" />
                Filters
              </p>
              <CardTitle className="text-lg">Search & Refine Products</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetFilters} disabled={productsLoading}>
                Reset
              </Button>
              <Button size="sm" onClick={applyFilters} disabled={productsLoading}>
                Apply filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="keyword"
                  placeholder="Search by name or description"
                  className="pl-9"
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyFilters()
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                placeholder="e.g. Generic"
                value={filters.brand}
                onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryName">Category</Label>
              <Input
                id="categoryName"
                placeholder="Category name"
                value={filters.categoryName}
                onChange={(e) => setFilters({ ...filters, categoryName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Any</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minPrice">Min price</Label>
              <Input
                id="minPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPrice">Max price</Label>
              <Input
                id="maxPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="1000.00"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <Label htmlFor="featured">Featured</Label>
                <p className="text-xs text-muted-foreground">Only show featured picks</p>
              </div>
              <Switch
                id="featured"
                checked={filters.isFeatured}
                onCheckedChange={(checked) => setFilters({ ...filters, isFeatured: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-1">
                <Label htmlFor="new">New arrivals</Label>
                <p className="text-xs text-muted-foreground">Highlight fresh inventory</p>
              </div>
              <Switch id="new" checked={filters.isNew} onCheckedChange={(checked) => setFilters({ ...filters, isNew: checked })} />
            </div>
          </CardContent>
        </Card>

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
                setSize(Number(e.target.value) || 12)
                setPage(0)
              }}
              disabled={productsLoading}
            >
              {[8, 12, 13, 16, 20].map((option) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Card key={idx} className="overflow-hidden">
                <div className="h-48 w-full animate-pulse bg-muted" />
                <CardContent className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <PackageSearch className="h-10 w-10" />
            <p>No products found for the current filters.</p>
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
                    <div className="flex gap-1">
                      {product.isNew && <Badge>New</Badge>}
                      {product.isFeatured && <Badge variant="secondary">Featured</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.shortDescription || product.description || "No description provided."}
                  </p>
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
                      <span>
                        {product.rating !== undefined && product.rating !== null ? product.rating.toFixed(1) : "N/A"}
                      </span>
                      {product.ratingCount ? <span>({product.ratingCount})</span> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className={`h-4 w-4 ${product.inStock ? "text-green-500" : "text-destructive"}`} />
                      <span>{product.inStock ? "In stock" : "Out of stock"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">SKU:</span>
                      <span>{product.sku}</span>
                    </div>
                    {product.brand && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-foreground">Brand:</span>
                        <span>{product.brand}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">Qty:</span>
                      <span>{product.availableQuantity}</span>
                    </div>
                  </div>
                  {product.category?.name && (
                    <Badge variant="outline" className="w-fit">
                      {product.category.name}
                    </Badge>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => fetchRelatedProducts(product)}
                      disabled={productsLoading}
                    >
                      Related
                    </Button>
                    <Button className="flex-1" disabled={!product.inStock}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {relatedFor && (
          <Card className="border-primary/10 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Related products
                  </p>
                  <CardTitle className="text-lg">
                    For {relatedFor.name}
                  </CardTitle>
                </div>
                <Badge variant="secondary">Category: {relatedFor.category?.name ?? "N/A"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {relatedLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  Loading related products...
                </div>
              ) : relatedError ? (
                <Alert variant="destructive">
                  <AlertDescription>{relatedError}</AlertDescription>
                </Alert>
              ) : relatedProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No related products found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {relatedProducts.map((product) => (
                    <Card key={`related-${product.id}`} className="overflow-hidden flex flex-col">
                      <CardHeader className="p-0">
                        <img
                          src={product.imageUrl || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-40 object-cover"
                        />
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base line-clamp-2">{product.name}</CardTitle>
                          <div className="flex gap-1">
                            {product.isNew && <Badge>New</Badge>}
                            {product.isFeatured && <Badge variant="secondary">Featured</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.shortDescription || product.description || "No description provided."}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">
                            ${product.finalPrice.toFixed(2)}
                          </span>
                          {product.discountPercent > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Percent className="h-4 w-4" />
                              <span className="line-through">${product.price.toFixed(2)}</span>
                              <Badge variant="secondary" className="ml-1">
                                -{product.discountPercent}%
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>
                              {product.rating !== undefined && product.rating !== null ? product.rating.toFixed(1) : "N/A"}
                            </span>
                            {product.ratingCount ? <span>({product.ratingCount})</span> : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className={`h-4 w-4 ${product.inStock ? "text-green-500" : "text-destructive"}`} />
                            <span>{product.inStock ? "In stock" : "Out of stock"}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground">SKU:</span>
                            <span>{product.sku}</span>
                          </div>
                          {product.brand && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-foreground">Brand:</span>
                              <span>{product.brand}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground">Qty:</span>
                            <span>{product.availableQuantity}</span>
                          </div>
                        </div>
                        {product.category?.name && (
                          <Badge variant="outline" className="w-fit">
                            {product.category.name}
                          </Badge>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <div className="flex gap-2 w-full">
                          <Button className="flex-1" disabled={!product.inStock}>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
