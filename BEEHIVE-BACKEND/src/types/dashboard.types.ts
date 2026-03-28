export interface DashboardStats {
  totalSales: number;
  ordersToday: number;
  activeCustomers: number;
  pendingOrders: number;
  salesChange: number;
  ordersChange: number;
  customersChange: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
}
