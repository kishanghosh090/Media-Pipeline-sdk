import path from "path";
import { v4 as uuid } from "uuid";

import { processVideo } from "../processors/video.processor";
import { getExtension } from "../utils/file";
import { validateConfig } from "./config";
import { PipelineConfig } from "../types/media.types";

export class MediaPipelineSDK {
  private config: PipelineConfig;
  private resolutions: string[];

  constructor(config: PipelineConfig, resolutions: string[]) {
    this.config = validateConfig(config);

    this.resolutions = resolutions?.length ? resolutions : ["720"];
  }

  async process(filePath: string) {
    if (filePath == undefined || filePath == null || filePath.trim() === "") {
      throw new Error("file is required");
    }
    if (
      this.config.storage.baseDir == undefined ||
      this.config.storage.baseDir == null ||
      this.config.storage.baseDir.trim() === ""
    ) {
      throw new Error("base directory is required");
    }

    filePath = filePath.trim();
    const baseDir = this.config.storage.baseDir.trim();

    const ext = getExtension(filePath);

    const id = uuid();

    const outputDir = path.join(baseDir, id);

    if ([".mp4", ".mov", ".mkv"].includes(ext)) {
      return processVideo(filePath, outputDir, this.resolutions);
    }

    throw new Error("Unsupported media type");
  }
}
