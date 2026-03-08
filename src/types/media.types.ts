export type MediaType = "video" | "image";
export type StorageType =
  | "local"
  | "s3"
  | "gcs"
  | "azure"
  | "cloudflare"
  | "cloudinary";
export type VideoResolution = "1080" | "720" | "480" | "360";

export interface MediaVariant {
  name: string;
  path: string;
}

export interface ProcessResult {
  type: MediaType;
  variants: MediaVariant[];
}

export interface PipelineConfig {
  storage: {
    type: StorageType;
    baseDir: string;
  };
}
