import { PrismaClient } from '../../generated/prisma/client.js'
import { CreateExpenseDTO, UpdateExpenseDTO, ExpenseFilters } from '../types/expenses.types.js'

export class ExpensesRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filters?: ExpenseFilters) {
    const where: any = {}

    if (filters?.startDate || filters?.endDate) {
      where.date = {}
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate)
      }
    }

    if (filters?.category) {
      where.category = filters.category
    }

    if (filters?.frequency) {
      where.frequency = filters.frequency
    }

    return this.prisma.expenses.findMany({
      where,
      orderBy: { date: 'desc' }
    })
  }

  async findById(id: string) {
    return this.prisma.expenses.findUnique({
      where: { id }
    })
  }

  async create(data: CreateExpenseDTO) {
    return this.prisma.expenses.create({
      data: {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: data.category,
        date: new Date(data.date),
        amount: data.amount,
        description: data.description,
        frequency: data.frequency,
        attachment: data.attachment || null,
        updatedAt: new Date()
      }
    })
  }

  async update(id: string, data: UpdateExpenseDTO) {
    const updateData: any = {
      updatedAt: new Date()
    }

    if (data.category !== undefined) updateData.category = data.category
    if (data.date !== undefined) updateData.date = new Date(data.date)
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.description !== undefined) updateData.description = data.description
    if (data.frequency !== undefined) updateData.frequency = data.frequency
    if (data.attachment !== undefined) updateData.attachment = data.attachment

    return this.prisma.expenses.update({
      where: { id },
      data: updateData
    })
  }

  async delete(id: string) {
    return this.prisma.expenses.delete({
      where: { id }
    })
  }

  async getMonthlyTotal(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const result = await this.prisma.expenses.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    })

    return result._sum.amount || 0
  }

  async getCategoryBreakdown(startDate: Date, endDate: Date) {
    const expenses = await this.prisma.expenses.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        category: true,
        amount: true
      }
    })

    const breakdown = expenses.reduce((acc, exp) => {
      const category = exp.category
      acc[category] = (acc[category] || 0) + exp.amount
      return acc
    }, {} as Record<string, number>)

    const total = Object.values(breakdown).reduce((sum, amount) => sum + amount, 0)

    return Object.entries(breakdown).map(([category, amount]) => ({
      category,
      total: amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    }))
  }

  async getFrequencyBreakdown(startDate: Date, endDate: Date) {
    const expenses = await this.prisma.expenses.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        frequency: true,
        amount: true
      }
    })

    const breakdown = expenses.reduce((acc, exp) => {
      const frequency = exp.frequency
      if (!acc[frequency]) {
        acc[frequency] = { total: 0, count: 0 }
      }
      acc[frequency].total += exp.amount
      acc[frequency].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    return Object.entries(breakdown).map(([frequency, data]) => ({
      frequency,
      total: data.total,
      count: data.count
    }))
  }
}
