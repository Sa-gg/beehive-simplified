import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from "../repositories/auth.repository.js";
import { SettingsRepository } from "../repositories/settings.repository.js";
import { RegisterDTO, LoginDTO, UpdateUserDTO, UserDTO, AuthResponse } from "../types/auth.types.js";

export class AuthService {
  private authRepository: AuthRepository;
  private settingsRepository: SettingsRepository;
  private jwtSecret: string;

  constructor(authRepository: AuthRepository, settingsRepository: SettingsRepository) {
    this.authRepository = authRepository;
    this.settingsRepository = settingsRepository;
    this.jwtSecret = process.env.JWT_SECRET || 'beehive-secret-key-change-in-production';
  }

  private excludePassword(user: any): UserDTO {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as UserDTO;
  }

  private generateToken(userId: string, email: string, role: string, name: string): string {
    return jwt.sign(
      { userId, email, role, name },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  async register(data: RegisterDTO): Promise<AuthResponse> {
    // Validate phone number (required)
    if (!data.phone) {
      throw new Error('Phone number is required');
    }

    const phoneRegex = /^09[0-9]{9}$/;
    if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
      throw new Error('Phone number must start with 09 and be 11 digits (e.g. 09123456789)');
    }

    // Check if phone already exists
    const existingByPhone = await this.authRepository.findByPhone(data.phone);
    if (existingByPhone) {
      if (!existingByPhone.isActive) {
        throw new Error(`This phone number belongs to an archived account (${existingByPhone.name}). Reactivate that account instead of creating a new one.`);
      }
      throw new Error('Phone number is already registered to another account.');
    }

    // If email is provided, validate and check for duplicates
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
      
      const existingByEmail = await this.authRepository.findByEmail(data.email);
      if (existingByEmail) {
        if (!existingByEmail.isActive) {
          throw new Error(`This email belongs to an archived account (${existingByEmail.name}). Reactivate that account instead of creating a new one.`);
        }
        throw new Error('Email is already registered to another account.');
      }
    }

    // Validate password length
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user - use phone as email if email not provided
    const user = await this.authRepository.create({
      ...data,
      email: data.email || `${data.phone.replace(/[^0-9]/g, '')}@phone.beehive`,
      hashedPassword
    });

    // Generate card number for customers
    if (user.role === 'CUSTOMER') {
      const cardNumber = `BH${Date.now().toString().slice(-8)}`;
      await this.authRepository.update(user.id, { cardNumber });
      user.cardNumber = cardNumber;
    }

    // Generate token - use phone if no real email
    const token = this.generateToken(user.id, user.email, user.role, user.name);

    return {
      user: this.excludePassword(user),
      token
    };
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    const identifier = (data.email || data.phone || data.username || '').trim();
    const password = data.password;

    if (!identifier || !password) {
      throw new Error('Email/phone and password are required');
    }

    // Support current and legacy clients that send email, phone, or username.
    let user = null;
    if (identifier.includes('@')) {
      user = await this.authRepository.findByEmail(identifier);
      if (!user) {
        user = await this.authRepository.findByPhone(identifier);
      }
    } else {
      user = await this.authRepository.findByPhone(identifier);
      if (!user) {
        user = await this.authRepository.findByEmail(identifier);
      }
    }
    
    if (!user) {
      throw new Error('Invalid email/phone or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is inactive. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email/phone or password');
    }

    // Update last login
    await this.authRepository.updateLastLogin(user.id);

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role, user.name);

    return {
      user: this.excludePassword(user),
      token
    };
  }

  async getUserById(id: string): Promise<UserDTO> {
    const user = await this.authRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return this.excludePassword(user);
  }

  async getAllUsers(role?: string): Promise<UserDTO[]> {
    const users = await this.authRepository.findAll(role);
    return users.map(user => this.excludePassword(user));
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<UserDTO> {
    // Check if user exists
    await this.getUserById(id);

    // If updating password, hash it
    if (data.password) {
      if (data.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      data.password = await bcrypt.hash(data.password, 10);
    }

    // If updating email, check if it's already taken
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
      
      const existingUser = await this.authRepository.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email already in use');
      }
    }

    const updatedUser = await this.authRepository.update(id, data);
    return this.excludePassword(updatedUser);
  }

  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id);
    await this.authRepository.delete(id);
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Validate manager PIN for authorization using the stored settings PIN
  async validateManagerPin(pin: string): Promise<{ valid: boolean; manager?: { id: string; name: string } }> {
    // Check against the stored PIN in settings
    if (!this.settingsRepository.validateManagerPin(pin)) {
      throw new Error('Invalid manager PIN');
    }

    // PIN valid — return the first active manager/admin as the authorizer
    const managers = await this.authRepository.findAll('MANAGER');
    const admins = await this.authRepository.findAll('ADMIN');
    const allManagers = [...managers, ...admins].filter(u => u.isActive !== false);

    if (allManagers.length === 0) {
      throw new Error('No manager account found');
    }

    return {
      valid: true,
      manager: {
        id: allManagers[0].id,
        name: allManagers[0].name
      }
    };
  }
}
