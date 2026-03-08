import fs from "fs/promises";
import path from "path";

export class LocalStorage {
  constructor(private baseDir: string) {}

  async save(filePath: string, destination: string) {
    const target = path.join(this.baseDir, destination);

    await fs.mkdir(path.dirname(target), { recursive: true });

    await fs.copyFile(filePath, target);

    return target;
  }
}
