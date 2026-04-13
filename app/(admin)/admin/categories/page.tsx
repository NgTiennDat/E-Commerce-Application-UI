
"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Folder,
  FolderPlus,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
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
import { hasAdminAccess } from "@/lib/auth-session"
import { clearAuthSession, readStoredUser } from "@/lib/client-auth"

type Category = {
  id?: number
  name: string
  slug?: string
  description?: string
  isActive?: boolean
  parentId?: number | null
  hasChildren?: boolean
  createdAt?: string
  updatedAt?: string
}

type CategoryMeta = {
  page?: number
  size?: number
  pages?: number
  total?: number
}

type CategoryFilters = {
  keyword: string
  isActive: string
  parentId: string
  hasChildren: boolean
}

type CategoryFormState = {
  name: string
  slug: string
  description: string
  parentId: string
  isActive: boolean
}

type UserInfo = {
  username?: string
  fullName?: string
  roles?: string[]
}

const defaultFilters: CategoryFilters = {
  keyword: "",
  isActive: "",
  parentId: "",
  hasChildren: false,
}

const defaultFormState: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  isActive: true,
}

export default function CategoryAdminPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [meta, setMeta] = useState<CategoryMeta>({})
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [filters, setFilters] = useState<CategoryFilters>(defaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<CategoryFilters>(defaultFilters)

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formState, setFormState] = useState<CategoryFormState>(defaultFormState)

  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [rowActionLoadingId, setRowActionLoadingId] = useState<number | null>(null)
  const [rowActionError, setRowActionError] = useState<string | null>(null)

  const displayName = user?.fullName || user?.username || "Admin"
  const isAdmin = hasAdminAccess(user?.roles)

  const totalItems = meta.total !== undefined ? Number(meta.total) : categories.length
  const totalPages =
    meta.pages !== undefined
      ? Number(meta.pages)
      : totalItems && size
        ? Math.max(1, Math.ceil(totalItems / size))
        : undefined
  const currentPage = meta.page !== undefined ? Number(meta.page) : page

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    const storedUser = readStoredUser() as UserInfo | null

    if (!storedToken || !storedUser) {
      clearAuthSession()
      router.push("/")
      return
    }

    setToken(storedToken)
    setUser(storedUser)

    if (!hasAdminAccess(storedUser.roles)) {
      router.push("/")
    }
  }, [router])
  const fetchCategories = useCallback(async () => {
    if (!token) return
    setListLoading(true)
    setListError(null)

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
      addIfPresent("isActive", appliedFilters.isActive)
      addIfPresent("parentId", appliedFilters.parentId.trim())
      if (appliedFilters.hasChildren) addIfPresent("hasChildren", true)

      const response = await fetch(`/api/categories?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      const json = await response.json()

      if (!response.ok) {
        setListError(json?.message || "Failed to load categories")
        setCategories([])
        return
      }

      setCategories(json.categories ?? [])
      setMeta(json.meta ?? {})

      if (!selectedCategory && (json.categories ?? []).length > 0) {
        setSelectedCategory(json.categories[0])
      }
    } catch (error) {
      setListError("An error occurred while loading categories")
    } finally {
      setListLoading(false)
    }
  }, [appliedFilters, page, size, token, selectedCategory])

  useEffect(() => {
    if (!token) return
    fetchCategories()
  }, [fetchCategories, token])

  const fetchCategoryDetail = useCallback(
    async (categoryId: number) => {
      if (!token) return
      try {
        const response = await fetch(`/api/categories/${categoryId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })
        const json = await response.json()
        if (!response.ok) {
          setRowActionError(json?.message || "Failed to load category detail")
          return
        }
        setSelectedCategory(json.category ?? json.data ?? null)
      } catch (error) {
        setRowActionError("An error occurred while loading category detail")
      }
    },
    [token],
  )

  const resetForm = () => {
    setEditingCategory(null)
    setFormState(defaultFormState)
    setFormError(null)
    setFormSuccess(null)
  }
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!formState.name.trim()) {
      setFormError("Name is required")
      return
    }
    if (!formState.slug.trim()) {
      setFormError("Slug is required")
      return
    }
    if (!token) {
      setFormError("Missing auth token")
      router.push("/")
      return
    }

    setFormLoading(true)

    const payload = {
      name: formState.name.trim(),
      slug: formState.slug.trim(),
      description: formState.description.trim(),
      parentId: formState.parentId.trim() ? Number(formState.parentId) : null,
      isActive: formState.isActive,
    }

    const isEditing = Boolean(editingCategory?.id)
    const endpoint = isEditing ? `/api/admin/categories/${editingCategory?.id}` : "/api/admin/categories"
    const method = isEditing ? "PATCH" : "POST"

    try {
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
        setFormError(json?.message || (isEditing ? "Failed to update category" : "Failed to create category"))
        return
      }

      setFormSuccess(isEditing ? "Category updated successfully" : "Category created successfully")
      resetForm()
      setPage(0)
      fetchCategories()
    } catch (error) {
      setFormError(isEditing ? "An error occurred while updating category" : "An error occurred while creating category")
    } finally {
      setFormLoading(false)
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

  const handleToggleStatus = async (category: Category) => {
    if (!token || !category.id) return
    setRowActionError(null)
    setRowActionLoadingId(category.id)
    try {
      const response = await fetch(`/api/admin/categories/${category.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !category.isActive }),
      })
      const json = await response.json()
      if (!response.ok) {
        setRowActionError(json?.message || "Failed to update status")
        return
      }
      fetchCategories()
      if (selectedCategory?.id === category.id) {
        fetchCategoryDetail(category.id)
      }
    } catch (error) {
      setRowActionError("An error occurred while updating status")
    } finally {
      setRowActionLoadingId(null)
    }
  }

  const handleDelete = async (category: Category) => {
    if (!token || !category.id) return
    if (!window.confirm(`Delete category "${category.name}"?`)) return
    setRowActionError(null)
    setRowActionLoadingId(category.id)
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = await response.json()
      if (!response.ok) {
        setRowActionError(json?.message || "Failed to delete category")
        return
      }
      if (selectedCategory?.id === category.id) {
        setSelectedCategory(null)
      }
      resetForm()
      fetchCategories()
    } catch (error) {
      setRowActionError("An error occurred while deleting category")
    } finally {
      setRowActionLoadingId(null)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormState({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      parentId: category.parentId != null ? String(category.parentId) : "",
      isActive: category.isActive !== undefined ? Boolean(category.isActive) : true,
    })
    setFormError(null)
    setFormSuccess(null)
  }

  const activeCount = useMemo(
    () => categories.filter((c) => c.isActive).length,
    [categories],
  )
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin</p>
              <h1 className="text-lg font-bold">Category Management</h1>
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
              <Link href="/admin/products">Products</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/shop">View shop</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {!isAdmin && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You do not have permission to manage categories. Redirecting to login...</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    <FolderPlus className="h-4 w-4" />
                    {editingCategory ? "Edit category" : "Create category"}
                  </p>
                  <CardTitle className="text-2xl">
                    {editingCategory ? `Editing ${editingCategory.name ?? editingCategory.slug}` : "Add a new category"}
                  </CardTitle>
                  <CardDescription>
                    {editingCategory ? "Update the fields and save changes." : "Fill in the fields below to create a category."}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="inline-flex items-center gap-1 self-start">
                  <BadgeCheck className="h-4 w-4" />
                  Live sync
                </Badge>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formState.name}
                      onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Electronics"
                      disabled={formLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formState.slug}
                      onChange={(e) => setFormState((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="electronics"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formState.description}
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Short description for this category"
                    rows={3}
                    disabled={formLoading}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="parentId">Parent ID (optional)</Label>
                    <Input
                      id="parentId"
                      value={formState.parentId}
                      onChange={(e) => setFormState((prev) => ({ ...prev, parentId: e.target.value }))}
                      placeholder="e.g. 12"
                      disabled={formLoading}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-4 shadow-sm">
                    <div>
                      <Label htmlFor="isActive">Active</Label>
                      <p className="text-xs text-muted-foreground">Toggle availability for customers</p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formState.isActive}
                      onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isActive: checked }))}
                      disabled={formLoading}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4 text-primary" />
                  Active categories: <span className="font-semibold text-foreground">{activeCount}</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={formLoading}>
                    {editingCategory ? "Cancel edit" : "Reset form"}
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingCategory ? "Saving..." : "Creating..."}
                      </>
                    ) : editingCategory ? (
                      "Save changes"
                    ) : (
                      "Create category"
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
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Folder className="h-4 w-4" />
                Category detail
              </p>
              <CardTitle className="text-xl">Selected category</CardTitle>
              <CardDescription>View the latest info for the selected category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rowActionError && (
                <Alert variant="destructive">
                  <AlertDescription>{rowActionError}</AlertDescription>
                </Alert>
              )}
              {!selectedCategory ? (
                <p className="text-sm text-muted-foreground">Select a category from the table to view details.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Name:</span>
                    <span>{selectedCategory.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Slug:</span>
                    <span className="text-muted-foreground">{selectedCategory.slug}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">Description:</span>
                    <span className="text-muted-foreground">
                      {selectedCategory.description || "No description provided."}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Parent ID:</span>
                    <span>{selectedCategory.parentId ?? "None"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Has children:</span>
                    <Badge variant="outline">{selectedCategory.hasChildren ? "Yes" : "No"}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Status:</span>
                    <Badge variant={selectedCategory.isActive ? "secondary" : "destructive"}>
                      {selectedCategory.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated: {selectedCategory.updatedAt ? new Date(selectedCategory.updatedAt).toLocaleString() : "N/A"}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectedCategory.id && fetchCategoryDetail(selectedCategory.id)}
                    disabled={rowActionLoadingId === selectedCategory.id}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh detail
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Tag className="h-4 w-4" />
                Filters
              </p>
              <CardTitle className="text-lg">Search and refine</CardTitle>
              <CardDescription>Filter categories by status or hierarchy.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleResetFilters} disabled={listLoading}>
                Reset
              </Button>
              <Button size="sm" onClick={handleApplyFilters} disabled={listLoading}>
                Apply filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                placeholder="Search by name or slug"
                value={filters.keyword}
                onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                disabled={listLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <select
                id="statusFilter"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={filters.isActive}
                onChange={(e) => setFilters((prev) => ({ ...prev, isActive: e.target.value }))}
                disabled={listLoading}
              >
                <option value="">Any</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentFilter">Parent ID</Label>
              <Input
                id="parentFilter"
                placeholder="e.g. 10"
                value={filters.parentId}
                onChange={(e) => setFilters((prev) => ({ ...prev, parentId: e.target.value }))}
                disabled={listLoading}
              />
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-4 shadow-sm">
              <div className="space-y-1">
                <Label htmlFor="hasChildren">Has children</Label>
                <p className="text-xs text-muted-foreground">Show only categories with children</p>
              </div>
              <Switch
                id="hasChildren"
                checked={filters.hasChildren}
                onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, hasChildren: checked }))}
                disabled={listLoading}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Folder className="h-4 w-4" />
                Categories
              </p>
              <CardTitle className="text-lg">Catalog structure</CardTitle>
              <CardDescription>Manage categories through the proxy APIs.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={listLoading || currentPage <= 0}
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
                onClick={() => goToPage(currentPage + 1)}
                disabled={listLoading || (totalPages !== undefined && currentPage + 1 >= totalPages)}
              >
                Next
              </Button>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={size}
                onChange={(event) => {
                  const nextSize = Number(event.target.value) || 10
                  setSize(nextSize)
                  setPage(0)
                }}
                disabled={listLoading}
              >
                {[5, 10, 15, 20].map((option) => (
                  <option key={option} value={option}>
                    {option}/page
                  </option>
                ))}
              </select>
              <Button variant="ghost" size="sm" onClick={fetchCategories} disabled={listLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {listError && (
              <Alert variant="destructive" className="m-4">
                <AlertDescription>{listError}</AlertDescription>
              </Alert>
            )}
            {listLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                No categories found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name & Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => {
                    const isRowLoading = rowActionLoadingId === category.id
                    return (
                      <TableRow
                        key={category.id ?? category.slug}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedCategory(category)
                          if (category.id) {
                            fetchCategoryDetail(category.id)
                          }
                        }}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{category.name}</span>
                              {category.hasChildren && <Badge variant="outline">Has children</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">/{category.slug}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.isActive ? "secondary" : "destructive"}>
                            {category.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {category.parentId != null ? (
                            <Badge variant="outline">Parent #{category.parentId}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Root</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {category.updatedAt ? new Date(category.updatedAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(category)
                              }}
                              disabled={isRowLoading}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleStatus(category)
                              }}
                              disabled={isRowLoading}
                            >
                              {isRowLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : category.isActive ? (
                                <>
                                  <ToggleLeft className="mr-1 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="mr-1 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(category)
                              }}
                              disabled={isRowLoading}
                            >
                              {isRowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
      </main>
    </div>
  )
}
