import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileStorageRepository {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(__dirname, '../../public/uploads/menu-images');
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getUploadDirectory(): string {
    return this.uploadDir;
  }

  fileExists(filename: string): boolean {
    const filePath = path.join(this.uploadDir, filename);
    return fs.existsSync(filePath);
  }

  deleteFile(filename: string): void {
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getFileStats(filename: string): fs.Stats | null {
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      return fs.statSync(filePath);
    }
    return null;
  }

  getRelativePath(filename: string): string {
    return `/uploads/menu-images/${filename}`;
  }
}
