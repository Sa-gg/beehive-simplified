import { Request, Response } from 'express'
import { CustomersService } from '../services/customers.service'
import { CreateCustomerDTO, UpdateCustomerDTO, CustomerFilters } from '../types/customers.types'

export class CustomersController {
  constructor(private customersService: CustomersService) {}

  getAllCustomers = async (req: Request, res: Response) => {
    try {
      const filters: CustomerFilters = {
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string | undefined
      }

      const customers = await this.customersService.getAllCustomers(filters)
      res.json(customers)
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch customers' 
      })
    }
  }

  getCustomerById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const customer = await this.customersService.getCustomerById(id)
      res.json(customer)
    } catch (error) {
      if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json({ error: error.message })
      } else {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to fetch customer' 
        })
      }
    }
  }

  createCustomer = async (req: Request, res: Response) => {
    try {
      const data: CreateCustomerDTO = req.body
      const customer = await this.customersService.createCustomer(data)
      res.status(201).json(customer)
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('already exists') ||
        error.message.includes('Invalid') ||
        error.message.includes('must be')
      )) {
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to create customer' 
        })
      }
    }
  }

  updateCustomer = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const data: UpdateCustomerDTO = req.body
      const customer = await this.customersService.updateCustomer(id, data)
      res.json(customer)
    } catch (error) {
      if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json({ error: error.message })
      } else if (error instanceof Error && (
        error.message.includes('already exists') ||
        error.message.includes('Invalid')
      )) {
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to update customer' 
        })
      }
    }
  }

  deleteCustomer = async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      await this.customersService.deleteCustomer(id)
      res.status(204).send()
    } catch (error) {
      if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json({ error: error.message })
      } else {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Failed to delete customer' 
        })
      }
    }
  }

  getCustomerStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.customersService.getCustomerStats()
      res.json(stats)
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch customer stats' 
      })
    }
  }
}
