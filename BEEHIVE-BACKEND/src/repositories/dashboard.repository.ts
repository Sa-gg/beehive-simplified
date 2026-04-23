import { PrismaClient } from '../../generated/prisma/client.js';
import { DashboardStats } from "../types/dashboard.types.js";

export class DashboardRepository {
  constructor(private prisma: PrismaClient) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfLastWeek = new Date(startOfToday);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const startOfLastMonth = new Date(startOfToday);
    startOfLastMonth.setDate(startOfLastMonth.getDate() - 30);

    // Get today's PAID orders for sales calculation
    const todayPaidOrders = await this.prisma.orders.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
        },
        paymentStatus: 'PAID',
        status: {
          not: 'CANCELLED',
        },
      },
    });

    // Get yesterday's PAID orders for comparison
    const yesterdayPaidOrders = await this.prisma.orders.findMany({
      where: {
        createdAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
        paymentStatus: 'PAID',
        status: {
          not: 'CANCELLED',
        },
      },
    });

    // Get today's orders (all statuses except cancelled) for orders count
    const todayOrders = await this.prisma.orders.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
        },
        status: {
          in: ['PENDING', 'PREPARING', 'READY', 'COMPLETED'],
        },
      },
    });

    // Get yesterday's orders for comparison
    const yesterdayOrders = await this.prisma.orders.findMany({
      where: {
        createdAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
        status: {
          in: ['PENDING', 'PREPARING', 'READY', 'COMPLETED'],
        },
      },
    });

    // Calculate total sales today (only PAID orders)
    const totalSales = todayPaidOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount), 0);
    const yesterdaySales = yesterdayPaidOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount), 0);

    // Calculate sales change
    const salesChange = yesterdaySales > 0 
      ? ((totalSales - yesterdaySales) / yesterdaySales) * 100 
      : totalSales > 0 ? 100 : 0;

    // Orders today
    const ordersToday = todayOrders.length;
    const ordersYesterday = yesterdayOrders.length;
    const ordersChange = ordersYesterday > 0 
      ? ((ordersToday - ordersYesterday) / ordersYesterday) * 100 
      : ordersToday > 0 ? 100 : 0;

    // Get preparing orders (orders currently being prepared)
    const pendingOrders = await this.prisma.orders.count({
      where: {
        status: 'PREPARING',
      },
    });

    // Customer stats removed - no customer self-ordering
    const activeCustomers = 0;
    const customersChange = 0;

    return {
      totalSales,
      ordersToday,
      activeCustomers,
      pendingOrders,
      salesChange,
      ordersChange,
      customersChange,
    };
  }
}
