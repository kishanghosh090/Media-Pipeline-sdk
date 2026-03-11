import type { PipelineConfig } from "../types/media.types";

function validateConfig(config: PipelineConfig) {
  if (!config.storage) {
    throw new Error("Storage configuration required");
  }

  if (config.storage.type !== "local" && config.storage.type !== "cloudinary") {
    throw new Error("Only local and cloudinary storage supported in v2");
  }

  return config;
}

export { validateConfig };
