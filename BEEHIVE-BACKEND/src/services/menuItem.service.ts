import { MenuItemRepository } from '../repositories/menuItem.repository.js';
import { CreateMenuItemDTO, UpdateMenuItemDTO, MenuItemFilters, MenuItemResponse } from '../types/menuItem.types.js';

export class MenuItemService {
  private repository: MenuItemRepository;

  constructor(repository: MenuItemRepository) {
    this.repository = repository;
  }

  async getAllMenuItems(filters?: MenuItemFilters): Promise<MenuItemResponse[]> {
    const items = await this.repository.findAll(filters);
    return items.map(item => this.mapToResponse(item));
  }

  async getMenuItemById(id: string): Promise<MenuItemResponse | null> {
    const item = await this.repository.findById(id);
    return item ? this.mapToResponse(item) : null;
  }

  async createMenuItem(data: CreateMenuItemDTO): Promise<MenuItemResponse> {
    // Validate required fields
    if (!data.name || !data.categoryId || data.price === undefined) {
      throw new Error('Name, categoryId, and price are required');
    }

    if (data.price < 0) {
      throw new Error('Price must be a positive number');
    }

    if (data.cost !== undefined && data.cost < 0) {
      throw new Error('Cost must be a positive number');
    }

    if (data.prepTime !== undefined && data.prepTime < 0) {
      throw new Error('Prep time must be a positive number');
    }

    const item = await this.repository.create(data);
    return this.mapToResponse(item);
  }

  async updateMenuItem(id: string, data: UpdateMenuItemDTO): Promise<MenuItemResponse> {
    // Check if menu item exists
    const existingItem = await this.repository.findById(id);
    if (!existingItem) {
      throw new Error('Menu item not found');
    }

    // Validate updated fields
    if (data.price !== undefined && data.price < 0) {
      throw new Error('Price must be a positive number');
    }

    if (data.cost !== undefined && data.cost < 0) {
      throw new Error('Cost must be a positive number');
    }

    if (data.prepTime !== undefined && data.prepTime < 0) {
      throw new Error('Prep time must be a positive number');
    }

    const updatedItem = await this.repository.update(id, data);
    return this.mapToResponse(updatedItem);
  }

  async deleteMenuItem(id: string): Promise<void> {
    const existingItem = await this.repository.findById(id);
    if (!existingItem) {
      throw new Error('Menu item not found');
    }

    await this.repository.delete(id);
  }

  async toggleAvailability(id: string): Promise<MenuItemResponse> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new Error('Menu item not found');
    }

    const updatedItem = await this.repository.update(id, { 
      available: !item.available 
    });

    return this.mapToResponse(updatedItem);
  }

  async toggleFeatured(id: string): Promise<MenuItemResponse> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new Error('Menu item not found');
    }

    const updatedItem = await this.repository.update(id, { 
      featured: !item.featured 
    });

    return this.mapToResponse(updatedItem);
  }

  async bulkUpdateAvailability(ids: string[], available: boolean): Promise<{ count: number }> {
    const result = await this.repository.bulkUpdateAvailability(ids, available);
    return { count: result.count };
  }

  async toggleOutOfStock(id: string): Promise<MenuItemResponse> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new Error('Menu item not found');
    }

    const updatedItem = await this.repository.update(id, { 
      outOfStock: !(item as any).outOfStock 
    });

    return this.mapToResponse(updatedItem);
  }

  async bulkUpdateOutOfStock(ids: string[], outOfStock: boolean): Promise<{ count: number }> {
    const result = await this.repository.bulkUpdateOutOfStock(ids, outOfStock);
    return { count: result.count };
  }

  async getMenuItemsByCategory(categoryId: string): Promise<MenuItemResponse[]> {
    const items = await this.repository.getByCategory(categoryId);
    return items.map(item => this.mapToResponse(item));
  }

  async getMenuItemsByCategoryName(categoryName: string): Promise<MenuItemResponse[]> {
    const items = await this.repository.getByCategoryName(categoryName);
    return items.map(item => this.mapToResponse(item));
  }

  async getFeaturedMenuItems(): Promise<MenuItemResponse[]> {
    const items = await this.repository.getFeaturedItems();
    return items.map(item => this.mapToResponse(item));
  }

  async searchMenuItems(searchTerm: string): Promise<MenuItemResponse[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const items = await this.repository.searchByName(searchTerm);
    return items.map(item => this.mapToResponse(item));
  }

  async getMenuItemsStats() {
    const [
      totalItems,
      availableItems,
      unavailableItems,
      featuredItems
    ] = await Promise.all([
      this.repository.count(),
      this.repository.count({ available: true }),
      this.repository.count({ available: false }),
      this.repository.count({ featured: true })
    ]);

    return {
      total: totalItems,
      available: availableItems,
      unavailable: unavailableItems,
      featured: featuredItems
    };
  }

  private mapToResponse(item: any): MenuItemResponse {
    return {
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      category: item.category ? {
        id: item.category.id,
        name: item.category.name,
        displayName: item.category.displayName
      } : undefined,
      price: item.price,
      cost: item.cost,
      image: item.image,
      description: item.description,
      available: item.available,
      featured: item.featured,
      prepTime: item.prepTime,
      itemType: item.itemType || 'BASE',  // Default to BASE for existing items
      showInMenu: item.showInMenu ?? false,  // For ADDON items: whether to show in regular menu
      outOfStock: item.outOfStock ?? false,  // Whether product is marked as out of stock
      archived: item.archived ?? false,      // Whether product is archived (soft deleted)
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }
}
