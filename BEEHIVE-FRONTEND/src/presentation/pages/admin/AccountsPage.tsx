import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/common/ui/button'
import { Input } from '../../components/common/ui/input'
import { Badge } from '../../components/common/ui/badge'
import { 
  Plus, 
  Search, 
  Pencil, 
  Users,
  UserCheck,
  Loader2,
  CreditCard,
  Phone,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  ChefHat,
  Store,
  Archive,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react'
import { authApi, type User as UserType } from '../../../infrastructure/api/auth.api'
import { settingsApi } from '../../../infrastructure/api/settings.api'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../components/common/ToastNotification'
import { ConfirmationModal } from '../../components/common/ConfirmationModal'
import { AccountFormModal } from '../../components/features/Admin/AccountFormModal'
import { PermissionsModal } from '../../components/features/Admin/PermissionsModal'

// Role definitions (Staff roles only - no CUSTOMER since customer self-ordering is removed)
const ROLES = [
  { value: 'CASHIER', label: 'Cashier', icon: Store, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'COOK', label: 'Cook', icon: ChefHat, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'MANAGER', label: 'Manager', icon: ShieldCheck, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'ADMIN', label: 'Admin', icon: Shield, color: 'bg-red-100 text-red-700 border-red-200' },
] as const

export const AccountsPage = () => {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<keyof UserType>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserType | null>(null)
  
  // Archive confirmation modal state
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [userToArchive, setUserToArchive] = useState<{ id: string; name: string } | null>(null)
  
  // Check if current user is admin (can manage permissions)
  const isAdmin = currentUser?.role === 'ADMIN'
  const isManager = currentUser?.role === 'MANAGER'
  
  // Manager PIN view state (admin only)
  const [showManagerPin, setShowManagerPin] = useState(false)
  const [managerPinValue, setManagerPinValue] = useState<string | null>(null)
  const [loadingManagerPin, setLoadingManagerPin] = useState(false)

  const handleViewManagerPin = async () => {
    if (showManagerPin) {
      setShowManagerPin(false)
      return
    }
    if (managerPinValue !== null) {
      setShowManagerPin(true)
      return
    }
    setLoadingManagerPin(true)
    try {
      const res = await settingsApi.getManagerPin()
      setManagerPinValue(res.pin)
      setShowManagerPin(true)
    } catch {
      toast.error('Failed to load manager PIN')
    } finally {
      setLoadingManagerPin(false)
    }
  }
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10)
  const itemsPerPageOptions = [5, 10, 25, 50, 'all'] as const

  // Stats (Staff only - no customers)
  const [stats, setStats] = useState({
    totalUsers: 0,
    cashiers: 0,
    cooks: 0,
    managers: 0,
    admins: 0,
    activeUsers: 0
  })

  useEffect(() => {
    loadUsers()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterRole, filterActive])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await authApi.getAllUsers()
      // Filter out CUSTOMER role - staff accounts only
      const staffUsers = data.filter(u => u.role !== 'CUSTOMER')
      setUsers(staffUsers)
      
      // Calculate stats (staff only)
      const adminCount = staffUsers.filter(u => u.role === 'ADMIN').length
      const statsData = {
        totalUsers: staffUsers.length,
        cashiers: staffUsers.filter(u => u.role === 'CASHIER').length,
        cooks: staffUsers.filter(u => u.role === 'COOK').length,
        managers: staffUsers.filter(u => u.role === 'MANAGER').length,
        admins: adminCount,
        activeUsers: staffUsers.filter(u => u.isActive).length
      }
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      // Hide ADMIN users from non-admin staff
      if (!isAdmin && user.role === 'ADMIN') return false
      
      const matchesSearch = !searchQuery || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesActive = filterActive === 'all' || 
        (filterActive === 'active' && user.isActive) ||
        (filterActive === 'inactive' && !user.isActive)
      return matchesSearch && matchesRole && matchesActive
    })
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      const multiplier = sortDirection === 'asc' ? 1 : -1
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier
      }
      return String(aVal || '').localeCompare(String(bVal || '')) * multiplier
    })

  // Pagination logic
  const totalItems = filteredUsers.length
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage)
  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage
  const endIndex = itemsPerPage === 'all' ? totalItems : startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleItemsPerPageChange = (value: number | 'all') => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  const handleSort = (field: keyof UserType) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Archive account instead of deleting (industry standard - set isActive to false)
  const handleArchiveClick = (id: string, userName: string) => {
    setUserToArchive({ id, name: userName })
    setShowArchiveModal(true)
  }
  
  const handleArchiveConfirm = async () => {
    if (!userToArchive) return
    
    try {
      await authApi.updateUser(userToArchive.id, { isActive: false })
      toast.success('Account Archived', `${userToArchive.name}'s account has been archived and can no longer log in.`)
      await loadUsers()
    } catch (err) {
      toast.error('Archive Failed', err instanceof Error ? err.message : 'Failed to archive account')
    } finally {
      setShowArchiveModal(false)
      setUserToArchive(null)
    }
  }

  // Restore an archived account
  const handleRestore = async (id: string, userName: string) => {
    try {
      await authApi.updateUser(id, { isActive: true })
      toast.success('Account Restored', `${userName}'s account has been restored and can now log in.`)
      await loadUsers()
    } catch (err) {
      toast.error('Restore Failed', err instanceof Error ? err.message : 'Failed to restore account')
    }
  }

  const handleEdit = (user: UserType) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const handleOpenPermissions = (user: UserType) => {
    setSelectedUserForPermissions(user)
    setShowPermissionsModal(true)
  }

  const resetForm = () => {
    setEditingUser(null)
  }

  const getRoleConfig = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[0]
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-red-500">{error}</p>
          <Button onClick={loadUsers}>Retry</Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Account Management</h1>
            <p className="text-gray-500 mt-1">Manage all user accounts, roles, and permissions</p>
          </div>
          <Button 
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2"
            style={{ backgroundColor: '#F9C900', color: '#000000' }}
          >
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>

        {/* Stats Cards - Staff accounts only */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4 ${isAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
          <div className="bg-linear-to-br from-gray-50 to-slate-50 rounded-2xl shadow-sm p-4 border border-gray-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gray-100 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 text-gray-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Total Staff</p>
            <p className="text-lg lg:text-xl font-bold text-gray-900">{isAdmin ? stats.totalUsers : stats.totalUsers - stats.admins}</p>
          </div>
          <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm p-4 border border-green-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                <Store className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Cashiers</p>
            <p className="text-lg lg:text-xl font-bold text-green-600">{stats.cashiers}</p>
          </div>
          <div className="bg-linear-to-br from-orange-50 to-amber-50 rounded-2xl shadow-sm p-4 border border-orange-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-orange-100 rounded-xl group-hover:scale-110 transition-transform">
                <ChefHat className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Cooks</p>
            <p className="text-lg lg:text-xl font-bold text-orange-600">{stats.cooks}</p>
          </div>
          <div className="bg-linear-to-br from-purple-50 to-violet-50 rounded-2xl shadow-sm p-4 border border-purple-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Managers</p>
            <p className="text-lg lg:text-xl font-bold text-purple-600">{stats.managers}</p>
          </div>
          {isAdmin && (
            <div className="bg-linear-to-br from-red-50 to-rose-50 rounded-2xl shadow-sm p-4 border border-red-100 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-red-100 rounded-xl group-hover:scale-110 transition-transform">
                  <Shield className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">Admins</p>
              <p className="text-lg lg:text-xl font-bold text-red-600">{stats.admins}</p>
            </div>
          )}
          <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-sm p-4 border border-emerald-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-emerald-100 rounded-xl group-hover:scale-110 transition-transform">
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Active</p>
            <p className="text-lg lg:text-xl font-bold text-emerald-600">{stats.activeUsers}</p>
          </div>
        </div>

        {/* Manager PIN Card (admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 shadow-sm">
            <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-700">Manager Authorization PIN</p>
              <p className="text-lg font-mono font-bold text-amber-900 tracking-widest mt-0.5">
                {showManagerPin && managerPinValue !== null ? managerPinValue : '••••'}
              </p>
            </div>
            <button
              onClick={handleViewManagerPin}
              disabled={loadingManagerPin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
            >
              {loadingManagerPin ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : showManagerPin ? (
                <><EyeOff className="h-4 w-4" />Hide</>
              ) : (
                <><Eye className="h-4 w-4" />View PIN</>
              )}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-100">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="h-10 px-4 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Roles</option>
            {ROLES.filter(role => isAdmin || role.value !== 'ADMIN').map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="h-10 px-4 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    Account {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('role')}
                  >
                    Role {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      No accounts found
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const roleConfig = getRoleConfig(user.role)
                    const RoleIcon = roleConfig.icon
                    return (
                      <tr key={user.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: '#F9C900' }}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`${roleConfig.color} border flex items-center gap-1 w-fit`}>
                            <RoleIcon className="h-3 w-3" />
                            {roleConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            {user.phone ? (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            ) : (
                              <span className="text-gray-400">No phone</span>
                            )}
                            {user.cardNumber && (
                              <div className="flex items-center gap-1 text-gray-500 mt-1">
                                <CreditCard className="h-3 w-3" />
                                {user.cardNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge variant={user.isActive ? 'default' : 'secondary'}
                            className={user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            {/* Permission button - only show for managers/admins managing staff */}
                            {(isAdmin || isManager) && user.role !== 'ADMIN' && !(isManager && user.role === 'MANAGER') ? (
                              <button
                                onClick={() => handleOpenPermissions(user)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Manage Permissions"
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                            ) : null}
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {user.isActive ? (
                              user.role !== 'ADMIN' && (
                                <button
                                  onClick={() => handleArchiveClick(user.id, user.name)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Archive Account"
                                >
                                  <Archive className="h-4 w-4" />
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => handleRestore(user.id, user.name)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Restore Account"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All' : option}
                  </option>
                ))}
              </select>
              <span>entries</span>
              <span className="ml-2 text-gray-500">
                (Showing {totalItems > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, totalItems)} of {totalItems})
              </span>
            </div>
            
            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="min-w-9"
                      style={currentPage === pageNum ? { backgroundColor: '#F9C900', color: '#000000' } : {}}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Account Modal */}
        <AccountFormModal
          isOpen={isModalOpen}
          editingUser={editingUser}
          isAdmin={isAdmin}
          onClose={() => {
            setIsModalOpen(false)
            resetForm()
          }}
          onSaved={async () => {
            await loadUsers()
            setIsModalOpen(false)
            resetForm()
          }}
        />

        {/* Permissions Modal */}
        <PermissionsModal
          isOpen={showPermissionsModal}
          user={selectedUserForPermissions}
          onClose={() => {
            setShowPermissionsModal(false)
            setSelectedUserForPermissions(null)
          }}
          onEditUser={handleEdit}
        />
        
        {/* Archive Confirmation Modal */}
        <ConfirmationModal
          isOpen={showArchiveModal}
          onClose={() => {
            setShowArchiveModal(false)
            setUserToArchive(null)
          }}
          onConfirm={handleArchiveConfirm}
          title="Archive Account"
          message={userToArchive ? [
            `Are you sure you want to archive "${userToArchive.name}"?`,
            '',
            'The user will no longer be able to log in, but their data will be preserved.'
          ] : []}
          type="warning"
          confirmText="Archive Account"
          cancelText="Cancel"
        />
      </div>
    </AdminLayout>
  )
}
