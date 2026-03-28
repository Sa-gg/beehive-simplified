import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  getStats = async (_req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.dashboardService.getDashboardStats();
      res.json(data);
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ 
        message: 'Failed to get dashboard stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
