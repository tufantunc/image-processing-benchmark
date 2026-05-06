import type { Adapter, Operation, ResizeOp, ConvertOp, ImageFormat, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";
import { resolveOpDimensions } from "../operations/definitions";
import { existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

registerAdapterColor("ffmpeg", "#bc8cff");

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

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    if (operation.kind === "resize") {
      return this.executeResize(inputPath, operation, fixtureMeta);
    }
    return this.executeConvert(inputPath, operation);
  }

  private async executeResize(inputPath: string, op: ResizeOp, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const { width, height } = resolveOpDimensions(op, { ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any);

    const flags = KERNEL_FLAGS[op.kernel] || "lanczos";
    let scaleFilter = `scale=${width}:${height}:flags=${flags}`;
    if (op.fit === "inside") {
      scaleFilter += ":force_original_aspect_ratio=decrease";
    }

    const ext = FORMAT_EXT[fixtureMeta.format] || "jpg";
    const outFormat = fixtureMeta.format === "webp" ? "png" : fixtureMeta.format;
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

  private async runFFmpeg(inputPath: string, ext: string, extraArgs: string[]): Promise<Buffer> {
    const tmpOut = join(tmpdir(), `bench_ffmpeg_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);

    const args = ["-y", "-i", inputPath, ...extraArgs, tmpOut];

    const proc = Bun.spawn(["ffmpeg", ...args], { stdout: "pipe", stderr: "pipe" });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = new TextDecoder().decode(await new Response(proc.stderr).arrayBuffer());
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
      throw new Error(`ffmpeg exited ${exitCode}: ${stderr.slice(0, 200)}`);
    }

    try {
      return Buffer.from(await Bun.file(tmpOut).arrayBuffer());
    } finally {
      try { unlinkSync(tmpOut); } catch {}
    }
  }

  private jpegQuality(q: number): number {
    return Math.max(1, Math.min(31, Math.round(31 - (q / 100) * 30)));
  }
}

registerAdapter({
  name: "ffmpeg",
  create: async () => new FFmpegAdapter(),
  color: "#bc8cff",
});
