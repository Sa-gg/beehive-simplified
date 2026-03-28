import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardResponse } from '../types/dashboard.types';

export class DashboardService {
  constructor(private dashboardRepository: DashboardRepository) {}

  async getDashboardStats(): Promise<DashboardResponse> {
    const stats = await this.dashboardRepository.getDashboardStats();
    return { stats };
  }
}
