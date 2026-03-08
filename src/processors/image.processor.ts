import sharp from "sharp";
import path from "path";
import { ensureDir } from "../utils/file";
import type { ProcessResult } from "../types/media.types";

export async function processImage(
  input: string,
  outputDir: string,
): Promise<ProcessResult> {
  await ensureDir(outputDir);

  const variants = [];

  const sizes = [
    { name: "thumbnail", width: 200 },
    { name: "medium", width: 800 },
    { name: "large", width: 1600 },
  ];

  for (const size of sizes) {
    const output = path.join(outputDir, `${size.name}.jpg`);

    await sharp(input).resize(size.width).jpeg({ quality: 80 }).toFile(output);

    variants.push({
      name: size.name,
      path: output,
    });
  }

  return {
    type: "image",
    variants,
  };
}
