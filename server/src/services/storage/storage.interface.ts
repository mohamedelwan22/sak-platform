export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadedFile {
  path: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface IStorageService {
  upload(file: MulterFile, subfolder: string): Promise<UploadedFile>;
  getFilePath(relativePath: string): string;
  delete(relativePath: string): Promise<void>;
}
