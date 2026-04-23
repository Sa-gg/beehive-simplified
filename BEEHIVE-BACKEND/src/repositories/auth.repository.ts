import { PrismaClient } from '../../generated/prisma/client.js';
import { RegisterDTO, UpdateUserDTO, UserDTO } from "../types/auth.types.js";

export class AuthRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: RegisterDTO & { hashedPassword: string; email: string }) {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return this.prisma.users.create({
      data: {
        id: userId,
        email: data.email,
        password: data.hashedPassword,
        name: data.name,
        role: data.role || 'CUSTOMER',
        phone: data.phone,
        updatedAt: new Date()
      }
    });
  }

  async findByEmail(email: string) {
    if (!email || !email.trim()) {
      return null;
    }

    return this.prisma.users.findUnique({
      where: { email }
    });
  }

  async findByPhone(phone: string) {
    return this.prisma.users.findFirst({
      where: { phone }
    });
  }

  async findById(id: string) {
    return this.prisma.users.findUnique({
      where: { id }
    });
  }

  async findByCardNumber(cardNumber: string) {
    return this.prisma.users.findUnique({
      where: { cardNumber }
    });
  }

  async findAll(role?: string) {
    return this.prisma.users.findMany({
      where: role ? { role: role as any } : undefined,
      orderBy: { createdAt: 'desc' }
    });
  }

  async update(id: string, data: UpdateUserDTO) {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.password !== undefined) updateData.password = data.password;
    if (data.cardNumber !== undefined) updateData.cardNumber = data.cardNumber;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.role !== undefined) updateData.role = data.role;

    return this.prisma.users.update({
      where: { id },
      data: updateData
    });
  }

  async updateLastLogin(id: string) {
    return this.prisma.users.update({
      where: { id },
      data: { 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async delete(id: string) {
    return this.prisma.users.delete({
      where: { id }
    });
  }
}
