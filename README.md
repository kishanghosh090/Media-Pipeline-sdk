# Media Pipeline SDK

A simple TypeScript SDK for processing videos into HLS output variants and uploading to Cloudinary.

## Features

- Validate basic pipeline config
- Process video files (`.mp4`, `.mov`, `.mkv`)
- Generate HLS output (`master.m3u8` + variant playlists and segments)
- Choose one or more output resolutions
- Upload HLS files to Cloudinary with automatic retry and batch processing
- Organized storage in `mediapipeline/` folders by video ID

## Install

```bash
npm install mediapipeline-sdk
```

## Requirements

- Node.js 18+ and npm
- FFmpeg installed and available in your system `PATH`
- Cloudinary account (optional, only needed for Cloudinary upload)

### FFmpeg Installation

Install FFmpeg:

```bash
# macOS (Homebrew)
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install -y ffmpeg
```

Verify installation:

```bash
ffmpeg -version
```

### Cloudinary Setup (Optional)

To use Cloudinary upload features, set your credentials:

```ts
const credentials = {
  cloudName: "your-cloud-name",
  apiKey: "your-api-key",
  apiSecret: "your-api-secret",
};
```

## Quick Start

```ts
import { MediaPipelineSDK } from "mediapipeline-sdk";

async function main() {
  const sdk = new MediaPipelineSDK(
    {
      storage: {
        type: "local",
        baseDir: "./output",
      },
    },
    ["1080", "720", "480"],
    true,
  );

  const result = await sdk.process("./samples/input.mp4");

  console.log(result);
}

main().catch(console.error);
```

## API

### `new MediaPipelineSDK(config, resolutions, isCleanTheOriginalFileFromLocalPath?)`

- `config.storage.type`: currently only `"local"`
- `config.storage.baseDir`: output base directory
- `resolutions`: string array like `["1080", "720", "480", "360"]`
  - If empty, defaults to `["720"]`
- `isCleanTheOriginalFileFromLocalPath` (optional):
  - `true` removes the original input file after successful processing.
  - This option is only valid when `config.storage.type` is `"local"`.

### `sdk.process(filePath)`

Processes a single media file.

- Supported input extensions: `.mp4`, `.mov`, `.mkv`
- Returns a `ProcessResult`

Example return shape:

```ts
{
  type: "video",
  variants: [
    {
      name: "hls",
      path: "output/<uuid>/master.m3u8"
    }
  ]
}
```

### `sdk.processCloudinary(filePath, credentials)`

Processes a video file and uploads HLS output to Cloudinary.

**Parameters:**

- `filePath`: Path to input video file
- `credentials`: Cloudinary credentials object
  ```ts
  {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  }
  ```

**Returns:** Master playlist URL (string)

**Features:**

- Uploads all HLS segments and playlists to Cloudinary
- Organizes files in `mediapipeline/{videoId}/` folder structure
- Automatic retry with exponential backoff for failed uploads
- Batch processing (4 concurrent uploads per batch) to avoid timeouts
- Returns only the master playlist URL for easy streaming

Example:

```ts
const masterUrl = await sdk.processCloudinary("./input.mp4", {
  cloudName: "your-cloud",
  apiKey: "your-key",
  apiSecret: "your-secret",
});

console.log(masterUrl);
// Output: https://res.cloudinary.com/your-cloud/raw/upload/.../mediapipeline/.../master.m3u8
```

## Development

```bash
npm install
npm run build
```

Run local dev script:

```bash
npm run dev
```

## Cloudinary Upload Configuration

The SDK includes robust upload handling with the following settings:

- **Max Concurrent Uploads:** 4 files per batch
- **Upload Timeout:** 120 seconds per file
- **Max Retry Attempts:** 3
- **Retry Backoff:** Exponential (1s, 2s, 4s)
- **Retryable Errors:** HTTP 429 (rate limit), 499 (client timeout), 5xx (server errors), TimeoutError

All HLS files are organized as: `mediapipeline/{videoId}/{filename}`

Example folder structure in Cloudinary:

```
mediapipeline/
├── 7450677b-c0bf-4053-bfc5-b29d92f37171/
│   ├── master.m3u8
│   ├── variant_1080p.m3u8
│   ├── variant_720p.m3u8
│   ├── segment_240p_001.ts
│   ├── segment_240p_002.ts
│   └── ... (more segments)
```

## Acknowledgments

This SDK is made possible by [FFmpeg](https://ffmpeg.org/), a complete, cross-platform solution to record, convert and stream audio and video. Special thanks to the FFmpeg team for their incredible work on this essential media processing tool.
