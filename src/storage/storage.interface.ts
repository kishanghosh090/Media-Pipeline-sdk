export interface StorageProvider {
  save(filePath: string, destination: string): Promise<string>;
  getPath(destination: string): string;
  delete(filePath: string): Promise<void>;
}
