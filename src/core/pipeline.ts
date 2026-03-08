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
    const ext = getExtension(filePath);

    const id = uuid();

    const outputDir = path.join(this.config.storage.baseDir, id);

    if ([".mp4", ".mov", ".mkv"].includes(ext)) {
      return processVideo(filePath, outputDir, this.resolutions);
    }

    throw new Error("Unsupported media type");
  }
}
