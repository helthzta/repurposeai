import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "repurposeai-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Extracts the last frame of a video as a JPEG — used to seed a continuation clip. */
export async function extractLastFrame(videoBytes: Uint8Array): Promise<Buffer> {
  return withTempDir(async (dir) => {
    const inPath = path.join(dir, "in.mp4");
    const outPath = path.join(dir, "out.jpg");
    await writeFile(inPath, videoBytes);
    await run(ffmpegPath as string, [
      "-y",
      "-sseof",
      "-1",
      "-i",
      inPath,
      "-update",
      "1",
      "-q:v",
      "2",
      outPath,
    ]);
    return readFile(outPath);
  });
}

/**
 * Concatenates same-codec clips into one continuous video via stream copy (no re-encode).
 * ponytail: assumes identical codec params across clips — true here since every clip in a
 * chain comes from the same model/resolution/quality. Switch to a filter-based concat with
 * re-encoding if that assumption ever breaks.
 */
export async function concatVideos(clips: Uint8Array[]): Promise<Buffer> {
  return withTempDir(async (dir) => {
    const listPath = path.join(dir, "list.txt");
    const outPath = path.join(dir, "out.mp4");
    const lines: string[] = [];
    for (const [i, bytes] of clips.entries()) {
      const partPath = path.join(dir, `part${i}.mp4`);
      await writeFile(partPath, bytes);
      lines.push(`file '${partPath.replace(/'/g, "'\\''")}'`);
    }
    await writeFile(listPath, lines.join("\n"));
    await run(ffmpegPath as string, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      outPath,
    ]);
    return readFile(outPath);
  });
}
