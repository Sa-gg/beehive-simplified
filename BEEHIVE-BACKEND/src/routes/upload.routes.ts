import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller.js';
import { uploadStorage } from '../utils/upload.js';

export function createUploadRoutes(controller: UploadController): Router {
  const router = Router();
  
  // Initialize multer with the custom storage configuration
  const upload = multer(uploadStorage);

  // Upload image from file
  router.post('/image', upload.single('image'), controller.uploadImageFile);

  // Download image from URL
  router.post('/image-url', controller.downloadImageFromUrl);

  // Delete image by filename
  router.delete('/image/:filename', controller.deleteImage);

  // Get image info
  router.get('/image/:filename/info', controller.getImageInfo);

  return router;
}
