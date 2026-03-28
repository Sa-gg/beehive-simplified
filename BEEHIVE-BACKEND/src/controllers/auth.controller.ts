import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDTO, LoginDTO, UpdateUserDTO } from '../types/auth.types';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async register(req: Request, res: Response) {
    try {
      const data: RegisterDTO = req.body;
      const result = await this.authService.register(data);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const data: LoginDTO = req.body;
      const result = await this.authService.login(data);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const user = await this.authService.getUserById(userId);
      res.json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  // Allow customers to update their own profile (name, phone)
  async updateMe(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { name, phone } = req.body;
      
      // Only allow updating name and phone for self-update
      const data: UpdateUserDTO = {};
      if (name !== undefined) data.name = name;
      if (phone !== undefined) data.phone = phone;
      
      const user = await this.authService.updateUser(userId, data);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const role = req.query.role as string | undefined;
      const users = await this.authService.getAllUsers(role);
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const user = await this.authService.getUserById(req.params.id);
      res.json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const data: UpdateUserDTO = req.body;
      const user = await this.authService.updateUser(req.params.id, data);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      await this.authService.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  // Validate manager PIN for authorization
  async validateManagerPin(req: Request, res: Response) {
    try {
      const { pin } = req.body;
      
      if (!pin) {
        return res.status(400).json({ error: 'PIN is required' });
      }
      
      const result = await this.authService.validateManagerPin(pin);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ valid: false, error: error.message });
    }
  }
}
