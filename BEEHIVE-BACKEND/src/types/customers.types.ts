export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  CASHIER = 'CASHIER',
  COOK = 'COOK',
  MANAGER = 'MANAGER'
}

export interface Customer {
  id: string
  email: string
  name: string
  role: UserRole
  phone: string | null
  cardNumber: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
}

export interface CreateCustomerDTO {
  email: string
  password: string
  name: string
  phone?: string | null
  cardNumber?: string | null
}

export interface UpdateCustomerDTO {
  email?: string
  name?: string
  phone?: string | null
  cardNumber?: string | null
  isActive?: boolean
}

export interface CustomerFilters {
  role?: UserRole
  isActive?: boolean
  search?: string // Search by name, email, or phone
}

export interface CustomerStats {
  totalCustomers: number
  activeCustomers: number
}
