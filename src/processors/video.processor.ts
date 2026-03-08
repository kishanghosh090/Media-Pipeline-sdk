import path from "path";
import { runCommand } from "../utils/ffmpeg";
import { ensureDir } from "../utils/file";
import { HLS_PROFILES } from "../utils/hlsProfiles";
import { ProcessResult } from "../types/media.types";

export async function processVideo(
  input: string,
  outputDir: string,
  resolutions: string[],
): Promise<ProcessResult> {
  await ensureDir(outputDir);

  const profiles = resolutions.map((r) => HLS_PROFILES[r]);

  if (!profiles.length) {
    throw new Error("No valid HLS profiles");
  }

  const splitLabels = resolutions.map((_, i) => `[v${i}]`).join("");

  const splitFilter = `[0:v]split=${resolutions.length}${splitLabels}`;

  const scaleFilters = resolutions
    .map((r, i) => {
      const height = HLS_PROFILES[r]!!.height;
      return `[v${i}]scale=w=-2:h=${height}[v${i}out]`;
    })
    .join(";");

  const filterComplex = `"${splitFilter};${scaleFilters}"`;

  const maps = resolutions
    .map((_, i) => `-map "[v${i}out]" -map 0:a:0?`)
    .join(" ");

  const bitrateConfig = resolutions
    .map((r, i) => {
      const p = HLS_PROFILES[r]!!;

      return `-b:v:${i} ${p.bitrate} -maxrate:v:${i} ${p.maxrate} -bufsize:v:${i} ${p.bufsize} -b:a:${i} ${p.audio}`;
    })
    .join(" ");

  const varStreamMap = resolutions
    .map((r, i) => `v:${i},a:${i},name:${r}p`)
    .join(" ");

  const command = [
    `ffmpeg -i "${input}"`,
    "-filter_complex",
    filterComplex,
    maps,
    "-c:v libx264 -preset veryfast -crf 20",
    "-c:a aac -ar 48000",
    bitrateConfig,
    "-g 48 -keyint_min 48 -sc_threshold 0",
    "-f hls",
    "-hls_time 6",
    "-hls_playlist_type vod",
    "-hls_flags independent_segments",
    `-hls_segment_filename "${outputDir}/segment_%v_%03d.ts"`,
    "-master_pl_name master.m3u8",
    `-var_stream_map "${varStreamMap}"`,
    `"${outputDir}/index_%v.m3u8"`,
  ].join(" ");

  await runCommand(command);

  return {
    type: "video",
    variants: [
      {
        name: "hls",
        path: path.join(outputDir, "master.m3u8"),
      },
    ],
  };
}
