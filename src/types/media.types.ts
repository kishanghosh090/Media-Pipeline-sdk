export type MediaType = "video" | "image";
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
    type: "local";
    baseDir: string;
  };
}
