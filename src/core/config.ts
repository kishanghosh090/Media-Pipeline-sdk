import type { PipelineConfig } from "../types/media.types";

function validateConfig(config: PipelineConfig) {
  if (!config.storage) {
    throw new Error("Storage configuration required");
  }

  if (config.storage.type !== "local") {
    throw new Error("Only local storage supported in v1");
  }

  return config;
}

export { validateConfig };
