import { FileStorageRepository } from '../repositories/fileStorage.repository.js';
import { downloadImage as downloadImageUtil } from '../utils/imageDownloader.js';
import { ImageUploadResponse, ImageUrlUploadResponse, UploadedFile } from '../types/upload.types.js';

export class UploadService {
  private fileStorageRepository: FileStorageRepository;

  constructor(fileStorageRepository: FileStorageRepository) {
    this.fileStorageRepository = fileStorageRepository;
  }

  async uploadImageFile(file: UploadedFile): Promise<ImageUploadResponse> {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only images are allowed');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    const relativePath = this.fileStorageRepository.getRelativePath(file.filename);

    return {
      path: relativePath,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    };
  }

  async downloadImageFromUrl(url: string): Promise<ImageUrlUploadResponse> {
    if (!url || url.trim().length === 0) {
      throw new Error('Image URL is required');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Validate URL protocol
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are supported');
    }

    // Download the image using the utility function
    const imagePath = await downloadImageUtil(url);

    return {
      path: imagePath,
      originalUrl: url
    };
  }

  async deleteImage(filename: string): Promise<void> {
    if (!filename) {
      throw new Error('Filename is required');
    }

    if (!this.fileStorageRepository.fileExists(filename)) {
      throw new Error('File not found');
    }

    this.fileStorageRepository.deleteFile(filename);
  }

  getImageInfo(filename: string) {
    const stats = this.fileStorageRepository.getFileStats(filename);
    if (!stats) {
      throw new Error('File not found');
    }

    return {
      filename,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      path: this.fileStorageRepository.getRelativePath(filename)
    };
  }
}
