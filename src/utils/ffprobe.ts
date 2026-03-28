import { exec } from "child_process";

export function hasAudioStream(input: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "${input}"`,
      (error, stdout) => {
        if (error) {
          // If ffprobe fails, assume no audio
          resolve(false);
        } else {
          resolve(stdout.trim().length > 0);
        }
      },
    );
  });
}
