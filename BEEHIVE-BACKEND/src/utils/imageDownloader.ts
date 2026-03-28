import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function downloadImage(imageUrl: string): Promise<string> {
  try {
    // Validate URL
    const url = new URL(imageUrl);
    
    // Generate unique filename
    const ext = path.extname(url.pathname) || '.jpg';
    const filename = `menu-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    const uploadDir = path.join(__dirname, '../../public/uploads/menu-images');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filepath = path.join(uploadDir, filename);
    
    // Download image
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      timeout: 10000, // 10 second timeout
      maxContentLength: 5 * 1024 * 1024, // 5MB max
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BeehiveBot/1.0)'
      }
    });
    
    // Check content type
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('URL does not point to an image');
    }
    
    // Save to file
    const writer = fs.createWriteStream(filepath);
    await pipeline(response.data, writer);
    
    // Return relative path for database
    return `/uploads/menu-images/${filename}`;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
    throw error;
  }
}
