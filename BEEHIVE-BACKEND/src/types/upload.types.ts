export interface ImageUploadResponse {
  path: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface ImageUrlUploadRequest {
  url: string;
}

export interface ImageUrlUploadResponse {
  path: string;
  originalUrl: string;
}

export interface UploadedFile {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}
