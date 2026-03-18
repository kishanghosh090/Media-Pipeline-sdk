import type { PipelineConfig } from "../types/media.types";

function validateConfig(config: PipelineConfig) {
  if (!config.storage) {
    throw new Error("Storage configuration required");
  }

  if (
    config.storage.type !== "local" &&
    config.storage.type !== "cloudinary" &&
    config.storage.type !== "s3"
  ) {
    throw new Error("Only local, cloudinary, and s3 storage are supported");
  }

  return config;
}

export { validateConfig };
