import { PrismaClient } from '../../generated/prisma/client.js';
import { CreateMenuItemDTO, UpdateMenuItemDTO, MenuItemFilters } from '../types/menuItem.types.js';
import { randomUUID } from 'crypto';

export class MenuItemRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(filters?: MenuItemFilters) {
    const where: any = {
      archived: false // Never show archived items
    };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.available !== undefined) {
      where.available = filters.available;
    }

    if (filters?.featured !== undefined) {
      where.featured = filters.featured;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return this.prisma.menu_items.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async findById(id: string) {
    return this.prisma.menu_items.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });
  }

  async create(data: CreateMenuItemDTO) {
    return this.prisma.menu_items.create({
      data: {
        id: randomUUID(),
        name: data.name,
        categoryId: data.categoryId,
        price: data.price,
        cost: data.cost ?? 0,
        image: data.image,
        description: data.description,
        available: data.available ?? true,
        featured: data.featured ?? false,
        prepTime: data.prepTime ?? 5,
        itemType: data.itemType ?? 'BASE',
        showInMenu: data.showInMenu ?? false,
        updatedAt: new Date()
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });
  }

  async update(id: string, data: UpdateMenuItemDTO) {
    return this.prisma.menu_items.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });
  }

  async delete(id: string) {
    // Soft delete - archive the item instead of deleting
    return this.prisma.menu_items.update({
      where: { id },
      data: {
        archived: true,
        available: false,
        updatedAt: new Date()
      }
    });
  }

  async bulkUpdateAvailability(ids: string[], available: boolean) {
    return this.prisma.menu_items.updateMany({
      where: {
        id: { in: ids },
        archived: false
      },
      data: {
        available,
        updatedAt: new Date()
      }
    });
  }

  async bulkUpdateOutOfStock(ids: string[], outOfStock: boolean) {
    return this.prisma.menu_items.updateMany({
      where: {
        id: { in: ids },
        archived: false
      },
      data: {
        outOfStock,
        updatedAt: new Date()
      }
    });
  }

  async getByCategory(categoryId: string) {
    return this.prisma.menu_items.findMany({
      where: { 
        categoryId: categoryId,
        available: true,
        archived: false,
        outOfStock: false
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async getByCategoryName(categoryName: string) {
    return this.prisma.menu_items.findMany({
      where: { 
        category: {
          name: categoryName
        },
        available: true,
        archived: false,
        outOfStock: false
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async getFeaturedItems() {
    return this.prisma.menu_items.findMany({
      where: { 
        featured: true,
        available: true,
        archived: false,
        outOfStock: false
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async searchByName(searchTerm: string) {
    return this.prisma.menu_items.findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: 'insensitive'
        },
        archived: false
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async count(filters?: MenuItemFilters) {
    const where: any = {
      archived: false
    };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.available !== undefined) {
      where.available = filters.available;
    }

    if (filters?.featured !== undefined) {
      where.featured = filters.featured;
    }

    return this.prisma.menu_items.count({ where });
  }

  // Note: incrementMoodViews and incrementMoodOrders have been moved to moodSettings.repository.ts
  // They now use the menu_item_mood_stats table for proper relational tracking
}
