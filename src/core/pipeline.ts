import path from "path";
import { v4 as uuid } from "uuid";

import { processVideo } from "../processors/video.processor";
import { getExtension } from "../utils/file";
import { validateConfig } from "./config";
import { PipelineConfig } from "../types/media.types";
import fs from "fs";
import { checkFileExists } from "../utils/checkFileHaveOrNot";
import type { CloudinaryCredentials } from "../types/media.types";
import { uploadHLS } from "../utils/uploadHLS";

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

  async processLocal(filePath: string) {
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

      if (
        this.isCleanTheOriginalFileFromLocalPath === true &&
        (await checkFileExists(inputFilePath)) == true
      ) {
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

      return { ...response, outputDir };
    }

    throw new Error("Unsupported media type");
  }
  async processCloudinary(filePath: string) {
    if (this.config.storage.type != "cloudinary") {
      throw new Error(
        "Cloudinary processing is only supported with Cloudinary storage.",
      );
    }
    const credentials = this.config.storage
      .credentials as CloudinaryCredentials;
    if (
      credentials.cloudName == undefined ||
      credentials.cloudName.trim() == ""
    ) {
      throw new Error("Cloudinary cloud name is required");
    }

    if (credentials.apiKey == undefined || credentials.apiKey.trim() == "") {
      throw new Error("Cloudinary API key is required");
    }

    if (
      credentials.apiSecret == undefined ||
      credentials.apiSecret.trim() == ""
    ) {
      throw new Error("Cloudinary API secret is required");
    }

    const inputFilePath = filePath.trim();
    let outputDir;

    if (inputFilePath == "") {
      throw new Error("Input file path is required");
    }

    try {
      outputDir = (await this.processLocal(inputFilePath)).outputDir;
      const uploadResult = await uploadHLS(
        outputDir,
        credentials,
        path.basename(outputDir),
      );
      console.log(uploadResult);

      if (
        (await checkFileExists(outputDir)) == true &&
        this.isCleanTheOriginalFileFromLocalPath == true
      ) {
        try {
          await fs.promises.rm(outputDir, { recursive: true, force: true });
        } catch (rmError) {
          console.error(
            `Failed to clean up output directory at path: ${outputDir}`,
            rmError,
          );
        }
      }

      return uploadResult;
    } catch (error) {
      if (outputDir != undefined && (await checkFileExists(outputDir))) {
        try {
          await fs.promises.rm(outputDir, { recursive: true, force: true });
        } catch (rmError) {
          console.error(
            `Failed to clean up output directory at path: ${outputDir}`,
            rmError,
          );
        }
      }
      console.error("Error processing Cloudinary upload:", error);
      throw error;
    }
  }
}
