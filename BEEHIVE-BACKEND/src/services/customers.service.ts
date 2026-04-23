import { CustomersRepository } from "../repositories/customers.repository.js"
import { Customer, CreateCustomerDTO, UpdateCustomerDTO, CustomerFilters, CustomerStats } from "../types/customers.types.js"

export class CustomersService {
  constructor(private customersRepository: CustomersRepository) {}

  async getAllCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    return await this.customersRepository.findAll(filters)
  }

  async getCustomerById(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findById(id)
    
    if (!customer) {
      throw new Error('Customer not found')
    }

    return customer
  }

  async createCustomer(data: CreateCustomerDTO): Promise<Customer> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format')
    }

    // Check if email already exists
    const existingEmail = await this.customersRepository.findByEmail(data.email)
    if (existingEmail) {
      throw new Error('Email already exists')
    }

    // Check if card number already exists (if provided)
    if (data.cardNumber) {
      const existingCard = await this.customersRepository.findByCardNumber(data.cardNumber)
      if (existingCard) {
        throw new Error('Card number already exists')
      }
    }

    // Validate password strength
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    return await this.customersRepository.create(data)
  }

  async updateCustomer(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    // Check if customer exists
    const existingCustomer = await this.customersRepository.findById(id)
    if (!existingCustomer) {
      throw new Error('Customer not found')
    }

    // Validate email format if updating email
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format')
      }

      // Check if new email already exists
      const existingEmail = await this.customersRepository.findByEmail(data.email)
      if (existingEmail && existingEmail.id !== id) {
        throw new Error('Email already exists')
      }
    }

    // Check if new card number already exists (if provided)
    if (data.cardNumber) {
      const existingCard = await this.customersRepository.findByCardNumber(data.cardNumber)
      if (existingCard && existingCard.id !== id) {
        throw new Error('Card number already exists')
      }
    }

    return await this.customersRepository.update(id, data)
  }

  async deleteCustomer(id: string): Promise<void> {
    const customer = await this.customersRepository.findById(id)
    if (!customer) {
      throw new Error('Customer not found')
    }

    await this.customersRepository.delete(id)
  }

  async getCustomerStats(): Promise<CustomerStats> {
    return await this.customersRepository.getStats()
  }
}
