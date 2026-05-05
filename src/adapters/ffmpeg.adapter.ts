import type { Adapter, Operation, ResizeOp, ConvertOp, Fixture, ImageFormat } from "../types";
import { resolveOpDimensions } from "../operations/definitions";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const FORMAT_EXT: Record<ImageFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

const KERNEL_FLAGS: Record<string, string> = {
  lanczos3: "lanczos",
  lanczos2: "lanczos",
  bilinear: "bilinear",
  linear: "bilinear",
  cubic: "bicubic",
  nearest: "neighbor",
  mitchell: "mitchell",
};

export class FFmpegAdapter implements Adapter {
  name = "ffmpeg";

  async execute(operation: Operation, inputPath: string): Promise<Buffer> {
    if (operation.kind === "resize") {
      return this.executeResize(inputPath, operation);
    }
    return this.executeConvert(inputPath, operation);
  }

  private async executeResize(inputPath: string, op: ResizeOp): Promise<Buffer> {
    const meta = await this.probe(inputPath);
    const fixture: Fixture = {
      type: "landscape",
      size: "medium",
      format: meta.format,
      path: "",
      width: meta.width,
      height: meta.height,
      fileSizeBytes: 0,
    };
    const { width, height } = resolveOpDimensions(op, fixture);

    const flags = KERNEL_FLAGS[op.kernel] || "lanczos";
    let scaleFilter = `scale=${width}:${height}:flags=${flags}`;
    if (op.fit === "inside") {
      scaleFilter += ":force_original_aspect_ratio=decrease";
    }

    const ext = FORMAT_EXT[fixture.format] || "jpg";
    const outFormat = fixture.format === "webp" ? "png" : fixture.format;
    const outExt = outFormat === "jpeg" ? "jpg" : outFormat;
    return this.runFFmpeg(inputPath, outExt, ["-vf", scaleFilter]);
  }

  private async executeConvert(inputPath: string, op: ConvertOp): Promise<Buffer> {
    if (op.targetFormat === "webp") {
      throw new Error("ffmpeg adapter does not support WebP output encoding");
    }
    const ext = FORMAT_EXT[op.targetFormat];
    const extraArgs: string[] = [];

    if (op.targetFormat === "jpeg") {
      extraArgs.push("-q:v", String(this.jpegQuality(op.quality ?? 80)));
    }

    return this.runFFmpeg(inputPath, ext, extraArgs);
  }

  private async runFFmpeg(
    inputPath: string,
    ext: string,
    extraArgs: string[],
  ): Promise<Buffer> {
    const tmpOut = join(tmpdir(), `bench_ffmpeg_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);

    const args = [
      "-y",
      "-i", inputPath,
      ...extraArgs,
      tmpOut,
    ];

    const proc = Bun.spawn(["ffmpeg", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = new TextDecoder().decode(await new Response(proc.stderr).arrayBuffer());
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
      throw new Error(`ffmpeg exited ${exitCode}: ${stderr.slice(0, 200)}`);
    }

    try {
      const buf = Buffer.from(await Bun.file(tmpOut).arrayBuffer());
      return buf;
    } finally {
      try { unlinkSync(tmpOut); } catch {}
    }
  }

  private async probe(inputPath: string): Promise<{ width: number; height: number; format: ImageFormat }> {
    const proc = Bun.spawn([
      "ffprobe",
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      "-select_streams", "v:0",
      inputPath,
    ], { stdout: "pipe", stderr: "pipe" });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return { width: 100, height: 100, format: "jpeg" };
    }

    const stdout = new TextDecoder().decode(await new Response(proc.stdout).arrayBuffer());
    try {
      const json = JSON.parse(stdout);
      const stream = json.streams?.[0];
      if (!stream) return { width: 100, height: 100, format: "jpeg" };

      const fmt = stream.codec_name === "webp" ? "webp"
        : stream.codec_name === "png" ? "png"
        : "jpeg";

      return {
        width: stream.width || 100,
        height: stream.height || 100,
        format: fmt,
      };
    } catch {
      return { width: 100, height: 100, format: "jpeg" };
    }
  }

  private jpegQuality(q: number): number {
    return Math.max(1, Math.min(31, Math.round(31 - (q / 100) * 30)));
  }
}
