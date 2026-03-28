import React, { useState, memo, useEffect } from 'react'
import { Button } from '../../common/ui/button'
import { Input } from '../../common/ui/input'
import { Label } from '../../common/ui/label'
import { Badge } from '../../common/ui/badge'
import { 
  X,
  Loader2,
  Settings,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { categoriesApi } from '../../../../infrastructure/api/categories.api'
import type { CategoryDTO } from '../../../../infrastructure/api/categories.api'
import { toast } from '../../common/ToastNotification'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCategoriesChange: () => void
  categories: CategoryDTO[]
  loadingCategories: boolean
}

export const CategoryModal = memo(function CategoryModal({
  isOpen,
  onClose,
  onCategoriesChange,
  categories,
  loadingCategories
}: CategoryModalProps) {
  // Form state - isolated inside modal to prevent parent re-renders
  const [categoryFormData, setCategoryFormData] = useState({
    displayName: '',
    description: ''
  })
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null)
  const [submittingCategory, setSubmittingCategory] = useState(false)

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetCategoryForm()
    }
  }, [isOpen])

  const resetCategoryForm = () => {
    setCategoryFormData({
      displayName: '',
      description: ''
    })
    setEditingCategory(null)
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!categoryFormData.displayName) {
      toast.warning('Validation Error', 'Please fill in the category name')
      return
    }
    
    // Auto-generate identifier from display name
    const autoName = categoryFormData.displayName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
    
    try {
      setSubmittingCategory(true)
      
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, {
          name: autoName,
          displayName: categoryFormData.displayName,
          description: categoryFormData.description || undefined
        })
        toast.success('Category updated successfully!')
      } else {
        await categoriesApi.create({
          name: autoName,
          displayName: categoryFormData.displayName,
          description: categoryFormData.description || undefined
        })
        toast.success('Category created successfully!')
      }
      
      resetCategoryForm()
      onCategoriesChange()
    } catch (error) {
      console.error('Failed to save category:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to save category', err.response?.data?.message || 'Please try again.')
    } finally {
      setSubmittingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete category "${displayName}"?`)) {
      return
    }
    
    try {
      await categoriesApi.delete(id)
      toast.success('Category deleted successfully!')
      onCategoriesChange()
    } catch (error) {
      console.error('Failed to delete category:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to delete category', err.response?.data?.message || 'Please try again.')
    }
  }

  // Move category up or down
  const handleMoveCategoryPosition = async (id: string, direction: 'up' | 'down') => {
    // Sort categories by sortOrder first
    const sortedCategories = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const currentIndex = sortedCategories.findIndex(c => c.id === id)
    
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === sortedCategories.length - 1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    // Swap positions
    const newCategories = [...sortedCategories]
    const temp = newCategories[currentIndex]
    newCategories[currentIndex] = newCategories[newIndex]
    newCategories[newIndex] = temp
    
    // Build new order array
    const categoryOrders = newCategories.map((cat, index) => ({
      id: cat.id,
      sortOrder: index
    }))
    
    try {
      await categoriesApi.reorder(categoryOrders)
      onCategoriesChange()
      toast.success('Category order updated')
    } catch (error) {
      console.error('Failed to reorder categories:', error)
      toast.error('Failed to update order')
    }
  }

  const handleClose = () => {
    resetCategoryForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Settings className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Manage Categories</h2>
              <p className="text-sm text-gray-500">Add, edit, or delete product categories</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {/* Add/Edit Category Form */}
          <form onSubmit={handleCategorySubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="catDisplayName" className="text-xs font-medium text-gray-600">
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="catDisplayName"
                  type="text"
                  value={categoryFormData.displayName}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, displayName: e.target.value })}
                  placeholder="e.g., Hot Drinks"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="catDesc" className="text-xs font-medium text-gray-600">
                  Description
                </Label>
                <Input
                  id="catDesc"
                  type="text"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Optional description"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                type="submit"
                size="sm"
                style={{ backgroundColor: '#F9C900', color: '#000000' }}
                disabled={submittingCategory}
              >
                {submittingCategory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  editingCategory ? 'Update' : 'Add Category'
                )}
              </Button>
              {editingCategory && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetCategoryForm}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
          
          {/* Category List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Existing Categories</h3>
            {loadingCategories ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No categories yet. Add your first category above.
              </div>
            ) : (
              <div className="space-y-2">
                {[...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((cat, index, arr) => (
                  <div 
                    key={cat.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      cat.isActive ? 'bg-white' : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    {/* Position Controls */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => handleMoveCategoryPosition(cat.id, 'up')}
                      >
                        <ArrowUp className={`h-3 w-3 ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === arr.length - 1}
                        onClick={() => handleMoveCategoryPosition(cat.id, 'down')}
                      >
                        <ArrowDown className={`h-3 w-3 ${index === arr.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`} />
                      </Button>
                    </div>
                    
                    {/* Position Number */}
                    <span className="text-xs text-gray-400 font-mono w-4 text-center">{index + 1}</span>
                    
                    {/* Category Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{cat.displayName}</span>
                        {!cat.isActive && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingCategory(cat)
                          setCategoryFormData({
                            displayName: cat.displayName,
                            description: cat.description || ''
                          })
                        }}
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-50"
                        onClick={() => handleDeleteCategory(cat.id, cat.displayName)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
})
