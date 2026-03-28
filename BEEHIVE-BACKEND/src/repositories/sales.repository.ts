import { PrismaClient } from '../../generated/prisma/client.js';
import { SalesFilters } from '../types/sales.types.js';

export class SalesRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getSalesMetrics(startDate: Date, endDate: Date) {
    // Get current period orders
    const orders = await this.prisma.orders.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        paymentStatus: 'PAID'
      },
      include: {
        order_items: {
          include: {
            menu_items: true
          }
        }
      }
    });

    // Calculate previous period dates
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate);

    // Get previous period orders
    const previousOrders = await this.prisma.orders.findMany({
      where: {
        createdAt: {
          gte: prevStartDate,
          lt: prevEndDate
        },
        paymentStatus: 'PAID'
      }
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const previousRevenue = previousOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      orders,
      totalRevenue,
      totalOrders,
      previousRevenue
    };
  }

  async getDailySales(startDate: Date, endDate: Date) {
    const orders = await this.prisma.orders.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        paymentStatus: 'PAID'
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group orders by date
    const dailySalesMap = new Map<string, { totalSales: number; orders: number }>();

    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = dailySalesMap.get(dateKey);
      
      if (existing) {
        existing.totalSales += order.totalAmount;
        existing.orders += 1;
      } else {
        dailySalesMap.set(dateKey, {
          totalSales: order.totalAmount,
          orders: 1
        });
      }
    });

    return Array.from(dailySalesMap.entries()).map(([date, data]) => ({
      date,
      totalSales: data.totalSales,
      totalOrders: data.orders,
      averageOrder: data.totalSales / data.orders
    }));
  }

  async getTopSellingItems(startDate: Date, endDate: Date, limit: number = 10) {
    const orderItems = await this.prisma.order_items.findMany({
      where: {
        orders: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          paymentStatus: 'PAID'
        }
      },
      include: {
        menu_items: true
      }
    });

    // Aggregate by menu item
    const itemSales = new Map<string, { itemId: string; itemName: string; quantity: number; revenue: number }>();

    orderItems.forEach(item => {
      const existing = itemSales.get(item.menuItemId);
      
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.subtotal;
      } else {
        itemSales.set(item.menuItemId, {
          itemId: item.menuItemId,
          itemName: item.menu_items.name,
          quantity: item.quantity,
          revenue: item.subtotal
        });
      }
    });

    return Array.from(itemSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getCategorySales(startDate: Date, endDate: Date) {
    const orderItems = await this.prisma.order_items.findMany({
      where: {
        orders: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          paymentStatus: 'PAID'
        }
      },
      include: {
        menu_items: {
          include: {
            category: true
          }
        }
      }
    });

    // Aggregate by category
    const categorySales = new Map<string, { revenue: number; orders: Set<string> }>();

    orderItems.forEach(item => {
      const category = item.menu_items.category?.displayName || item.menu_items.categoryId;
      const existing = categorySales.get(category);
      
      if (existing) {
        existing.revenue += item.subtotal;
        existing.orders.add(item.orderId);
      } else {
        categorySales.set(category, {
          revenue: item.subtotal,
          orders: new Set([item.orderId])
        });
      }
    });

    const totalRevenue = Array.from(categorySales.values()).reduce((sum, cat) => sum + cat.revenue, 0);

    return Array.from(categorySales.entries()).map(([category, data]) => ({
      category,
      revenue: data.revenue,
      orders: data.orders.size,
      percentage: (data.revenue / totalRevenue) * 100
    }));
  }

  async getHourlySales(startDate: Date, endDate: Date) {
    const orders = await this.prisma.orders.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        paymentStatus: 'PAID'
      }
    });

    // Group by hour
    const hourlySales = new Map<number, { orders: number; revenue: number }>();

    orders.forEach(order => {
      const hour = order.createdAt.getHours();
      const existing = hourlySales.get(hour);
      
      if (existing) {
        existing.orders += 1;
        existing.revenue += order.totalAmount;
      } else {
        hourlySales.set(hour, {
          orders: 1,
          revenue: order.totalAmount
        });
      }
    });

    // Fill in missing hours with zero values
    const result = [];
    for (let hour = 0; hour < 24; hour++) {
      const data = hourlySales.get(hour) || { orders: 0, revenue: 0 };
      result.push({
        hour,
        orders: data.orders,
        revenue: data.revenue
      });
    }

    return result;
  }
}
