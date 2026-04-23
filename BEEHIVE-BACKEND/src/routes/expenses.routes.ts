import { Router } from 'express'
import { ExpensesController } from "../controllers/expenses.controller.js"

export function createExpensesRoutes(controller: ExpensesController): Router {
  const router = Router()

  router.get('/', controller.getAllExpenses)
  router.get('/summary', controller.getExpenseSummary)
  router.get('/:id', controller.getExpenseById)
  router.post('/', controller.createExpense)
  router.put('/:id', controller.updateExpense)
  router.delete('/:id', controller.deleteExpense)

  return router
}
