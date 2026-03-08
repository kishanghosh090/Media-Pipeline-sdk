import fs from "fs/promises";
import path from "path";

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function getExtension(filePath: string) {
  return path.extname(filePath).toLowerCase();
}
