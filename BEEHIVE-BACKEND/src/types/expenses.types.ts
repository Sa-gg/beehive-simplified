export enum ExpenseCategory {
  RENT_LEASE = 'RENT_LEASE',
  UTILITIES = 'UTILITIES',
  ADMINISTRATIVE_SALARIES = 'ADMINISTRATIVE_SALARIES',
  SOFTWARE_SUBSCRIPTIONS = 'SOFTWARE_SUBSCRIPTIONS',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER'
}

export enum ExpenseFrequency {
  ONE_TIME = 'ONE_TIME',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL'
}

export interface Expense {
  id: string
  category: ExpenseCategory
  date: Date
  amount: number
  description: string
  frequency: ExpenseFrequency
  attachment?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateExpenseDTO {
  category: ExpenseCategory
  date: string
  amount: number
  description: string
  frequency: ExpenseFrequency
  attachment?: string
}

export interface UpdateExpenseDTO {
  category?: ExpenseCategory
  date?: string
  amount?: number
  description?: string
  frequency?: ExpenseFrequency
  attachment?: string
}

export interface ExpenseFilters {
  startDate?: string
  endDate?: string
  category?: ExpenseCategory
  frequency?: ExpenseFrequency
}

export interface ExpenseSummary {
  totalExpenses: number
  monthlyTotal: number
  categoryBreakdown: {
    category: string
    total: number
    percentage: number
  }[]
  frequencyBreakdown: {
    frequency: string
    total: number
    count: number
  }[]
}
