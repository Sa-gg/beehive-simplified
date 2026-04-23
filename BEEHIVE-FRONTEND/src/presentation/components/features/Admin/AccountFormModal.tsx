import React, { useState, useCallback } from 'react'
import { Button } from '../../common/ui/button'
import { Input } from '../../common/ui/input'
import { Label } from '../../common/ui/label'
import {
  X,
  Loader2,
  Shield,
  ShieldCheck,
  ChefHat,
  Store,
  Eye,
  EyeOff,
} from 'lucide-react'
import { authApi, type User as UserType } from '../../../../infrastructure/api/auth.api'
import { toast } from '../../common/ToastNotification'

const ROLES = [
  { value: 'CASHIER', label: 'Cashier', icon: Store, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'COOK', label: 'Cook', icon: ChefHat, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'MANAGER', label: 'Manager', icon: ShieldCheck, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'ADMIN', label: 'Admin', icon: Shield, color: 'bg-red-100 text-red-700 border-red-200' },
] as const

type UserRole = typeof ROLES[number]['value']

interface AccountFormModalProps {
  isOpen: boolean
  editingUser: UserType | null
  isAdmin: boolean
  onClose: () => void
  onSaved: () => void
}

export const AccountFormModal = React.memo(({
  isOpen,
  editingUser,
  isAdmin,
  onClose,
  onSaved,
}: AccountFormModalProps) => {
  const [formData, setFormData] = useState({
    name: editingUser?.name || '',
    email: editingUser?.email || '',
    password: '',
    confirmPassword: '',
    phone: editingUser?.phone || '',
    role: (editingUser?.role as UserRole) || 'CASHIER',
    isActive: editingUser?.isActive ?? true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Reset form when editingUser changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editingUser?.name || '',
        email: editingUser?.email || '',
        password: '',
        confirmPassword: '',
        phone: editingUser?.phone || '',
        role: (editingUser?.role as UserRole) || 'CASHIER',
        isActive: editingUser?.isActive ?? true,
      })
      setShowPassword(false)
    }
  }, [isOpen, editingUser])

  const handleRoleChange = useCallback((role: UserRole) => {
    setFormData(prev => ({ ...prev, role }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || (!editingUser && !formData.password)) {
      toast.warning('Validation Error', 'Please fill in all required fields')
      return
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.warning('Validation Error', 'Passwords do not match')
      return
    }

    try {
      setSubmitting(true)

      if (editingUser) {
        await authApi.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role,
          isActive: formData.isActive,
          ...(formData.password ? { password: formData.password } : {})
        })
      } else {
        await authApi.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || '',
          role: formData.role,
        })
      }

      onSaved()
    } catch (err) {
      toast.error('Save Failed', err instanceof Error ? err.message : 'Failed to save user')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-linear-to-r from-amber-50 to-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingUser ? 'Edit Account' : 'Add New Account'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {editingUser ? 'Update account details' : 'Create a new user account'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Role Selection */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">
              Account Type <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.filter(role => {
                if (role.value === 'ADMIN' && !isAdmin) return false
                return true
              }).map((role) => {
                const RoleIcon = role.icon
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleChange(role.value)}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                      formData.role === role.value
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <RoleIcon className={`h-5 w-5 ${formData.role === role.value ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${formData.role === role.value ? 'text-amber-900' : 'text-gray-600'}`}>
                      {role.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Name & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700 mb-2 block">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                required
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                required
                className="h-11"
              />
            </div>
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700 mb-2 block">
                Password {!editingUser && <span className="text-red-500">*</span>}
                {editingUser && <span className="text-gray-400 text-xs ml-1">(optional)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? '••••••••' : 'Enter password'}
                  required={!editingUser}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 mb-2 block">
                Confirm Password {!editingUser && <span className="text-red-500">*</span>}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter password"
                  required={!editingUser && !!formData.password}
                  className={`h-11 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                />
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 mb-2 block">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+63 912 345 6789"
                className="h-11"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">Account Status</p>
              <p className="text-sm text-gray-500">
                {formData.isActive ? 'Account is active and can log in' : 'Account is disabled'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                formData.isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                formData.isActive ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="shadow-lg shadow-amber-500/20"
              style={{ backgroundColor: '#F9C900', color: '#000000' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingUser ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{editingUser ? 'Update' : 'Create'} Account</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
})

AccountFormModal.displayName = 'AccountFormModal'
