import React from 'react'
import { Button } from '../../common/ui/button'
import { X, Shield, Pencil } from 'lucide-react'
import type { User as UserType } from '../../../../infrastructure/api/auth.api'

const ROLES = [
  { value: 'CASHIER', label: 'Cashier' },
  { value: 'COOK', label: 'Cook' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
] as const

type UserRole = typeof ROLES[number]['value']

const DEFAULT_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  CASHIER: {
    viewDashboard: true, accessPOS: true, viewOrders: true, manageOrders: true,
    viewInventory: true, manageInventory: false, viewSales: true, viewReports: false,
    viewExpenses: false, viewProducts: true, manageProducts: false, viewAccounts: false,
    manageAccounts: false, viewSettings: false, manageSettings: false,
  },
  COOK: {
    viewDashboard: true, accessPOS: false, viewOrders: true, manageOrders: true,
    viewInventory: true, manageInventory: false, viewSales: false, viewReports: false,
    viewExpenses: false, viewProducts: true, manageProducts: false, viewAccounts: false,
    manageAccounts: false, viewSettings: false, manageSettings: false,
  },
  MANAGER: {
    viewDashboard: true, accessPOS: true, viewOrders: true, manageOrders: true,
    viewInventory: true, manageInventory: true, viewSales: true, viewReports: true,
    viewExpenses: true, manageExpenses: true, viewProducts: true, manageProducts: true,
    viewAccounts: true, manageAccounts: false, viewSettings: true, manageSettings: true,
    viewRecipes: true, manageRecipes: true, manageMoodSettings: true,
  },
  ADMIN: {
    viewDashboard: true, accessPOS: true, viewOrders: true, manageOrders: true,
    viewInventory: true, manageInventory: true, viewSales: true, viewReports: true,
    viewExpenses: true, manageExpenses: true, viewProducts: true, manageProducts: true,
    viewAccounts: true, manageAccounts: true, viewSettings: true, manageSettings: true,
    viewRecipes: true, manageRecipes: true, manageUserPermissions: true, manageMoodSettings: true,
  },
}

const PERMISSION_LABELS: Record<string, string> = {
  viewDashboard: 'View Dashboard', accessPOS: 'Access POS',
  viewOrders: 'View Orders', manageOrders: 'Manage Orders',
  viewInventory: 'View Inventory', manageInventory: 'Manage Inventory',
  viewSales: 'View Sales', viewReports: 'View Reports',
  viewExpenses: 'View Expenses', manageExpenses: 'Manage Expenses',
  viewProducts: 'View Products', manageProducts: 'Manage Products',
  viewAccounts: 'View Accounts', manageAccounts: 'Manage Accounts',
  viewSettings: 'View Settings', manageSettings: 'Manage Settings',
  viewRecipes: 'View Recipes', manageRecipes: 'Manage Recipes',
  manageUserPermissions: 'Manage User Permissions', manageMoodSettings: 'Manage Mood Settings',
}

const PERMISSION_CATEGORIES = [
  { name: 'Dashboard & POS', permissions: ['viewDashboard', 'accessPOS'] },
  { name: 'Orders', permissions: ['viewOrders', 'manageOrders'] },
  { name: 'Inventory', permissions: ['viewInventory', 'manageInventory'] },
  { name: 'Sales & Reports', permissions: ['viewSales', 'viewReports'] },
  { name: 'Expenses', permissions: ['viewExpenses', 'manageExpenses'] },
  { name: 'Products & Recipes', permissions: ['viewProducts', 'manageProducts', 'viewRecipes', 'manageRecipes'] },
  { name: 'Administration', permissions: ['viewAccounts', 'manageAccounts', 'viewSettings', 'manageSettings', 'manageMoodSettings'] },
]

interface PermissionsModalProps {
  isOpen: boolean
  user: UserType | null
  onClose: () => void
  onEditUser: (user: UserType) => void
}

export const PermissionsModal = React.memo(({
  isOpen,
  user,
  onClose,
  onEditUser,
}: PermissionsModalProps) => {
  if (!isOpen || !user) return null

  const roleLabel = ROLES.find(r => r.value === user.role)?.label || user.role

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-linear-to-r from-purple-50 to-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              View Permissions
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {user.name} ({roleLabel})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Role-Based Access Control</p>
              <p className="text-sm text-blue-700 mt-1">
                Permissions are determined by the user's role. To change what a user can access, update their role in the Edit Account form.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {PERMISSION_CATEGORIES.map((category) => (
              <div key={category.name} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-700">
                  {category.name}
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {category.permissions.map((perm) => {
                    const isEnabled = DEFAULT_PERMISSIONS[user.role as UserRole]?.[perm] ?? false
                    return (
                      <div key={perm} className={`flex items-center justify-between p-2 rounded-lg ${isEnabled ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                        <span className={`text-sm ${isEnabled ? 'text-green-800 font-medium' : 'text-gray-500'}`}>
                          {PERMISSION_LABELS[perm] || perm}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isEnabled ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                          {isEnabled ? '✓ YES' : '✗ NO'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Change role to modify permissions
            </p>
            <Button
              onClick={() => {
                onClose()
                onEditUser(user)
              }}
              className="flex items-center gap-2"
              style={{ backgroundColor: '#F9C900', color: '#000000' }}
            >
              <Pencil className="h-4 w-4" />
              Edit Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})

PermissionsModal.displayName = 'PermissionsModal'
