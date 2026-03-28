import { Request, Response } from 'express';
import { CategoryRepository, CreateCategoryDTO, UpdateCategoryDTO } from '../repositories/category.repository.js';

export class CategoryController {
  private categoryRepository: CategoryRepository;

  constructor(categoryRepository: CategoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  // GET /api/categories
  getAll = async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await this.categoryRepository.findAll(includeInactive);
      
      // Transform the response to include itemCount
      const transformedCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        displayName: cat.displayName,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        itemCount: cat._count?.menu_items ?? 0,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt
      }));
      
      res.json({
        success: true,
        data: transformedCategories,
        count: transformedCategories.length
      });
    } catch (error: any) {
      console.error('Error getting categories:', error);
      res.status(500).json({ success: false, error: 'Failed to get categories' });
    }
  };

  // GET /api/categories/:id
  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const category = await this.categoryRepository.findById(id);
      
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      
      res.json({
        success: true,
        data: {
          id: category.id,
          name: category.name,
          displayName: category.displayName,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          itemCount: category._count?.menu_items ?? 0,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }
      });
    } catch (error: any) {
      console.error('Error getting category:', error);
      res.status(500).json({ success: false, error: 'Failed to get category' });
    }
  };

  // POST /api/categories
  create = async (req: Request, res: Response) => {
    try {
      const data: CreateCategoryDTO = req.body;
      
      // Validate required fields
      if (!data.name || !data.displayName) {
        return res.status(400).json({ success: false, error: 'Name and displayName are required' });
      }
      
      // Check if category name already exists
      const existingName = data.name.toUpperCase().replace(/\s+/g, '_');
      const existing = await this.categoryRepository.findByName(existingName);
      if (existing) {
        return res.status(400).json({ success: false, error: 'A category with this name already exists' });
      }
      
      const category = await this.categoryRepository.create(data);
      
      res.status(201).json({
        success: true,
        data: {
          id: category.id,
          name: category.name,
          displayName: category.displayName,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          itemCount: category._count?.menu_items ?? 0,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }
      });
    } catch (error: any) {
      console.error('Error creating category:', error);
      res.status(500).json({ success: false, error: 'Failed to create category' });
    }
  };

  // PUT /api/categories/:id
  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateCategoryDTO = req.body;
      
      // Check if category exists
      const existing = await this.categoryRepository.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      
      // If updating name, check for duplicates
      if (data.name) {
        const newName = data.name.toUpperCase().replace(/\s+/g, '_');
        const existingWithName = await this.categoryRepository.findByName(newName);
        if (existingWithName && existingWithName.id !== id) {
          return res.status(400).json({ success: false, error: 'A category with this name already exists' });
        }
      }
      
      const category = await this.categoryRepository.update(id, data);
      
      res.json({
        success: true,
        data: {
          id: category.id,
          name: category.name,
          displayName: category.displayName,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          itemCount: category._count?.menu_items ?? 0,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }
      });
    } catch (error: any) {
      console.error('Error updating category:', error);
      res.status(500).json({ success: false, error: 'Failed to update category' });
    }
  };

  // DELETE /api/categories/:id
  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { force } = req.query;
      
      // Check if category exists
      const existing = await this.categoryRepository.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      
      // If not forcing, do soft delete
      if (force !== 'true') {
        try {
          await this.categoryRepository.delete(id);
          res.json({ success: true, message: 'Category deleted successfully' });
        } catch (error: any) {
          // If deletion failed due to menu items, offer soft delete
          if (error.message.includes('menu items are using')) {
            return res.status(400).json({ 
              success: false,
              error: error.message,
              suggestion: 'Use ?force=true to soft-delete (deactivate) the category instead'
            });
          }
          throw error;
        }
      } else {
        // Soft delete (deactivate)
        await this.categoryRepository.softDelete(id);
        res.json({ success: true, message: 'Category deactivated successfully' });
      }
    } catch (error: any) {
      console.error('Error deleting category:', error);
      res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
  };

  // POST /api/categories/reorder
  reorder = async (req: Request, res: Response) => {
    try {
      const { categoryIds } = req.body;
      
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return res.status(400).json({ success: false, error: 'categoryIds must be a non-empty array' });
      }
      
      await this.categoryRepository.reorder(categoryIds);
      
      res.json({ success: true, message: 'Categories reordered successfully' });
    } catch (error: any) {
      console.error('Error reordering categories:', error);
      res.status(500).json({ success: false, error: 'Failed to reorder categories' });
    }
  };

  // GET /api/categories/:id/items
  getWithMenuItems = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const category = await this.categoryRepository.getWithMenuItems(id);
      
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error('Error getting category with items:', error);
      res.status(500).json({ success: false, error: 'Failed to get category with items' });
    }
  };
}
