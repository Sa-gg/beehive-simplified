import { Router } from 'express'
import { CustomersController } from '../controllers/customers.controller'

export const createCustomersRoutes = (customersController: CustomersController) => {
  const router = Router()

  router.get('/', customersController.getAllCustomers)
  router.get('/stats', customersController.getCustomerStats)
  router.get('/:id', customersController.getCustomerById)
  router.post('/', customersController.createCustomer)
  router.put('/:id', customersController.updateCustomer)
  router.delete('/:id', customersController.deleteCustomer)

  return router
}
