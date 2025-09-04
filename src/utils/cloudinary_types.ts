// In a new file, e.g., types/cloudinary.types.ts
import { Express } from "express";

export interface ICloudinaryFile extends Express.Multer.File {
  path: string;
  format?: string;
  resource_type?: string;
  width?: number;
  height?: number;
  duration?: number;
  public_id?: string;
}
