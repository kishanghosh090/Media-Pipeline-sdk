# Media Pipeline SDK

A simple TypeScript SDK for processing videos into HLS output variants.

## Features

- Validate basic pipeline config
- Process video files (`.mp4`, `.mov`, `.mkv`)
- Generate HLS output (`master.m3u8` + variant playlists and segments)
- Choose one or more output resolutions

## Install

```bash
npm install mediapipeline-sdk
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
  );

  const result = await sdk.process("./samples/input.mp4");

  console.log(result);
}

main().catch(console.error);
```

## API

### `new MediaPipelineSDK(config, resolutions)`

- `config.storage.type`: currently only `"local"`
- `config.storage.baseDir`: output base directory
- `resolutions`: string array like `["1080", "720", "480", "360"]`
  - If empty, defaults to `["720"]`

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

## Development

```bash
npm install
npm run build
```

Run local dev script:

```bash
npm run dev
```
