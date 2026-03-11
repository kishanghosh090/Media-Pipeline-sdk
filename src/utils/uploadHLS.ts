import { v2 as cloudinary } from "cloudinary";
import { CloudinaryCredentials } from "../types/media.types";
import fs from "fs";
import path from "path";

const MAX_UPLOAD_CONCURRENCY = 4;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const UPLOAD_TIMEOUT_MS = 120000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryCloudinaryUpload(error: unknown) {
  const cloudinaryError = error as {
    http_code?: number;
    error?: { http_code?: number; name?: string; message?: string };
    name?: string;
    message?: string;
  };

  const httpCode =
    cloudinaryError?.http_code ?? cloudinaryError?.error?.http_code;
  const errorName = cloudinaryError?.name ?? cloudinaryError?.error?.name;

  return (
    httpCode === 429 ||
    httpCode === 499 ||
    (typeof httpCode === "number" && httpCode >= 500) ||
    errorName === "TimeoutError"
  );
}

async function uploadFileWithRetry(filePath: string, publicId: string) {
  let attempt = 0;

  while (attempt <= MAX_RETRY_ATTEMPTS) {
    try {
      return await cloudinary.uploader.upload(filePath, {
        resource_type: "raw",
        public_id: publicId,
        overwrite: true,
        timeout: UPLOAD_TIMEOUT_MS,
      });
    } catch (error) {
      if (
        attempt === MAX_RETRY_ATTEMPTS ||
        !shouldRetryCloudinaryUpload(error)
      ) {
        throw error;
      }

      const backoffDelay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      await sleep(backoffDelay);
      attempt += 1;
    }
  }

  throw new Error(`Upload failed after retries for file: ${filePath}`);
}

function configureCloudinary(credentials: CloudinaryCredentials) {
  cloudinary.config({
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
  });
}

export async function uploadHLS(
  folderPath: string,
  credentials: CloudinaryCredentials,
  publicId: string,
) {
  // initialize cloudinary
  configureCloudinary(credentials);
  try {
    const files = fs
      .readdirSync(folderPath)
      .filter(
        (file) =>
          path.extname(file) === ".m3u8" || path.extname(file) === ".ts",
      );

    if (!files.length) {
      throw new Error(`No HLS files found in folder: ${folderPath}`);
    }

    const sortedFiles = [...files].sort((a, b) => {
      const aExt = path.extname(a);
      const bExt = path.extname(b);

      if (aExt === ".ts" && bExt === ".m3u8") {
        return -1;
      }

      if (aExt === ".m3u8" && bExt === ".ts") {
        return 1;
      }

      return a.localeCompare(b);
    });

    const results = [];

    for (let i = 0; i < sortedFiles.length; i += MAX_UPLOAD_CONCURRENCY) {
      const currentBatch = sortedFiles.slice(i, i + MAX_UPLOAD_CONCURRENCY);
      const batchUploads = currentBatch.map((file) => {
        const filePath = path.join(folderPath, file);
        return uploadFileWithRetry(
          filePath,
          `mediapipeline/${publicId}/${file}`,
        );
      });

      const batchResults = await Promise.all(batchUploads);
      results.push(...batchResults);
    }

    const masterFile = results.find(
      (file) =>
        file.original_filename === "master" ||
        file.original_filename?.includes("master"),
    );

    if (!masterFile) {
      throw new Error("Master HLS playlist not found in upload results");
    }

    return masterFile.secure_url;
  } catch (error) {
    throw new Error(
      `Failed to upload HLS files to Cloudinary: ${JSON.stringify(error)}`,
    );
  }
}
