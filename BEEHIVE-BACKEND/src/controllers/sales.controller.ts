import { Request, Response } from 'express';
import { SalesService } from '../services/sales.service.js';
import { SalesFilters } from '../types/sales.types.js';

export class SalesController {
  private salesService: SalesService;

  constructor(salesService: SalesService) {
    this.salesService = salesService;
  }

  getSalesReport = async (req: Request, res: Response) => {
    try {
      const filters: SalesFilters = {
        period: req.query.period as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const report = await this.salesService.getSalesReport(filters);
      res.json(report);
    } catch (error) {
      console.error('Error fetching sales report:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch sales report' 
      });
    }
  };
}
