export interface RegisterDTO {
  phone: string;
  password: string;
  name: string;
  email?: string;
  role?: 'CUSTOMER' | 'CASHIER' | 'COOK' | 'MANAGER' | 'ADMIN';
}

export interface LoginDTO {
  email?: string;
  phone?: string;
  username?: string;
  password: string;
}

export interface UpdateUserDTO {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  cardNumber?: string;
  isActive?: boolean;
  role?: 'CUSTOMER' | 'CASHIER' | 'COOK' | 'MANAGER' | 'ADMIN';
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'CASHIER' | 'COOK' | 'MANAGER' | 'ADMIN';
  phone?: string;
  cardNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface AuthResponse {
  user: UserDTO;
  token: string;
}
