import { DashboardRepository } from "../repositories/dashboard.repository.js";
import { DashboardResponse } from "../types/dashboard.types.js";

export class DashboardService {
  constructor(private dashboardRepository: DashboardRepository) {}

  async getDashboardStats(): Promise<DashboardResponse> {
    const stats = await this.dashboardRepository.getDashboardStats();
    return { stats };
  }
}
