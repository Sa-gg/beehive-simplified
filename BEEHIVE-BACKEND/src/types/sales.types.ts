export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  dailyAverage: number;
  previousPeriodRevenue: number;
  revenueGrowth: number;
}

export interface DailySales {
  date: string;
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
}

export interface TopSellingItem {
  itemId: string;
  itemName: string;
  quantity: number;
  revenue: number;
}

export interface CategorySales {
  category: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface HourlySales {
  hour: number;
  orders: number;
  revenue: number;
}

export interface SalesReport {
  metrics: SalesMetrics;
  dailySales: DailySales[];
  topSellingItems: TopSellingItem[];
  categorySales: CategorySales[];
  hourlySales: HourlySales[];
  period: {
    startDate: Date;
    endDate: Date;
    type: 'today' | 'week' | 'month' | 'custom';
  };
}

export interface SalesFilters {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'week' | 'month';
}
