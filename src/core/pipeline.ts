import path from "path";
import { v4 as uuid } from "uuid";

import { processVideo } from "../processors/video.processor";
import { getExtension } from "../utils/file";
import { validateConfig } from "./config";
import { PipelineConfig } from "../types/media.types";
import fs from "fs";

export class MediaPipelineSDK {
  private config: PipelineConfig;
  private resolutions: string[];
  private isCleanTheOriginalFileFromLocalPath?: boolean;
  constructor(
    config: PipelineConfig,
    resolutions: string[],
    isCleanTheOriginalFileFromLocalPath?: boolean,
  ) {
    this.config = validateConfig(config);
    this.resolutions = resolutions?.length ? resolutions : ["720"];
  }

  async process(filePath: string) {
    if (
      this.isCleanTheOriginalFileFromLocalPath === true &&
      this.config.storage.type !== "local"
    ) {
      throw new Error(
        "Auto-cleaning the original file is only supported with local storage.",
      );
    }
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

    const inputFilePath = filePath.trim();
    const baseDir = this.config.storage.baseDir.trim();

    const ext = getExtension(inputFilePath);

    const id = uuid();

    const outputDir = path.join(baseDir, id);

    if ([".mp4", ".mov", ".mkv"].includes(ext)) {
      const response = await processVideo(
        inputFilePath,
        outputDir,
        this.resolutions,
      );

      if (this.isCleanTheOriginalFileFromLocalPath === true) {
        try {
          await fs.promises.unlink(inputFilePath);
        } catch (error: any) {
          if (error?.code !== "ENOENT") {
            throw new Error(
              `Failed to remove original file at path: ${inputFilePath}`,
            );
          }
        }
      }

      return response;
    }

    throw new Error("Unsupported media type");
  }
}
