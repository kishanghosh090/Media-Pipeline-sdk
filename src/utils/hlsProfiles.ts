export const HLS_PROFILES: Record<
  string,
  {
    height: number;
    bitrate: string;
    maxrate: string;
    bufsize: string;
    audio: string;
  }
> = {
  "1080": {
    height: 1080,
    bitrate: "5000k",
    maxrate: "5350k",
    bufsize: "7500k",
    audio: "192k",
  },
  "720": {
    height: 720,
    bitrate: "2800k",
    maxrate: "2996k",
    bufsize: "4200k",
    audio: "128k",
  },
  "480": {
    height: 480,
    bitrate: "1400k",
    maxrate: "1498k",
    bufsize: "2100k",
    audio: "128k",
  },
  "360": {
    height: 360,
    bitrate: "800k",
    maxrate: "856k",
    bufsize: "1200k",
    audio: "96k",
  },
  "240": {
    height: 240,
    bitrate: "400k",
    maxrate: "428k",
    bufsize: "600k",
    audio: "64k",
  },
};
