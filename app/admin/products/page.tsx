"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  PackagePlus,
  PackageSearch,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

type Product = {
  id?: number
  sku: string
  name: string
  shortDescription?: string
  description?: string
  price: number
  finalPrice?: number
  discountPercent: number
  availableQuantity: number
  inStock?: boolean
  imageUrl?: string
  brand?: string
  isFeatured?: boolean
  isNew?: boolean
  status?: string
  category?: {
    id?: number
    name?: string
  }
}

type ProductMeta = {
  page?: number
  size?: number
  pages?: number
  total?: number
}

type ProductFilters = {
  keyword: string
  status: string
  brand: string
  isFeatured: boolean
  isNew: boolean
}

type ProductFormState = {
  sku: string
  name: string
  shortDescription: string
  description: string
  price: string
  discountPercent: string
  availableQuantity: string
  imageUrl: string
  brand: string
  categoryId: string
  isFeatured: boolean
  isNew: boolean
}

type UserInfo = {
  username?: string
  fullName?: string
  roles?: string[]
}

const defaultFormState: ProductFormState = {
  sku: "",
  name: "",
  shortDescription: "",
  description: "",
  price: "",
  discountPercent: "0",
  availableQuantity: "0",
  imageUrl: "",
  brand: "",
  categoryId: "",
  isFeatured: false,
  isNew: true,
}

const defaultFilters: ProductFilters = {
  keyword: "",
  status: "",
  brand: "",
  isFeatured: false,
  isNew: false,
}

const ADMIN_ROLES = ["ADMIN"]
const normalizeRole = (role: string) => String(role).toUpperCase().replace(/^ROLE_/, "")

const parseStoredUser = (storedUser: string | null): UserInfo | null => {
  if (!storedUser) return null

  try {
    const parsed = JSON.parse(storedUser)
    const roles: string[] = Array.isArray(parsed?.roles) ? parsed.roles.map(normalizeRole) : []
    return { ...parsed, roles }
  } catch {
    return null
  }
}

const validateProductForm = (state: ProductFormState) => {
  if (!state.sku.trim()) return "SKU is required"
  if (!state.name.trim()) return "Product name is required"
  if (!state.shortDescription.trim()) return "Short description is required"
  if (!state.description.trim()) return "Description is required"

  const price = parseFloat(state.price)
  if (Number.isNaN(price) || price <= 0) return "Price must be greater than 0"

  const discount = parseFloat(state.discountPercent)
  if (Number.isNaN(discount) || discount < 0) return "Discount must be 0 or greater"

  const quantity = parseInt(state.availableQuantity, 10)
  if (Number.isNaN(quantity) || quantity < 0) return "Available quantity must be 0 or greater"

  if (!state.categoryId.trim()) return "Category ID is required"

  return null
}

const buildProductPayload = (state: ProductFormState) => ({
  sku: state.sku.trim(),
  name: state.name.trim(),
  shortDescription: state.shortDescription.trim(),
  description: state.description.trim(),
  price: parseFloat(state.price),
  discountPercent: parseFloat(state.discountPercent) || 0,
  availableQuantity: parseInt(state.availableQuantity, 10) || 0,
  imageUrl: state.imageUrl.trim(),
  brand: state.brand.trim(),
  isFeatured: state.isFeatured,
  isNew: state.isNew,
  categoryId: Number(state.categoryId),
})

const buildQueryParams = (filters: ProductFilters, page: number, size: number) => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  })

  const addIfPresent = (key: string, value?: string | boolean) => {
    if (value === undefined || value === null) return
    if (typeof value === "string" && value.trim() === "") return
    queryParams.append(key, String(value))
  }

  addIfPresent("keyword", filters.keyword.trim())
  addIfPresent("status", filters.status)
  addIfPresent("brand", filters.brand.trim())
  if (filters.isFeatured) addIfPresent("isFeatured", true)
  if (filters.isNew) addIfPresent("isNew", true)

  return queryParams
}

const formatCurrency = (value: number) => `$${Number(value || 0).toFixed(2)}`

const getProductStatusMeta = (product: Product) => {
  const inStock = product.inStock ?? product.availableQuantity > 0
  const statusLabel = product.status ?? (inStock ? "ACTIVE" : "INACTIVE")
  const nextStatus = statusLabel === "ACTIVE" ? "INACTIVE" : "ACTIVE"
  return { inStock, statusLabel, nextStatus }
}

type FieldChangeHandler = (field: keyof ProductFormState, value: string | boolean) => void
type FilterChangeHandler = (field: keyof ProductFilters, value: string | boolean) => void

export default function ProductAdminPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [formState, setFormState] = useState<ProductFormState>(defaultFormState)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [meta, setMeta] = useState<ProductMeta>({})
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<ProductFilters>(defaultFilters)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [rowActionLoadingId, setRowActionLoadingId] = useState<number | null>(null)
  const [rowActionError, setRowActionError] = useState<string | null>(null)

  const displayName = user?.fullName || user?.username || "Admin"
  const isAdmin = Boolean(
    user?.roles?.some((role) => ADMIN_ROLES.includes(normalizeRole(role))),
  )
  const totalItems = meta.total !== undefined ? Number(meta.total) : products.length
  const totalPages =
    meta.pages !== undefined
      ? Number(meta.pages)
      : totalItems && size
        ? Math.max(1, Math.ceil(totalItems / size))
        : undefined
  const currentPage = meta.page !== undefined ? Number(meta.page) : page

  const computedFinalPrice = useMemo(() => {
    const price = parseFloat(formState.price) || 0
    const discount = parseFloat(formState.discountPercent) || 0
    const discountAmount = price * (discount / 100)
    return Math.max(price - discountAmount, 0)
  }, [formState.discountPercent, formState.price])

  const formDisabled = creating || !isAdmin

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const userFromStorage = parseStoredUser(localStorage.getItem("user"))

    if (!storedToken || !userFromStorage) {
      router.push("/")
      return
    }

    setToken(storedToken)
    setUser(userFromStorage)

    const hasAdminRole = userFromStorage.roles?.some((role) => ADMIN_ROLES.includes(role))
    if (!hasAdminRole) {
      router.push("/shop")
    }
  }, [router])

  const fetchProducts = useCallback(async () => {
    if (!token) return
    setProductsLoading(true)
    setProductsError(null)
    try {
      const queryParams = buildQueryParams(appliedFilters, page, size)
      const response = await fetch(`/api/products/all-product?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      const json = await response.json()

      if (!response.ok) {
        setProductsError(json?.message || "Failed to load products")
        setProducts([])
        return
      }

      setProducts(json.products ?? [])
      setMeta(json.meta ?? {})
    } catch (error) {
      setProductsError("An error occurred while loading products")
    } finally {
      setProductsLoading(false)
    }
  }, [appliedFilters, page, size, token])

  useEffect(() => {
    if (!token) return
    fetchProducts()
  }, [fetchProducts, token])

  const handleFieldChange: FieldChangeHandler = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value as ProductFormState[keyof ProductFormState],
    }))
  }

  const handleFilterChange: FilterChangeHandler = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value as ProductFilters[keyof ProductFilters],
    }))
  }

  const handleSubmitProduct = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    const validationError = validateProductForm(formState)
    if (validationError) {
      setFormError(validationError)
      return
    }

    if (!token) {
      setFormError("Missing auth token")
      router.push("/")
      return
    }

    if (!isAdmin) {
      setFormError("Only admin users can add products")
      return
    }

    setCreating(true)

    const payload = {
      sku: formState.sku.trim(),
      name: formState.name.trim(),
      shortDescription: formState.shortDescription.trim(),
      description: formState.description.trim(),
      price: parseFloat(formState.price),
      discountPercent: parseFloat(formState.discountPercent) || 0,
      availableQuantity: parseInt(formState.availableQuantity, 10) || 0,
      imageUrl: formState.imageUrl.trim(),
      brand: formState.brand.trim(),
      isFeatured: formState.isFeatured,
      isNew: formState.isNew,
      categoryId: Number(formState.categoryId),
    }

    const isEditing = Boolean(editingProduct?.id)

    try {
      const endpoint = isEditing ? `/api/products/${editingProduct?.id}` : "/api/products/add-product"
      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const json = await response.json()

      if (!response.ok) {
        setFormError(json?.message || (isEditing ? "Failed to update product" : "Failed to create product"))
        return
      }

      setFormSuccess(
        json?.meta?.message || (isEditing ? "Product updated successfully" : "Product created successfully"),
      )
      setFormState(defaultFormState)
      setEditingProduct(null)

      setPage(0)
      fetchProducts()
    } catch (error) {
      setFormError(isEditing ? "An error occurred while updating product" : "An error occurred while creating product")
    } finally {
      setCreating(false)
    }
  }

  const handleApplyFilters = () => {
    setPage(0)
    setAppliedFilters({ ...filters })
  }

  const handleResetFilters = () => {
    setFilters(defaultFilters)
    setAppliedFilters(defaultFilters)
    setPage(0)
  }

  const goToPage = (newPage: number) => {
    if (newPage < 0) return
    if (totalPages !== undefined && newPage >= totalPages) return
    setPage(newPage)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("tokenType")
    localStorage.removeItem("user")
    router.push("/")
  }

  const startEditingProduct = (product: Product) => {
    setEditingProduct(product)
    setFormError(null)
    setFormSuccess(null)
    setFormState({
      sku: product.sku || "",
      name: product.name || "",
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      price: product.price != null ? String(product.price) : "",
      discountPercent: product.discountPercent != null ? String(product.discountPercent) : "0",
      availableQuantity: product.availableQuantity != null ? String(product.availableQuantity) : "0",
      imageUrl: product.imageUrl || "",
      brand: product.brand || "",
      categoryId: product.category?.id != null ? String(product.category.id) : "",
      isFeatured: Boolean(product.isFeatured),
      isNew: Boolean(product.isNew),
    })
  }

  const cancelEditing = () => {
    setEditingProduct(null)
    setFormState(defaultFormState)
    setFormError(null)
    setFormSuccess(null)
  }

  const handleUpdateStatus = async (product: Product, status: string) => {
    if (!token || !product.id) return
    setRowActionError(null)
    setRowActionLoadingId(product.id)
    try {
      const response = await fetch(`/api/products/${product.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      const json = await response.json()
      if (!response.ok) {
        setRowActionError(json?.message || "Failed to update status")
        return
      }
      fetchProducts()
    } catch (error) {
      setRowActionError("An error occurred while updating status")
    } finally {
      setRowActionLoadingId(null)
    }
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!token || !product.id) return
    setRowActionError(null)
    setRowActionLoadingId(product.id)
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = await response.json()
      if (!response.ok) {
        setRowActionError(json?.message || "Failed to delete product")
        return
      }
      fetchProducts()
    } catch (error) {
      setRowActionError("An error occurred while deleting product")
    } finally {
      setRowActionLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <AdminHeader isAdmin={isAdmin} displayName={displayName} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8 space-y-6">
        {!isAdmin && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You do not have permission to manage products. Redirecting to shop...</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <ProductFormCard
            editingProduct={editingProduct}
            formDisabled={formDisabled}
            formError={formError}
            formState={formState}
            formSuccess={formSuccess}
            computedFinalPrice={computedFinalPrice}
            isAdmin={isAdmin}
            onFieldChange={handleFieldChange}
            onReset={editingProduct ? cancelEditing : () => setFormState(defaultFormState)}
            onSubmit={handleSubmitProduct}
          />
          <InventoryOverviewCard
            currentPage={currentPage}
            products={products}
            productsError={productsError}
            productsLoading={productsLoading}
            totalItems={totalItems}
            totalPages={totalPages}
            onRefresh={fetchProducts}
          />
        </div>

        <FiltersCard
          filters={filters}
          productsLoading={productsLoading}
          onApply={handleApplyFilters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        <ProductsTableCard
          currentPage={currentPage}
          formDisabled={formDisabled}
          products={products}
          productsError={productsError}
          productsLoading={productsLoading}
          rowActionError={rowActionError}
          rowActionLoadingId={rowActionLoadingId}
          size={size}
          totalPages={totalPages}
          onDelete={handleDeleteProduct}
          onEdit={startEditingProduct}
          onPageChange={goToPage}
          onPageSizeChange={(value) => {
            setSize(value)
            setPage(0)
          }}
          onReload={fetchProducts}
          onUpdateStatus={handleUpdateStatus}
        />
      </main>
    </div>
  )
}

type AdminHeaderProps = {
  isAdmin: boolean
  displayName: string
  onLogout: () => void
}

const AdminHeader = ({ isAdmin, displayName, onLogout }: AdminHeaderProps) => (
  <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="container mx-auto flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <PackagePlus className="h-5 w-5" />
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin</p>
          <h1 className="text-lg font-bold">Product Management</h1>
        </div>
        {isAdmin ? (
          <Badge variant="secondary" className="ml-2 inline-flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Badge>
        ) : (
          <Badge variant="destructive" className="ml-2 inline-flex items-center gap-1">
            <ShieldAlert className="h-4 w-4" />
            Limited role
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden text-sm text-muted-foreground sm:block">Signed in as {displayName}</div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/shop">View shop</Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </div>
  </header>
)

type ProductFormCardProps = {
  editingProduct: Product | null
  formDisabled: boolean
  formError: string | null
  formState: ProductFormState
  formSuccess: string | null
  computedFinalPrice: number
  isAdmin: boolean
  onFieldChange: FieldChangeHandler
  onReset: () => void
  onSubmit: (event: React.FormEvent) => void
}

const ProductFormCard = ({
  editingProduct,
  formDisabled,
  formError,
  formState,
  formSuccess,
  computedFinalPrice,
  isAdmin,
  onFieldChange,
  onReset,
  onSubmit,
}: ProductFormCardProps) => {
  const handleInputChange =
    (field: keyof ProductFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onFieldChange(field, event.target.value)

  const handleToggle = (field: keyof ProductFormState) => (checked: boolean) => onFieldChange(field, checked)

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <PackagePlus className="h-4 w-4" />
              {editingProduct ? "Edit product" : "Create product"}
            </p>
            <CardTitle className="text-2xl">
              {editingProduct ? `Editing ${editingProduct.name ?? editingProduct.sku}` : "Add a new catalog item"}
            </CardTitle>
            <CardDescription>
              {editingProduct
                ? "Update the details below and save changes."
                : "Fill in the details below to publish a new product."}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="inline-flex items-center gap-1 self-start">
            <Sparkles className="h-4 w-4" />
            Live sync
          </Badge>
        </div>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formState.sku}
                onChange={handleInputChange("sku")}
                placeholder="KB-MECH-034"
                disabled={formDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formState.name}
                onChange={handleInputChange("name")}
                placeholder="Mechanical Keyboard Pro"
                disabled={formDisabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short description</Label>
            <Input
              id="shortDescription"
              value={formState.shortDescription}
              onChange={handleInputChange("shortDescription")}
              placeholder="High-quality mechanical keyboard with RGB"
              disabled={formDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Full description</Label>
            <Textarea
              id="description"
              value={formState.description}
              onChange={handleInputChange("description")}
              placeholder="A premium mechanical keyboard featuring hot-swap switches, per-key RGB lighting, and aluminum frame."
              rows={4}
              disabled={formDisabled}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formState.price}
                onChange={handleInputChange("price")}
                placeholder="129.99"
                disabled={formDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountPercent">Discount (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                min="0"
                max="100"
                step="1"
                value={formState.discountPercent}
                onChange={handleInputChange("discountPercent")}
                placeholder="10"
                disabled={formDisabled}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="availableQuantity">Available quantity</Label>
              <Input
                id="availableQuantity"
                type="number"
                min="0"
                step="1"
                value={formState.availableQuantity}
                onChange={handleInputChange("availableQuantity")}
                placeholder="100"
                disabled={formDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category ID</Label>
              <Input
                id="categoryId"
                value={formState.categoryId}
                onChange={handleInputChange("categoryId")}
                placeholder="12"
                disabled={formDisabled}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formState.brand}
                onChange={handleInputChange("brand")}
                placeholder="KeyMaster"
                disabled={formDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={formState.imageUrl}
                onChange={handleInputChange("imageUrl")}
                placeholder="https://example.com/products/mech-pro.png"
                disabled={formDisabled}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-4 shadow-sm">
              <div>
                <Label htmlFor="isFeatured">Featured</Label>
                <p className="text-xs text-muted-foreground">Highlight this product on the storefront</p>
              </div>
              <Switch
                id="isFeatured"
                checked={formState.isFeatured}
                onCheckedChange={handleToggle("isFeatured")}
                disabled={formDisabled}
              />
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-4 shadow-sm">
              <div>
                <Label htmlFor="isNew">New arrival</Label>
                <p className="text-xs text-muted-foreground">Mark as a fresh arrival</p>
              </div>
              <Switch
                id="isNew"
                checked={formState.isNew}
                onCheckedChange={handleToggle("isNew")}
                disabled={formDisabled}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Tag className="h-4 w-4 text-primary" />
            Final price preview: <span className="font-semibold text-foreground">{formatCurrency(computedFinalPrice)}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onReset} disabled={formDisabled}>
              {editingProduct ? "Cancel edit" : "Reset form"}
            </Button>
            <Button type="submit" disabled={formDisabled}>
              {formDisabled ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isAdmin ? (editingProduct ? "Saving..." : "Creating...") : "Restricted"}
                </>
              ) : editingProduct ? (
                "Save changes"
              ) : (
                "Create product"
              )}
            </Button>
          </div>
        </CardFooter>
      </form>
      {(formError || formSuccess) && (
        <CardFooter className="flex-col items-start gap-2 pt-0">
          {formError && (
            <Alert variant="destructive" className="w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {formSuccess && (
            <Alert className="w-full border-green-500/40 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{formSuccess}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

type ProductsTableCardProps = {
  products: Product[]
  productsLoading: boolean
  productsError: string | null
  rowActionError: string | null
  rowActionLoadingId: number | null
  formDisabled: boolean
  currentPage: number
  totalPages?: number
  size: number
  onPageChange: (page: number) => void
  onPageSizeChange: (value: number) => void
  onReload: () => void
  onEdit: (product: Product) => void
  onUpdateStatus: (product: Product, status: string) => void
  onDelete: (product: Product) => void
}

const ProductsTableCard = ({
  products,
  productsLoading,
  productsError,
  rowActionError,
  rowActionLoadingId,
  formDisabled,
  currentPage,
  totalPages,
  size,
  onPageChange,
  onPageSizeChange,
  onReload,
  onEdit,
  onUpdateStatus,
  onDelete,
}: ProductsTableCardProps) => (
  <Card className="border-primary/10 shadow-sm">
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <Package className="h-4 w-4" />
          Catalog
        </p>
        <CardTitle className="text-lg">Products</CardTitle>
        <CardDescription>Manage products with your admin credentials.</CardDescription>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={productsLoading || currentPage <= 0}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage + 1}
          {totalPages ? ` of ${totalPages}` : ""}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={productsLoading || (totalPages !== undefined && currentPage + 1 >= totalPages)}
        >
          Next
        </Button>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={size}
          onChange={(event) => {
            const nextSize = Number(event.target.value) || 10
            onPageSizeChange(nextSize)
          }}
          disabled={productsLoading}
        >
          {[5, 10, 12, 20, 30].map((option) => (
            <option key={option} value={option}>
              {option}/page
            </option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={onReload} disabled={productsLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload
        </Button>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      {rowActionError && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{rowActionError}</AlertDescription>
        </Alert>
      )}
      {productsLoading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading products...
        </div>
      ) : productsError ? (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{productsError}</AlertDescription>
        </Alert>
      ) : products.length === 0 ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <PackageSearch className="h-4 w-4" />
          No products available.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Inventory</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const isRowLoading = rowActionLoadingId === product.id
              const { inStock, statusLabel, nextStatus } = getProductStatusMeta(product)
              const effectivePrice = product.finalPrice ?? product.price

              return (
                <TableRow key={product.id ?? product.sku}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{product.name}</span>
                        {product.isNew && <Badge>New</Badge>}
                        {product.isFeatured && <Badge variant="secondary">Featured</Badge>}
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>SKU: {product.sku}</span>
                        {product.brand ? <span>| Brand: {product.brand}</span> : null}
                        {product.category?.name ? <span>| {product.category.name}</span> : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="font-semibold text-foreground">{formatCurrency(effectivePrice)}</span>
                      {product.discountPercent > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(product.price)} (-{product.discountPercent}%)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <Badge variant="outline" className="w-fit">
                        {statusLabel}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {inStock ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            In stock
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            Out of stock
                          </>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-semibold">{product.availableQuantity}</div>
                    <div className="text-xs text-muted-foreground">ID: {product.id ?? "-"}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(product)}
                        disabled={isRowLoading || formDisabled}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateStatus(product, nextStatus)}
                        disabled={isRowLoading || formDisabled}
                      >
                        {isRowLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : nextStatus === "ACTIVE" ? (
                          "Activate"
                        ) : (
                          "Deactivate"
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(product)}
                        disabled={isRowLoading || formDisabled}
                      >
                        {isRowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
)

type InventoryOverviewCardProps = {
  productsLoading: boolean
  productsError: string | null
  products: Product[]
  totalItems: number
  currentPage: number
  totalPages?: number
  onRefresh: () => void
}

const InventoryOverviewCard = ({
  productsLoading,
  productsError,
  products,
  totalItems,
  currentPage,
  totalPages,
  onRefresh,
}: InventoryOverviewCardProps) => (
  <Card className="border-primary/10 shadow-sm">
    <CardHeader>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        <TrendingUp className="h-4 w-4" />
        Inventory health
      </p>
      <CardTitle className="text-xl">Live catalog overview</CardTitle>
      <CardDescription>Monitor the items currently available in your store.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {productsError && (
        <Alert variant="destructive">
          <AlertDescription>{productsError}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs text-muted-foreground">Total items</p>
          <p className="text-2xl font-bold">{totalItems || 0}</p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs text-muted-foreground">Current page</p>
          <p className="text-2xl font-bold">
            {currentPage + 1}
            {totalPages ? ` / ${totalPages}` : ""}
          </p>
        </div>
      </div>
      <div className="space-y-2 rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Last refresh</span>
          </div>
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={productsLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Data is fetched directly from <code>/api/products/all-product</code> with your admin token.
        </p>
      </div>
      {!productsError && !productsLoading && products.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PackageSearch className="h-4 w-4" />
          No products found for the current filters.
        </div>
      ) : null}
    </CardContent>
  </Card>
)

type FiltersCardProps = {
  filters: ProductFilters
  productsLoading: boolean
  onApply: () => void
  onReset: () => void
  onChange: FilterChangeHandler
}

const FiltersCard = ({ filters, productsLoading, onApply, onReset, onChange }: FiltersCardProps) => {
  const handleInputChange =
    (field: keyof ProductFilters) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(field, event.target.value)

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Tag className="h-4 w-4" />
            Filters
          </p>
          <CardTitle className="text-lg">Search and refine</CardTitle>
          <CardDescription>Filter the catalog by status, brand, or novelty.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReset} disabled={productsLoading}>
            Reset
          </Button>
          <Button size="sm" onClick={onApply} disabled={productsLoading}>
            Apply filters
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-2 space-y-2">
          <Label htmlFor="keyword">Keyword</Label>
          <Input
            id="keyword"
            placeholder="Search by name or description"
            value={filters.keyword}
            onChange={handleInputChange("keyword")}
            disabled={productsLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandFilter">Brand</Label>
          <Input
            id="brandFilter"
            placeholder="KeyMaster"
            value={filters.brand}
            onChange={handleInputChange("brand")}
            disabled={productsLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="statusFilter">Status</Label>
          <select
            id="statusFilter"
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={filters.status}
            onChange={handleInputChange("status")}
            disabled={productsLoading}
          >
            <option value="">Any</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-4 shadow-sm">
          <div className="space-y-1">
            <Label htmlFor="filterFeatured">Featured</Label>
            <p className="text-xs text-muted-foreground">Show featured products only</p>
          </div>
          <Switch
            id="filterFeatured"
            checked={filters.isFeatured}
            onCheckedChange={(checked) => onChange("isFeatured", checked)}
            disabled={productsLoading}
          />
        </div>
        <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-4 shadow-sm">
          <div className="space-y-1">
            <Label htmlFor="filterNew">New</Label>
            <p className="text-xs text-muted-foreground">Show only new arrivals</p>
          </div>
          <Switch
            id="filterNew"
            checked={filters.isNew}
            onCheckedChange={(checked) => onChange("isNew", checked)}
            disabled={productsLoading}
          />
        </div>
      </CardContent>
    </Card>
  )
}
