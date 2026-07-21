import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import type { IStorageService, MulterFile, UploadedFile } from "./storage.interface.js";
import { NotFoundError } from "../../lib/errors.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export class LocalStorageService implements IStorageService {
  async upload(file: MulterFile, subfolder: string): Promise<UploadedFile> {
    const dir = path.join(UPLOADS_DIR, subfolder);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `${crypto.randomUUID()}${ext}`;
    const dest = path.join(dir, filename);

    await fs.writeFile(dest, file.buffer);

    const relativePath = `${subfolder}/${filename}`;

    return {
      path: relativePath,
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  getFilePath(relativePath: string): string {
    return path.join(UPLOADS_DIR, relativePath);
  }

  async delete(relativePath: string): Promise<void> {
    const filePath = path.join(UPLOADS_DIR, relativePath);
    try {
      await fs.unlink(filePath);
    } catch {
      throw new NotFoundError("File not found");
    }
  }
}
