import type { Adapter, Operation, ResizeOp, ConvertOp, ImageFormat, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";
import { resolveOpDimensions } from "../operations/definitions";
import { tmpdir } from "os";
import { join } from "path";
import { existsSync, unlinkSync } from "fs";

registerAdapterColor("imagemagick", "#ff7b72");

const FORMAT_EXT: Record<ImageFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

const KERNEL_MAP: Record<string, string> = {
  lanczos3: "Lanczos",
  lanczos2: "Lanczos2",
  bilinear: "Bilinear",
  linear: "Bilinear",
  cubic: "Catrom",
  nearest: "Point",
  mitchell: "Mitchell",
};

export class ImageMagickAdapter implements Adapter {
  name = "imagemagick";

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    if (operation.kind === "resize") {
      return this.executeResize(inputPath, operation, fixtureMeta);
    }
    return this.executeConvert(inputPath, operation);
  }

  private async executeResize(inputPath: string, op: ResizeOp, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const { width, height } = resolveOpDimensions(op, { ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any);

    const filter = KERNEL_MAP[op.kernel] || "Lanczos";
    let geometry = `${width}x${height}`;
    if (op.fit === "inside") {
      geometry += ">";
    } else {
      geometry += "^";
    }

    const ext = FORMAT_EXT[fixtureMeta.format] || "jpg";
    return this.runImageMagick(inputPath, ext, ["-filter", filter, "-resize", geometry]);
  }

  private async executeConvert(inputPath: string, op: ConvertOp): Promise<Buffer> {
    const ext = FORMAT_EXT[op.targetFormat];
    const args: string[] = [];

    if (op.targetFormat === "jpeg") {
      args.push("-quality", String(op.quality ?? 80));
    } else if (op.targetFormat === "webp") {
      args.push("-quality", String(op.quality ?? 80));
    }

    return this.runImageMagick(inputPath, ext, args);
  }

  private async runImageMagick(inputPath: string, ext: string, extraArgs: string[]): Promise<Buffer> {
    const tmpOut = join(tmpdir(), `bench_im_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);

    const cmd = this.detectCommand();
    const args = [inputPath, ...extraArgs, tmpOut];

    const proc = Bun.spawn([cmd, ...args], { stdout: "pipe", stderr: "pipe" });
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = new TextDecoder().decode(await new Response(proc.stderr).arrayBuffer());
      if (existsSync(tmpOut)) unlinkSync(tmpOut);
      throw new Error(`ImageMagick exited ${exitCode}: ${stderr.slice(0, 200)}`);
    }

    try {
      return Buffer.from(await Bun.file(tmpOut).arrayBuffer());
    } finally {
      try { unlinkSync(tmpOut); } catch {}
    }
  }

  private detectCommand(): string {
    try {
      const result = Bun.spawnSync(["which", "magick"], { stdout: "pipe" });
      if (result.exitCode === 0) return "magick";
    } catch {}
    return "convert";
  }
}

registerAdapter({
  name: "imagemagick",
  create: async () => new ImageMagickAdapter(),
  color: "#ff7b72",
});
