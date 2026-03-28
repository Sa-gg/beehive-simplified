import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Badge } from '../../components/common/ui/badge'
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X,
  Package,
  Grid3x3,
  List,
  Loader2,
  Star,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Layers,
  AlertTriangle,
  Book
} from 'lucide-react'
import { VariantsAddonsManager } from '../../components/features/Admin/VariantsAddonsManager'
import { RecipeEditorModal } from '../../components/features/Admin/RecipeEditorModal'
import { ProductFormModal } from '../../components/features/Admin/ProductFormModal'
import { CategoryModal } from '../../components/features/Admin/CategoryModal'
import { menuItemsApi } from '../../../infrastructure/api/menuItems.api'
import type { MenuItemDTO } from '../../../infrastructure/api/menuItems.api'
import { categoriesApi } from '../../../infrastructure/api/categories.api'
import type { CategoryDTO } from '../../../infrastructure/api/categories.api'
import { recipeApi } from '../../../infrastructure/api/recipe.api'
import { inventoryApi } from '../../../infrastructure/api/inventory.api'
import type { InventoryItemDTO } from '../../../infrastructure/api/inventory.api'
import { ConfirmationModal } from '../../components/common/ConfirmationModal'
import { toast } from '../../components/common/ToastNotification'
import type { MenuItemType } from '../../../infrastructure/api/menuItems.api'

interface Product {
  id: string
  name: string
  categoryId: string
  category?: {
    id: string
    name: string
    displayName: string
  }
  price: number
  cost: number | null
  image: string | null
  description: string | null
  available: boolean
  featured: boolean
  prepTime: number | null
  itemType: MenuItemType
  showInMenu: boolean
  outOfStock: boolean  // Ingredients ran out
  archived: boolean    // Soft deleted
  createdAt: string
  updatedAt: string
}


export const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [maxServings, setMaxServings] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'out-of-stock' | 'needs-attention'>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all')
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'BASE' | 'ADDON' | 'DRINK'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Batch selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDTO[]>([])
  const [selectedIngredient, setSelectedIngredient] = useState<string>('')
  const [loadingIngredientProducts, setLoadingIngredientProducts] = useState(false)
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('')
  const [ingredientStatusFilter, setIngredientStatusFilter] = useState<'all' | 'DISCREPANCY' | 'OUT_OF_STOCK' | 'LOW_STOCK'>('all')
  const [selectedIngredientProducts, setSelectedIngredientProducts] = useState<Product[]>([])
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false)
  
  // Category management modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  
  // Variants & Add-ons modal state
  const [variantsAddonsProduct, setVariantsAddonsProduct] = useState<Product | null>(null)

  // Recipe/Components editor modal state
  const [recipeStats, setRecipeStats] = useState<Map<string, number>>(new Map())
  const [recipeFilter, setRecipeFilter] = useState<'all' | 'with-recipe' | 'no-recipe'>('all')
  const [selectedMenuItemForRecipe, setSelectedMenuItemForRecipe] = useState<{ id: string; name: string } | null>(null)
  const [showRecipeEditor, setShowRecipeEditor] = useState(false)
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null)

  // Helper function to get category display name
  const getCategoryDisplayName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId)
    return cat?.displayName || cat?.name || categoryId
  }

  // Helper function
  const getProfitMargin = (product: Product) => {
    const cost = product.cost ?? 0
    if (cost === 0) return '0'
    return ((product.price - cost) / product.price * 100).toFixed(1)
  }

  // Helper function to get full image URL
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    return `${API_BASE_URL}${imagePath}`
  }

  // Handle URL query parameter for filter
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Set filter from URL on mount
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam === 'needs-attention') {
      setStockFilter('needs-attention')
      // Clear the query param after reading
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  // Fetch products, categories and max servings on mount
  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchMaxServings()
  }, [])

  const fetchMaxServings = async () => {
    try {
      const servingsData = await recipeApi.getAllMaxServings()
      setMaxServings(servingsData)
    } catch (error) {
      console.error('Failed to fetch max servings:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const response = await categoriesApi.getAll(true) // Include inactive for management
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await menuItemsApi.getAll()
      // Map response to Product interface
      const mappedProducts: Product[] = response.data.map((item: MenuItemDTO) => ({
        ...item,
        categoryId: item.categoryId,
        category: item.category,
        showInMenu: item.showInMenu ?? false,
        outOfStock: item.outOfStock ?? false,
        archived: item.archived ?? false
      }))
      setProducts(mappedProducts)
      
      // Load recipe counts for all items (for Components feature)
      const stats = new Map<string, number>()
      await Promise.all(
        mappedProducts.map(async (item) => {
          try {
            const recipe = await recipeApi.getRecipe(item.id)
            stats.set(item.id, recipe.length)
          } catch {
            stats.set(item.id, 0)
          }
        })
      )
      setRecipeStats(stats)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Failed to load products', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleDeleteClick = (id: string, name: string) => {
    setProductToDelete({ id, name })
    setShowDeleteModal(true)
  }
  
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return

    try {
      await menuItemsApi.delete(productToDelete.id)
      toast.success('Product deleted successfully!')
      await fetchProducts()
    } catch (error) {
      console.error('Failed to delete product:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to delete product', err.response?.data?.message || 'Please try again.')
    } finally {
      setShowDeleteModal(false)
      setProductToDelete(null)
    }
  }

  const toggleAvailability = async (id: string) => {
    try {
      const response = await menuItemsApi.toggleAvailability(id)
      const product = response.data
      // Update local state instead of re-fetching to prevent animation
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, available: product.available } : p
      ))
      toast.success(product.available ? 'Product added to sale' : 'Product removed from sale')
    } catch (error) {
      console.error('Failed to toggle availability:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update product', err.response?.data?.message || 'Please try again.')
    }
  }
  // Silence unused warning - utility function for availability toggle
  void toggleAvailability

  const toggleOutOfStock = async (id: string) => {
    try {
      const response = await menuItemsApi.toggleOutOfStock(id)
      const product = response.data
      // Update local state instead of re-fetching to prevent animation
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, outOfStock: product.outOfStock ?? false } : p
      ))
      toast.success(product.outOfStock ? 'Product marked as out of stock' : 'Product marked as in stock')
    } catch (error) {
      console.error('Failed to toggle out of stock:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update product', err.response?.data?.message || 'Please try again.')
    }
  }

  const toggleFeatured = async (id: string) => {
    try {
      const response = await menuItemsApi.toggleFeatured(id)
      const product = response.data
      // Update local state instead of re-fetching to prevent animation
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, featured: product.featured } : p
      ))
    } catch (error) {
      console.error('Failed to toggle featured:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update product', err.response?.data?.message || 'Please try again.')
    }
  }

  // Batch selection handlers
  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAllProducts = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const clearSelection = () => {
    setSelectedProducts(new Set())
    setSelectedIngredient('')
    setSelectedIngredientProducts([])
    setIsSelectionMode(false)
    setIngredientSearchQuery('')
  }

  // Ref for dropdown click outside handling
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIngredientDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch inventory items when selection mode is enabled
  useEffect(() => {
    if (isSelectionMode && inventoryItems.length === 0) {
      inventoryApi.getAll({ category: 'INGREDIENTS' }).then(items => {
        setInventoryItems(items)
      }).catch(err => {
        console.error('Failed to fetch inventory items:', err)
      })
    }
  }, [isSelectionMode, inventoryItems.length])

  // Memoized filter inventory items based on search and status filter
  // Sort: OUT_OF_STOCK items first, then LOW_STOCK, then IN_STOCK
  const filteredInventoryItems = useMemo(() => {
    const searchLower = ingredientSearchQuery.toLowerCase()
    const filtered = inventoryItems.filter(item => {
      const matchesSearch = !searchLower || item.name.toLowerCase().includes(searchLower)
      const matchesStatus = ingredientStatusFilter === 'all' || item.status === ingredientStatusFilter
      return matchesSearch && matchesStatus
    })
    
    // Sort: DISCREPANCY first, then OUT_OF_STOCK, then LOW_STOCK, then IN_STOCK
    return filtered.sort((a, b) => {
      const statusOrder: Record<string, number> = {
        'DISCREPANCY': 0,
        'OUT_OF_STOCK': 1,
        'LOW_STOCK': 2,
        'IN_STOCK': 3
      }
      return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
    })
  }, [inventoryItems, ingredientSearchQuery, ingredientStatusFilter])

  // Handle ingredient selection to auto-select products using that ingredient
  const handleIngredientSelect = async (inventoryItemId: string) => {
    setSelectedIngredient(inventoryItemId)
    if (!inventoryItemId) {
      setSelectedIngredientProducts([])
      return
    }
    
    try {
      setLoadingIngredientProducts(true)
      const menuItems = await recipeApi.getMenuItemsUsingIngredient(inventoryItemId)
      if (menuItems && menuItems.length > 0) {
        const menuItemIds = menuItems.map((item: { id: string }) => item.id)
        setSelectedProducts(new Set(menuItemIds))
        // Store the product details for display
        const matchingProducts = products.filter(p => menuItemIds.includes(p.id))
        setSelectedIngredientProducts(matchingProducts)
        const ingredientName = inventoryItems.find(i => i.id === inventoryItemId)?.name || 'ingredient'
        toast.success(
          `Selected ${menuItems.length} products using ${ingredientName}`,
          'Ready to mark as out of stock'
        )
      } else {
        setSelectedIngredientProducts([])
        toast.info('No products found', 'No products use this ingredient in their recipe')
      }
    } catch (error) {
      console.error('Failed to find products by ingredient:', error)
      toast.error('Failed to find products', 'Could not find products using this ingredient')
    } finally {
      setLoadingIngredientProducts(false)
    }
  }

  const handleBatchOutOfStock = async (outOfStock: boolean) => {
    if (selectedProducts.size === 0) return
    
    try {
      await menuItemsApi.bulkUpdateOutOfStock(Array.from(selectedProducts), outOfStock)
      // Update local state
      setProducts(prev => prev.map(p => 
        selectedProducts.has(p.id) ? { ...p, outOfStock } : p
      ))
      toast.success(
        outOfStock 
          ? `${selectedProducts.size} products marked as out of stock` 
          : `${selectedProducts.size} products marked as in stock`
      )
      clearSelection()
    } catch (error) {
      console.error('Failed to batch update:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update products', err.response?.data?.message || 'Please try again.')
    }
  }

  const handleBatchAvailability = async (available: boolean) => {
    if (selectedProducts.size === 0) return
    
    try {
      // Update each product's availability
      await Promise.all(
        Array.from(selectedProducts).map(id => 
          menuItemsApi.update(id, { available })
        )
      )
      // Update local state
      setProducts(prev => prev.map(p => 
        selectedProducts.has(p.id) ? { ...p, available } : p
      ))
      toast.success(
        available 
          ? `${selectedProducts.size} products marked as available` 
          : `${selectedProducts.size} products marked as unavailable`
      )
      clearSelection()
    } catch (error) {
      console.error('Failed to batch update:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to update products', err.response?.data?.message || 'Please try again.')
    }
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
    
    // Stock filter logic - includes needs-attention (marked out of stock but has available stock, OR available but has no stock)
    let matchesStock = true
    if (stockFilter === 'in-stock') {
      matchesStock = !product.outOfStock
    } else if (stockFilter === 'out-of-stock') {
      matchesStock = product.outOfStock
    } else if (stockFilter === 'needs-attention') {
      // Products that need attention:
      // 1. Marked as out of stock but actually have stock available (>= 1)
      // 2. NOT marked as out of stock but have 0 or negative stock (potential discrepancy)
      const availableServings = maxServings[product.id]
      const markedOutButHasStock = product.outOfStock && availableServings !== undefined && availableServings >= 1
      const availableButNoStock = !product.outOfStock && availableServings !== undefined && availableServings <= 0
      matchesStock = markedOutButHasStock || availableButNoStock
    }
    
    const matchesAvailability = availabilityFilter === 'all' || 
                                (availabilityFilter === 'available' && product.available) ||
                                (availabilityFilter === 'unavailable' && !product.available)
    const matchesItemType = itemTypeFilter === 'all' || product.itemType === itemTypeFilter
    // When an ingredient is selected, only show products using that ingredient
    const matchesIngredient = !selectedIngredient || selectedIngredientProducts.some(p => p.id === product.id)
    
    // Recipe filter logic
    let matchesRecipe = true
    if (recipeFilter === 'with-recipe') {
      matchesRecipe = (recipeStats.get(product.id) || 0) > 0
    } else if (recipeFilter === 'no-recipe') {
      matchesRecipe = (recipeStats.get(product.id) || 0) === 0
    }
    
    return matchesSearch && matchesCategory && matchesStock && matchesAvailability && matchesItemType && matchesIngredient && matchesRecipe
  })

  // Calculate statistics
  const totalProducts = products.length
  const availableProducts = products.filter(p => p.available).length
  const unavailableProducts = products.filter(p => !p.available).length
  const inStockProducts = products.filter(p => !p.outOfStock).length
  const outOfStockProducts = products.filter(p => p.outOfStock).length
  const featuredProducts = products.filter(p => p.featured).length
  
  // Recipe statistics
  const configuredRecipeProducts = products.filter(p => (recipeStats.get(p.id) || 0) > 0).length
  const notConfiguredRecipeProducts = products.length - configuredRecipeProducts
  
  // Silence unused warnings - these are useful metrics available for future use
  void unavailableProducts
  void featuredProducts
  void notConfiguredRecipeProducts
  
  // Products needing attention:
  // 1. Marked out of stock but have stock available
  // 2. NOT marked out of stock but have 0 or negative stock (potential discrepancy)
  const needsAttentionProducts = products.filter(p => {
    const availableServings = maxServings[p.id]
    if (availableServings === undefined) return false
    const markedOutButHasStock = p.outOfStock && availableServings >= 1
    const availableButNoStock = !p.outOfStock && availableServings <= 0
    return markedOutButHasStock || availableButNoStock
  }).length

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your menu items and inventory</p>
          </div>
          <Button 
            onClick={() => {
              setEditingProduct(null)
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2"
            style={{ backgroundColor: '#F9C900', color: '#000000' }}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Statistics Cards - Updated to match InventoryPage design */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-5 border border-blue-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Items</p>
            <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalProducts}</p>
            <p className="text-xs text-gray-400 mt-2">in catalog</p>
          </div>

          {/* In Stock Card */}
          <div 
            className={`rounded-2xl shadow-sm p-5 border cursor-pointer transition-all duration-300 group ${
              stockFilter === 'in-stock' 
                ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-300 ring-2 ring-green-200' 
                : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 hover:shadow-lg'
            }`}
            onClick={() => setStockFilter(stockFilter === 'in-stock' ? 'all' : 'in-stock')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">In Stock</p>
            <p className="text-xl lg:text-2xl font-bold text-green-600">{inStockProducts}</p>
            <p className="text-xs text-gray-400 mt-2">ready for orders</p>
          </div>

          {/* Out of Stock Card */}
          <div 
            className={`rounded-2xl shadow-sm p-5 border cursor-pointer transition-all duration-300 group ${
              stockFilter === 'out-of-stock' 
                ? 'bg-gradient-to-br from-red-100 to-rose-100 border-red-300 ring-2 ring-red-200' 
                : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100 hover:shadow-lg'
            }`}
            onClick={() => setStockFilter(stockFilter === 'out-of-stock' ? 'all' : 'out-of-stock')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-red-100 rounded-xl group-hover:scale-110 transition-transform">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Out of Stock</p>
            <p className="text-xl lg:text-2xl font-bold text-red-600">{outOfStockProducts}</p>
            <p className="text-xs text-gray-400 mt-2">marked by staff</p>
          </div>

          {/* Needs Attention Card */}
          <div 
            className={`rounded-2xl shadow-sm p-5 border cursor-pointer transition-all duration-300 group relative ${
              stockFilter === 'needs-attention' 
                ? 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-400 ring-2 ring-amber-300' 
                : needsAttentionProducts > 0
                  ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 hover:shadow-lg animate-pulse'
                  : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100 hover:shadow-lg'
            }`}
            onClick={() => setStockFilter(stockFilter === 'needs-attention' ? 'all' : 'needs-attention')}
          >
            {needsAttentionProducts > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                !
              </span>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Needs Attention</p>
            <p className="text-xl lg:text-2xl font-bold text-amber-600">{needsAttentionProducts}</p>
            <p className="text-xs text-gray-400 mt-2">stock available</p>
          </div>

          {/* On Sale Card - Manager decision to include in menu */}
          <div 
            className={`rounded-2xl shadow-sm p-5 border cursor-pointer transition-all duration-300 group ${
              availabilityFilter === 'available' 
                ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-amber-300 ring-2 ring-amber-200' 
                : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 hover:shadow-lg'
            }`}
            onClick={() => setAvailabilityFilter(availabilityFilter === 'available' ? 'all' : 'available')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">On Sale</p>
            <p className="text-xl lg:text-2xl font-bold text-amber-600">{availableProducts}</p>
            <p className="text-xs text-gray-400 mt-2">included in menu</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4">
            {/* Row 1: Search, Category, Type */}
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              {/* Search */}
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white min-w-[140px]"
              >
                <option value="all">All Categories</option>
                {categories.filter(cat => cat.isActive).map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName}
                  </option>
                ))}
              </select>

              {/* Item Type Filter */}
              <select
                value={itemTypeFilter}
                onChange={(e) => setItemTypeFilter(e.target.value as 'all' | 'BASE' | 'ADDON' | 'DRINK')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white min-w-[120px]"
              >
                <option value="all">All Types</option>
                <option value="BASE">Base Items</option>
                <option value="ADDON">Add-ons</option>
                <option value="DRINK">Drinks</option>
              </select>
            </div>

            {/* Row 2: Filter buttons - wrappable */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 mr-1">Stock:</span>
                <Button
                  variant={stockFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('all')}
                  className="h-7 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  variant={stockFilter === 'in-stock' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('in-stock')}
                  className={`h-7 px-2 text-xs ${stockFilter === 'in-stock' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Available
                </Button>
                <Button
                  variant={stockFilter === 'out-of-stock' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('out-of-stock')}
                  className={`h-7 px-2 text-xs ${stockFilter === 'out-of-stock' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Out
                </Button>
                <Button
                  variant={stockFilter === 'needs-attention' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStockFilter('needs-attention')}
                  className={`h-7 px-2 text-xs relative ${stockFilter === 'needs-attention' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Attention
                  {needsAttentionProducts > 0 && stockFilter !== 'needs-attention' && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {needsAttentionProducts > 9 ? '9+' : needsAttentionProducts}
                    </span>
                  )}
                </Button>

              {/* For Sale Filters - Manager decision to include in sale */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Sale:</span>
                <Button
                  variant={availabilityFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAvailabilityFilter('all')}
                  className="h-7 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  variant={availabilityFilter === 'available' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAvailabilityFilter('available')}
                  className={`h-7 px-2 text-xs ${availabilityFilter === 'available' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                >
                  On Sale
                </Button>
                <Button
                  variant={availabilityFilter === 'unavailable' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAvailabilityFilter('unavailable')}
                  className={`h-7 px-2 text-xs ${availabilityFilter === 'unavailable' ? 'bg-gray-500 hover:bg-gray-600' : ''}`}
                >
                  Off Sale
                </Button>
              </div>

              {/* Recipe Filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Recipe:</span>
                <Button
                  variant={recipeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecipeFilter('all')}
                  className="h-7 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  variant={recipeFilter === 'with-recipe' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecipeFilter('with-recipe')}
                  className={`h-7 px-2 text-xs ${recipeFilter === 'with-recipe' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                >
                  <Book className="h-3 w-3 mr-1" />
                  Configured
                </Button>
                <Button
                  variant={recipeFilter === 'no-recipe' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecipeFilter('no-recipe')}
                  className={`h-7 px-2 text-xs ${recipeFilter === 'no-recipe' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                >
                  <Book className="h-3 w-3 mr-1" />
                  Not Configured
                </Button>
              </div>

              {/* Selection Mode Toggle */}
              <Button
                variant={isSelectionMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode)
                  if (isSelectionMode) clearSelection()
                }}
                className={isSelectionMode ? 'bg-amber-500 hover:bg-amber-600' : ''}
              >
                <Layers className="h-4 w-4 mr-1" />
                {isSelectionMode ? 'Cancel' : 'Select'}
              </Button>

              {/* View Mode Toggle */}
              <div className="flex gap-1 ml-auto">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                  size="sm"
                  className="h-7 px-2"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  size="sm"
                  className="h-7 px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Batch Action Bar */}
        {isSelectionMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            {/* Row 1: Selection controls + Quick Select by Ingredient */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Selection controls */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllProducts}
                  className="bg-white"
                >
                  {selectedProducts.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm font-medium text-amber-800">
                  {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                </span>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-amber-300 hidden sm:block" />
              
              {/* Ingredient selector - compact */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-gray-600 hidden sm:inline">By Ingredient:</span>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <div 
                    className={`flex items-center h-8 px-2.5 text-sm border rounded-md bg-white cursor-pointer transition-colors min-w-[180px] ${
                      ingredientDropdownOpen ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setIngredientDropdownOpen(!ingredientDropdownOpen)}
                  >
                    {loadingIngredientProducts ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600 mr-2" />
                    ) : null}
                    <span className={`flex-1 truncate text-xs ${selectedIngredient ? 'text-gray-900' : 'text-gray-500'}`}>
                      {selectedIngredient ? (
                        (() => {
                          const item = inventoryItems.find(i => i.id === selectedIngredient)
                          if (!item) return 'Select...'
                          return (
                            <span className="flex items-center gap-1.5">
                              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                item.status === 'OUT_OF_STOCK' ? 'bg-red-500' : 
                                item.status === 'LOW_STOCK' ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                              <span className="truncate">{item.name}</span>
                            </span>
                          )
                        })()
                      ) : 'Select ingredient...'}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 ml-1 text-gray-400 flex-shrink-0 transition-transform ${ingredientDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {/* Dropdown panel */}
                  {ingredientDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-[300px] flex flex-col w-[280px]">
                      {/* Search and filter inside dropdown */}
                      <div className="p-2 border-b border-gray-100 space-y-2 sticky top-0 bg-white">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search ingredients..."
                            value={ingredientSearchQuery}
                            onChange={(e) => setIngredientSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant={ingredientStatusFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setIngredientStatusFilter('all') }}
                            className="h-6 px-2 text-xs flex-1"
                          >
                            All
                          </Button>
                          <Button
                            variant={ingredientStatusFilter === 'DISCREPANCY' ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setIngredientStatusFilter('DISCREPANCY') }}
                            className={`h-6 px-2 text-xs flex-1 ${ingredientStatusFilter === 'DISCREPANCY' ? 'bg-purple-500 text-white' : ''}`}
                          >
                            ⚠️ Disc
                          </Button>
                          <Button
                            variant={ingredientStatusFilter === 'OUT_OF_STOCK' ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setIngredientStatusFilter('OUT_OF_STOCK') }}
                            className={`h-6 px-2 text-xs flex-1 ${ingredientStatusFilter === 'OUT_OF_STOCK' ? 'bg-red-500 text-white' : ''}`}
                          >
                            ❌ Out
                          </Button>
                          <Button
                            variant={ingredientStatusFilter === 'LOW_STOCK' ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setIngredientStatusFilter('LOW_STOCK') }}
                            className={`h-6 px-2 text-xs flex-1 ${ingredientStatusFilter === 'LOW_STOCK' ? 'bg-yellow-500' : ''}`}
                          >
                            ⚠️ Low
                          </Button>
                        </div>
                      </div>
                      
                      {/* Options list */}
                      <div className="overflow-y-auto flex-1">
                        {filteredInventoryItems.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No ingredients found
                          </div>
                        ) : (
                          filteredInventoryItems.map(item => (
                            <div
                              key={item.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-amber-50 flex items-center justify-between ${
                                selectedIngredient === item.id ? 'bg-amber-100' : ''
                              }`}
                              onClick={() => {
                                handleIngredientSelect(item.id)
                                setIngredientDropdownOpen(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                  item.status === 'DISCREPANCY' ? 'bg-purple-500' :
                                  item.status === 'OUT_OF_STOCK' ? 'bg-red-500' : 
                                  item.status === 'LOW_STOCK' ? 'bg-yellow-500' : 'bg-green-500'
                                }`} />
                                <span className="text-sm">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{item.currentStock} {item.unit}</span>
                                {item.status !== 'IN_STOCK' && (
                                  <Badge className={`text-[10px] px-1.5 py-0 ${
                                    item.status === 'DISCREPANCY' ? 'bg-purple-100 text-purple-700' :
                                    item.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {item.status === 'DISCREPANCY' ? 'Disc' : item.status === 'OUT_OF_STOCK' ? 'Out' : 'Low'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {selectedIngredient && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedIngredient('')
                      setSelectedIngredientProducts([])
                      setSelectedProducts(new Set())
                      setIngredientSearchQuery('')
                    }}
                    className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Row 2: Batch action buttons (only shown when items selected) */}
            {selectedProducts.size > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
                {/* Stock controls - for cashier/manager to mark ingredient availability */}
                <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
                  <span className="text-xs text-gray-500 mr-1">Stock:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchOutOfStock(true)}
                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Out
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchOutOfStock(false)}
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    In
                  </Button>
                </div>
                
                {/* Sale controls - for manager to include/exclude from daily menu */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 mr-1">Sale:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchAvailability(false)}
                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  >
                    Off Sale
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchAvailability(true)}
                    className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                  >
                    On Sale
                  </Button>
                </div>
              </div>
            )}

            {/* Selected ingredient info */}
            {selectedIngredient && (
              <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${(() => {
                  const item = inventoryItems.find(i => i.id === selectedIngredient)
                  if (!item) return 'bg-gray-100 text-gray-700'
                  return item.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' :
                    item.status === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                })()}`}>
                  {(() => {
                    const item = inventoryItems.find(i => i.id === selectedIngredient)
                    if (!item) return 'Unknown ingredient'
                    return `Stock: ${item.currentStock} ${item.unit} (Min: ${item.minStock})`
                  })()}
                </span>
                {selectedIngredientProducts.length > 0 && (
                  <span className="text-xs text-amber-700 font-medium">
                    Showing {selectedIngredientProducts.length} product{selectedIngredientProducts.length !== 1 ? 's' : ''} using this ingredient
                    {selectedIngredientProducts.filter(p => p.outOfStock).length > 0 && (
                      <span className="text-red-600 ml-1">
                        ({selectedIngredientProducts.filter(p => p.outOfStock).length} already out of stock)
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Products Display */}
        {!loading && (viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => {
              const isSelected = selectedProducts.has(product.id)
              return (
                <div 
                  key={product.id} 
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                    isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'
                  }`}
                  onClick={() => isSelectionMode && toggleProductSelection(product.id)}
                >
                  <div className="aspect-video bg-gray-100 relative">
                    {/* Selection Checkbox */}
                    {isSelectionMode && (
                      <div 
                        className="absolute top-1.5 left-1.5 z-10"
                        onClick={(e) => { e.stopPropagation(); toggleProductSelection(product.id) }}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-amber-500 border-amber-500 text-white' 
                            : 'bg-white border-gray-300 hover:border-amber-400'
                        }`}>
                          {isSelected && <CheckCircle className="h-3 w-3" />}
                        </div>
                      </div>
                    )}
                    {product.image ? (
                      <img
                        src={getImageUrl(product.image) || ''}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-1.5 right-1.5 flex gap-1 flex-wrap justify-end">
                      {/* Stock indicator badge - like POS */}
                      {maxServings[product.id] !== undefined && (
                        <Badge className={`text-[10px] px-1.5 py-0.5 flex items-center gap-0.5 ${
                          maxServings[product.id] === 0 
                            ? 'bg-red-100 text-red-700 border border-red-300' 
                            : maxServings[product.id] <= 5 
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                              : 'bg-green-100 text-green-700 border border-green-300'
                        }`}>
                          <Package className="h-2.5 w-2.5" />
                          {maxServings[product.id]}
                        </Badge>
                      )}
                      {product.itemType === 'ADDON' && (
                        <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5">Add-on</Badge>
                      )}
                      {product.itemType === 'DRINK' && (
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5">Drink</Badge>
                      )}
                      {product.itemType === 'ADDON' && product.showInMenu && (
                        <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5">In Menu</Badge>
                      )}
                      {product.featured && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5">Featured</Badge>
                      )}
                      {(recipeStats.get(product.id) || 0) > 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5">Recipe ✓</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 text-[10px] px-1.5 py-0.5">No Recipe</Badge>
                      )}
                      {product.outOfStock && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white shadow-sm">Out of Stock</Badge>
                      )}
                      {!product.available && (
                        <Badge className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 border border-gray-300">Off Sale</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="mb-2">
                      <h3 className="font-semibold text-xs mb-0.5 line-clamp-1">{product.name}</h3>
                      <p className="text-[10px] text-gray-500">{product.category?.displayName || getCategoryDisplayName(product.categoryId)}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#F9C900' }}>₱{product.price}</p>
                        <p className="text-[10px] text-gray-500">Cost: ₱{product.cost ?? 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-900">{product.prepTime ?? 5}m</p>
                        <p className="text-[10px] text-green-600">+{getProfitMargin(product)}%</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      {/* Quick Stock Toggle - Staff marks when ingredients run out */}
                      <Button
                        size="sm"
                        onClick={() => toggleOutOfStock(product.id)}
                        className={`w-full font-medium text-xs h-7 ${
                          product.outOfStock 
                            ? 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300' 
                            : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
                        }`}
                        variant="outline"
                        title={product.outOfStock ? 'Mark as in stock' : 'Mark as out of stock'}
                      >
                        {product.outOfStock ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark In Stock
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Mark Out
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="w-full text-xs h-7"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVariantsAddonsProduct(product)}
                        className="w-full text-xs h-7 text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <Layers className="h-3 w-3 mr-1" />
                        Variants
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMenuItemForRecipe({ id: product.id, name: product.name })
                          setShowRecipeEditor(true)
                        }}
                        className={`w-full text-xs h-7 ${
                          (recipeStats.get(product.id) || 0) > 0 
                            ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50' 
                            : 'text-orange-600 border-orange-200 hover:bg-orange-50'
                        }`}
                      >
                        <Book className="h-3 w-3 mr-1" />
                        Components
                        {(recipeStats.get(product.id) || 0) > 0 && (
                          <span className="ml-1 text-[10px] font-bold">({recipeStats.get(product.id)})</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {isSelectionMode && (
                      <th className="px-4 py-3 text-center w-10">
                        <div 
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer mx-auto ${
                            selectedProducts.size === filteredProducts.length && filteredProducts.length > 0
                              ? 'bg-amber-500 border-amber-500 text-white' 
                              : 'bg-white border-gray-300 hover:border-amber-400'
                          }`}
                          onClick={selectAllProducts}
                        >
                          {selectedProducts.size === filteredProducts.length && filteredProducts.length > 0 && <CheckCircle className="h-3 w-3" />}
                        </div>
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cost</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Prep Time</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map(product => {
                    const isSelected = selectedProducts.has(product.id)
                    return (
                      <tr 
                        key={product.id} 
                        className={`hover:bg-gray-50 ${isSelected ? 'bg-amber-50' : ''}`}
                        onClick={() => isSelectionMode && toggleProductSelection(product.id)}
                      >
                        {isSelectionMode && (
                          <td className="px-4 py-3 text-center">
                            <div 
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer mx-auto ${
                                isSelected 
                                  ? 'bg-amber-500 border-amber-500 text-white' 
                                  : 'bg-white border-gray-300 hover:border-amber-400'
                              }`}
                              onClick={(e) => { e.stopPropagation(); toggleProductSelection(product.id) }}
                            >
                              {isSelected && <CheckCircle className="h-3 w-3" />}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {product.image ? (
                                <img src={getImageUrl(product.image) || ''} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{product.name}</p>
                                {product.featured && (
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">⭐</Badge>
                                )}
                                {(recipeStats.get(product.id) || 0) > 0 ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">📋</Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-700 text-xs">?</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">{product.category?.displayName || getCategoryDisplayName(product.categoryId)}</td>
                        <td className="px-4 py-3 text-right font-semibold">₱{product.price}</td>
                        <td className="px-4 py-3 text-right text-gray-600">₱{product.cost}</td>
                        <td className="px-4 py-3 text-center">
                          {maxServings[product.id] !== undefined ? (
                            <Badge className={`${
                              maxServings[product.id] === 0 
                                ? 'bg-red-100 text-red-700' 
                                : maxServings[product.id] <= 5 
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                            }`}>
                              {maxServings[product.id]}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-blue-100 text-blue-800">{product.prepTime} min</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {/* Stock status - controlled by staff */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleOutOfStock(product.id); }}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                product.outOfStock 
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                              title={product.outOfStock ? 'Click to mark in stock' : 'Click to mark out of stock'}
                            >
                              {product.outOfStock ? (
                                <span className="flex items-center justify-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Out
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  In Stock
                                </span>
                              )}
                            </button>
                            {/* Sale status indicator */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              product.available 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {product.available ? 'On Sale' : 'Off Sale'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setVariantsAddonsProduct(product)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                              title="Variants & Add-ons"
                            >
                              <Layers className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMenuItemForRecipe({ id: product.id, name: product.name })
                                setShowRecipeEditor(true)
                              }}
                              className={`p-1.5 rounded-md transition-colors ${
                                (recipeStats.get(product.id) || 0) > 0 
                                  ? 'text-emerald-600 hover:bg-emerald-50' 
                                  : 'text-orange-600 hover:bg-orange-50'
                              }`}
                              title={`Components (${recipeStats.get(product.id) || 0} configured)`}
                            >
                              <Book className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleFeatured(product.id)}
                              className={`p-1.5 rounded-md transition-colors ${
                                product.featured 
                                  ? 'text-yellow-500 hover:bg-yellow-50' 
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                              title={product.featured ? 'Remove from featured' : 'Mark as featured'}
                            >
                              <Star className={`h-4 w-4 ${product.featured ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(product.id, product.name)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {!loading && filteredProducts.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No products found</p>
          </div>
        )}

        {/* Add/Edit Product Modal */}
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingProduct(null)
          }}
          onSuccess={() => {
            setIsModalOpen(false)
            setEditingProduct(null)
            fetchProducts()
          }}
          editingProduct={editingProduct}
          categories={categories}
          onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
        />
        
        {/* Category Management Modal */}
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onCategoriesChange={fetchCategories}
          categories={categories}
          loadingCategories={loadingCategories}
        />
        
        {/* Variants & Add-ons Manager Modal */}
        {variantsAddonsProduct && (
          <VariantsAddonsManager
            isOpen={true}
            onClose={() => setVariantsAddonsProduct(null)}
            menuItem={{
              id: variantsAddonsProduct.id,
              name: variantsAddonsProduct.name,
              price: variantsAddonsProduct.price
            }}
            onUpdate={fetchProducts}
          />
        )}

        {/* Recipe Editor Modal */}
        {showRecipeEditor && selectedMenuItemForRecipe && (
          <RecipeEditorModal
            menuItemId={selectedMenuItemForRecipe.id}
            menuItemName={selectedMenuItemForRecipe.name}
            onClose={() => {
              setShowRecipeEditor(false)
              setSelectedMenuItemForRecipe(null)
            }}
            onSuccess={() => {
              fetchProducts()
              setShowRecipeEditor(false)
              setSelectedMenuItemForRecipe(null)
            }}
          />
        )}
        
        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setProductToDelete(null)
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Product"
          message={productToDelete ? [
            `Are you sure you want to delete "${productToDelete.name}"?`,
            '',
            'This action cannot be undone.'
          ] : []}
          type="danger"
          confirmText="Delete Product"
          cancelText="Cancel"
        />
      </div>
    </AdminLayout> 
  )
}
