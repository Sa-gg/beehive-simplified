import React, { useState, useEffect, memo } from 'react'
import { Button } from '../../common/ui/button'
import { Input } from '../../common/ui/input'
import { Label } from '../../common/ui/label'
import { 
  X,
  Upload,
  Loader2,
  AlertTriangle,
  Eye,
  Eraser,
  ImageIcon,
  FolderPlus,
  Trash2
} from 'lucide-react'
import { ImageViewer } from '../../common/ImageViewer'
import { processImage, formatFileSize } from '../../../../shared/utils/imageProcessing'
import { menuItemsApi, uploadApi } from '../../../../infrastructure/api/menuItems.api'
import type { MenuItemType } from '../../../../infrastructure/api/menuItems.api'
import type { CategoryDTO } from '../../../../infrastructure/api/categories.api'
import { toast } from '../../common/ToastNotification'

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
  outOfStock: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
}

// Item type options
const ITEM_TYPES = [
  { value: 'BASE', label: 'Base Item', description: 'Regular menu item that can have variants and add-ons' },
  { value: 'ADDON', label: 'Add-on', description: 'Can be added to other items (e.g., Extra Rice, Egg)' },
  { value: 'DRINK', label: 'Drink', description: 'Beverage item' }
] as const

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingProduct: Product | null
  categories: CategoryDTO[]
  onOpenCategoryModal: () => void
}

// Helper function to get full image URL
const getImageUrl = (imagePath: string | null) => {
  if (!imagePath) return null
  if (imagePath.startsWith('http')) return imagePath
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return `${API_BASE_URL}${imagePath}`
}

export const ProductFormModal = memo(function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingProduct,
  categories,
  onOpenCategoryModal
}: ProductFormModalProps) {
  // Form state - isolated inside modal to prevent parent re-renders
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    price: '',
    cost: '',
    prepTime: '',
    image: '',
    description: '',
    available: true,
    featured: false,
    itemType: 'BASE' as MenuItemType,
    showInMenu: false
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [imageProcessingProgress, setImageProcessingProgress] = useState<string>('')
  const [compressImage, setCompressImage] = useState(true)
  const [removeBackground, setRemoveBackground] = useState(false)
  const [originalFileSize, setOriginalFileSize] = useState<number | null>(null)
  const [processedFileSize, setProcessedFileSize] = useState<number | null>(null)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  
  // Silence unused warning
  void processedFileSize

  // Reset form when modal opens/closes or editing product changes
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setFormData({
          name: editingProduct.name,
          categoryId: editingProduct.categoryId,
          price: editingProduct.price.toString(),
          cost: editingProduct.cost?.toString() || '',
          prepTime: editingProduct.prepTime?.toString() || '',
          image: editingProduct.image || '',
          description: editingProduct.description || '',
          available: editingProduct.available,
          featured: editingProduct.featured,
          itemType: editingProduct.itemType || 'BASE',
          showInMenu: editingProduct.showInMenu || false
        })
      } else {
        resetForm()
      }
    }
  }, [isOpen, editingProduct])

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      price: '',
      cost: '',
      prepTime: '',
      image: '',
      description: '',
      available: true,
      featured: false,
      itemType: 'BASE',
      showInMenu: false
    })
    setOriginalFileSize(null)
    setProcessedFileSize(null)
  }

  // Helper function to process and upload image
  const processAndUploadImage = async (file: File) => {
    try {
      setUploadingImage(true)
      setOriginalFileSize(file.size)
      setProcessedFileSize(null)
      setImageProcessingProgress('')

      let fileToUpload: File = file

      // Process image if compression or background removal is enabled
      if (compressImage || removeBackground) {
        setImageProcessingProgress('Processing image...')
        const result = await processImage(file, {
          compress: compressImage,
          removeBackground: removeBackground,
          onProgress: (stage, progress) => {
            if (stage === 'compressing') {
              setImageProcessingProgress(`Compressing... ${Math.round(progress)}%`)
            } else if (stage === 'removing-background') {
              setImageProcessingProgress(`Removing background... ${Math.round(progress)}%`)
            }
          }
        })
        fileToUpload = result.file
        setProcessedFileSize(result.file.size)
      }

      setImageProcessingProgress('Uploading...')
      const uploadFormData = new FormData()
      uploadFormData.append('image', fileToUpload)
      
      const response = await uploadApi.uploadImage(uploadFormData)
      setFormData(prev => ({ ...prev, image: response.data.path }))
      
      // Show success message with size comparison
      if (compressImage && originalFileSize) {
        const savedPercent = Math.round((1 - (fileToUpload.size / file.size)) * 100)
        if (savedPercent > 0) {
          toast.success('Image uploaded!', `Compressed from ${formatFileSize(file.size)} to ${formatFileSize(fileToUpload.size)} (${savedPercent}% smaller)`)
        } else {
          toast.success('Image uploaded successfully!')
        }
      } else {
        toast.success('Image uploaded successfully!')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to upload image', err.response?.data?.message || 'Please try again.')
    } finally {
      setUploadingImage(false)
      setImageProcessingProgress('')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processAndUploadImage(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.warning('Invalid File', 'Please drop an image file')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.warning('File Too Large', 'Image size must be less than 20MB')
      return
    }

    await processAndUploadImage(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.categoryId || !formData.price || !formData.prepTime) {
      toast.warning('Validation Error', 'Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      
      const payload = {
        name: formData.name,
        categoryId: formData.categoryId,
        price: Math.round(parseFloat(formData.price) * 100) / 100,
        cost: formData.cost ? Math.round(parseFloat(formData.cost) * 100) / 100 : undefined,
        prepTime: parseInt(formData.prepTime),
        image: formData.image || undefined,
        description: formData.description || undefined,
        available: formData.available,
        featured: formData.featured,
        itemType: formData.itemType,
        showInMenu: formData.itemType === 'ADDON' ? formData.showInMenu : false
      }

      if (editingProduct) {
        await menuItemsApi.update(editingProduct.id, payload)
        toast.success('Product updated successfully!')
      } else {
        await menuItemsApi.create(payload)
        toast.success('Product created successfully!')
      }

      onSuccess()
    } catch (error) {
      console.error('Failed to save product:', error)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error('Failed to save product', err.response?.data?.message || 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="md:col-span-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700 mb-2 block">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Bacon Pepperoni Pizza"
                  />
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onOpenCategoryModal}
                      className="text-xs text-amber-600 hover:text-amber-700 h-6 px-2"
                    >
                      <FolderPlus className="h-3 w-3 mr-1" />
                      Manage Categories
                    </Button>
                  </div>
                  <select
                    id="category"
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category...</option>
                    {categories.filter(cat => cat.isActive).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.displayName}</option>
                    ))}
                  </select>
                </div>

                {/* Item Type */}
                <div>
                  <Label htmlFor="itemType" className="text-sm font-semibold text-gray-700 mb-2 block">
                    Item Type
                  </Label>
                  <select
                    id="itemType"
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value as MenuItemType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ITEM_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {ITEM_TYPES.find(t => t.value === formData.itemType)?.description}
                  </p>
                </div>

                {/* Show in Menu (for ADDON type) */}
                {formData.itemType === 'ADDON' && (
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showInMenu}
                        onChange={(e) => setFormData({ ...formData, showInMenu: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Show in Menu</span>
                        <p className="text-xs text-gray-500">
                          When enabled, this add-on will also appear in the regular menu as a standalone item.
                          Otherwise, it will only appear as an option when ordering other products.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing & Time Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2">Pricing & Time</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Price */}
                <div>
                  <Label htmlFor="price" className="text-sm font-semibold text-gray-700 mb-2 block">
                    Price (₱) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                {/* Cost */}
                <div>
                  <Label htmlFor="cost" className="text-sm font-semibold text-gray-700 mb-2 block">
                    Cost (₱)
                  </Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                {/* Prep Time */}
                <div>
                  <Label htmlFor="prepTime" className="text-sm font-semibold text-gray-700 mb-2 block">
                    Prep Time (min) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="prepTime"
                    type="number"
                    min="1"
                    required
                    value={formData.prepTime}
                    onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            {/* Media & Description Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2">Media & Description</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image Upload/URL */}
                <div className="md:col-span-2">
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Product Image
                  </Label>
                  <div className="space-y-3">
                    {/* Image Processing Options */}
                    <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressImage}
                          onChange={(e) => setCompressImage(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <ImageIcon className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-700">Compress Image</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer" title="AI background removal - may take 10-30 seconds">
                        <input
                          type="checkbox"
                          checked={removeBackground}
                          onChange={(e) => setRemoveBackground(e.target.checked)}
                          className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        />
                        <Eraser className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-gray-700">Remove Background</span>
                        <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">AI</span>
                      </label>
                    </div>

                    {/* Warning for background removal */}
                    {removeBackground && !imageProcessingProgress && (
                      <div className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                        <AlertTriangle className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                        <span className="text-xs text-purple-700">
                          AI background removal may take 10-30 seconds depending on image size. The page may be briefly unresponsive.
                        </span>
                      </div>
                    )}

                    {/* Processing Progress */}
                    {imageProcessingProgress && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-700">{imageProcessingProgress}</span>
                      </div>
                    )}

                    {/* File Upload Area - Shows preview inside when image exists */}
                    {formData.image ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 relative group">
                        <img
                          src={getImageUrl(formData.image) || ''}
                          alt="Preview"
                          className="w-full h-40 object-contain rounded cursor-pointer"
                          onClick={() => setImageViewerOpen(true)}
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbnZhbGlkPC90ZXh0Pjwvc3ZnPg=='
                          }}
                        />
                        {/* Overlay with view icon on hover */}
                        <div 
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                          onClick={() => setImageViewerOpen(true)}
                        >
                          <Eye className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute top-1 right-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => setImageViewerOpen(true)}
                            className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                            title="View image"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, image: '' })
                              setOriginalFileSize(null)
                              setProcessedFileSize(null)
                            }}
                            className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Click to view hint */}
                        <p className="text-xs text-gray-400 text-center mt-1">Click image to view full size</p>
                      </div>
                    ) : (
                      <div 
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          isDragging 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        {uploadingImage ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                            <span className="text-sm text-blue-600">{imageProcessingProgress || 'Processing...'}</span>
                          </div>
                        ) : (
                          <>
                            <Upload className={`h-8 w-8 mx-auto mb-2 ${
                              isDragging ? 'text-blue-500' : 'text-gray-400'
                            }`} />
                            <label htmlFor="imageFile" className="cursor-pointer">
                              <span className="text-sm text-blue-600 font-medium hover:text-blue-700">
                                Click to upload
                              </span>
                              <span className="text-sm text-gray-500"> or drag and drop</span>
                              <input
                                id="imageFile"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                disabled={uploadingImage}
                              />
                            </label>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG, GIF, WebP up to 20MB</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700 mb-2 block">
                    Description
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the product..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Settings Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-2">Settings</h3>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Available for sale</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Featured item</span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              {editingProduct ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    onClose()
                  }}
                  disabled={submitting}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Product
                </Button>
              ) : (
                <div></div>
              )}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-6"
                  style={{ backgroundColor: '#F9C900', color: '#000000' }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingProduct ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingProduct ? 'Update Product' : 'Add Product'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      {/* Image Viewer Modal */}
      {imageViewerOpen && formData.image && (
        <ImageViewer
          src={getImageUrl(formData.image) || ''}
          alt={formData.name || 'Product image'}
          onClose={() => setImageViewerOpen(false)}
        />
      )}
    </>
  )
})
