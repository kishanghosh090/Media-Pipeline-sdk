import path from "path";
import { v4 as uuid } from "uuid";

import { processVideo } from "../processors/video.processor";
import { getExtension } from "../utils/file";
import { validateConfig } from "./config";
import { PipelineConfig } from "../types/media.types";
import fs from "fs";
import { checkFileExists } from "../utils/checkFileHaveOrNot";
import type {
  CloudinaryCredentials,
  S3Credentials,
} from "../types/media.types";
import { uploadHLS } from "../utils/uploadHLS";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
          throw Error(
            `Failed to clean up output directory at path: ${outputDir}`,
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
          throw Error(
            `Failed to clean up output directory at path: ${outputDir}`,
          );
        }
      }
      console.error("Error processing Cloudinary upload:", error);
      throw error;
    }
  }

  async processS3(filePath: string) {
    if (this.config.storage.type != "s3") {
      throw new Error("S3 processing is only supported with S3 storage.");
    }

    if (!filePath || filePath.trim() === "") {
      throw new Error("File path is required");
    }

    const credentials = this.config.storage.credentials as S3Credentials;

    if (
      credentials.accessKeyId == undefined ||
      credentials.accessKeyId.trim() === ""
    ) {
      throw new Error("S3 access key id is required");
    }

    if (
      credentials.secretAccessKey == undefined ||
      credentials.secretAccessKey.trim() === ""
    ) {
      throw new Error("S3 secret access key is required");
    }

    if (credentials.region == undefined || credentials.region.trim() === "") {
      throw new Error("S3 region is required");
    }

    if (credentials.bucket == undefined || credentials.bucket.trim() === "") {
      throw new Error("S3 bucket is required");
    }

    if (
      credentials.folderName == undefined ||
      credentials.folderName.trim() === ""
    ) {
      throw new Error("S3 folder name is required");
    }

    const s3Client = new S3Client({
      region: credentials.region.trim(),
      credentials: {
        accessKeyId: credentials.accessKeyId.trim(),
        secretAccessKey: credentials.secretAccessKey.trim(),
      },
    });

    const inputFilePath = filePath.trim();
    const folderName = credentials.folderName.trim();
    const bucket = credentials.bucket.trim();
    const signedUrlExpiresInSeconds = 300;
    let outputDir: string | undefined;

    const toPosixPath = (value: string) => value.split(path.sep).join("/");

    const getContentType = (fileName: string) => {
      if (fileName.endsWith(".m3u8")) {
        return "application/vnd.apple.mpegurl";
      }

      if (fileName.endsWith(".ts")) {
        return "video/mp2t";
      }

      return "application/octet-stream";
    };

    const listFilesRecursive = async (dirPath: string): Promise<string[]> => {
      const entries = await fs.promises.readdir(dirPath, {
        withFileTypes: true,
      });

      const allFiles = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            return listFilesRecursive(fullPath);
          }

          return [fullPath];
        }),
      );

      return allFiles.flat();
    };

    try {
      const localProcessResult = await this.processLocal(inputFilePath);
      outputDir = localProcessResult.outputDir;

      const uuidFolder = path.basename(outputDir);
      const folderKey = `${folderName}/`;
      const uploadPrefix = `${folderName}/${uuidFolder}`;

      // S3 does not have real directories; these placeholder objects create the folder view.
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: folderKey,
          Body: "",
          ContentLength: 0,
        }),
      );

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${uploadPrefix}/`,
          Body: "",
          ContentLength: 0,
        }),
      );

      const filesToUpload = await listFilesRecursive(outputDir);
      const relativePaths = filesToUpload.map((absoluteFilePath) =>
        toPosixPath(path.relative(outputDir as string, absoluteFilePath)),
      );

      await Promise.all(
        filesToUpload.map(async (absoluteFilePath, index) => {
          const relativePath = relativePaths[index] as string;
          const key = `${uploadPrefix}/${relativePath}`;
          const body = await fs.promises.readFile(absoluteFilePath);

          await s3Client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: body,
              ContentLength: body.length,
              ContentType: getContentType(absoluteFilePath),
            }),
          );
        }),
      );

      const masterUri = `s3://${bucket}/${uploadPrefix}/master.m3u8`;
      const playlistPaths = relativePaths.filter((file) =>
        file.endsWith(".m3u8"),
      );

      const getSignedObjectUrl = async (relativePath: string) => {
        const objectKey = `${uploadPrefix}/${relativePath}`;
        return getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            ResponseContentDisposition: "inline",
          }),
          { expiresIn: signedUrlExpiresInSeconds },
        );
      };

      for (const playlistPath of playlistPaths) {
        const playlistAbsolutePath = path.join(outputDir, playlistPath);
        const playlistContent = await fs.promises.readFile(
          playlistAbsolutePath,
          "utf8",
        );
        const playlistDir = path.posix.dirname(playlistPath);
        const signedLines: string[] = [];

        for (const line of playlistContent.split(/\r?\n/)) {
          const trimmedLine = line.trim();

          if (
            trimmedLine === "" ||
            trimmedLine.startsWith("#") ||
            /^https?:\/\//i.test(trimmedLine)
          ) {
            signedLines.push(line);
            continue;
          }

          const signedTargetRelativePath = path.posix.normalize(
            path.posix.join(
              playlistDir === "." ? "" : playlistDir,
              trimmedLine,
            ),
          );

          const signedTargetPath = signedTargetRelativePath.endsWith(".m3u8")
            ? path.posix.join("signed", signedTargetRelativePath)
            : signedTargetRelativePath;

          signedLines.push(await getSignedObjectUrl(signedTargetPath));
        }

        const signedPlaylistKey = `${uploadPrefix}/signed/${playlistPath}`;
        const signedPlaylistBody = Buffer.from(signedLines.join("\n"), "utf8");

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: signedPlaylistKey,
            Body: signedPlaylistBody,
            ContentLength: signedPlaylistBody.length,
            ContentType: "application/vnd.apple.mpegurl",
          }),
        );
      }

      const playbackUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: `${uploadPrefix}/signed/master.m3u8`,
          ResponseContentDisposition: "inline",
        }),
        { expiresIn: signedUrlExpiresInSeconds },
      );

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
          throw Error(
            `Failed to clean up output directory at path: ${outputDir}`,
          );
        }
      }

      return playbackUrl || masterUri;
    } catch (error) {
      if (outputDir != undefined && (await checkFileExists(outputDir))) {
        try {
          await fs.promises.rm(outputDir, { recursive: true, force: true });
        } catch (rmError) {
          console.error(
            `Failed to clean up output directory at path: ${outputDir}`,
            rmError,
          );
          throw Error(
            `Failed to clean up output directory at path: ${outputDir}`,
          );
        }
      }

      console.error("Error processing S3 upload:", error);
      throw error;
    }
  }
}
