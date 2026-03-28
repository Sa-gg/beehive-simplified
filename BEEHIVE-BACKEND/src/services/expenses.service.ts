import { ExpensesRepository } from '../repositories/expenses.repository'
import { CreateExpenseDTO, UpdateExpenseDTO, ExpenseFilters, ExpenseSummary } from '../types/expenses.types'

export class ExpensesService {
  constructor(private repository: ExpensesRepository) {}

  async getAllExpenses(filters?: ExpenseFilters) {
    return this.repository.findAll(filters)
  }

  async getExpenseById(id: string) {
    const expense = await this.repository.findById(id)
    if (!expense) {
      throw new Error('Expense not found')
    }
    return expense
  }

  async createExpense(data: CreateExpenseDTO) {
    // Validate amount
    if (data.amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }

    // Validate date
    const expenseDate = new Date(data.date)
    if (isNaN(expenseDate.getTime())) {
      throw new Error('Invalid date format')
    }

    return this.repository.create(data)
  }

  async updateExpense(id: string, data: UpdateExpenseDTO) {
    // Check if expense exists
    await this.getExpenseById(id)

    // Validate amount if provided
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }

    // Validate date if provided
    if (data.date) {
      const expenseDate = new Date(data.date)
      if (isNaN(expenseDate.getTime())) {
        throw new Error('Invalid date format')
      }
    }

    return this.repository.update(id, data)
  }

  async deleteExpense(id: string) {
    // Check if expense exists
    await this.getExpenseById(id)
    return this.repository.delete(id)
  }

  async getExpenseSummary(startDate?: string, endDate?: string): Promise<ExpenseSummary> {
    const now = new Date()
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1)
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const expenses = await this.repository.findAll({
      startDate: start.toISOString(),
      endDate: end.toISOString()
    })

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    // Get monthly total (current month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const monthlyExpenses = await this.repository.findAll({
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString()
    })
    const monthlyTotal = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0)

    // Get category breakdown
    const categoryBreakdown = await this.repository.getCategoryBreakdown(start, end)

    // Get frequency breakdown
    const frequencyBreakdown = await this.repository.getFrequencyBreakdown(start, end)

    return {
      totalExpenses,
      monthlyTotal,
      categoryBreakdown,
      frequencyBreakdown
    }
  }
}
