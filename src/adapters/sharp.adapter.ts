import sharp from "sharp";
import type { Adapter, Operation, ResizeOp, ConvertOp, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";
import { resolveOpDimensions } from "../operations/definitions";

registerAdapterColor("sharp", "#f47067");

export class SharpAdapter implements Adapter {
  name = "sharp";

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const pipeline = sharp(inputPath);

    if (operation.kind === "resize") {
      return this.executeResize(pipeline, operation, fixtureMeta);
    }
    return this.executeConvert(pipeline, operation);
  }

  private async executeResize(
    pipeline: sharp.Sharp,
    op: ResizeOp,
    fixtureMeta: FixtureMeta
  ): Promise<Buffer> {
    const { width, height } = resolveOpDimensions(op, { ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any);

    const sharpFit = op.fit === "inside" ? "inside" : "fill";
    const sharpKernel = this.mapKernel(op.kernel);

    return pipeline
      .resize(width, height, { fit: sharpFit, kernel: sharpKernel })
      .toBuffer();
  }

  private mapKernel(kernel: string): sharp.KernelEnum {
    switch (kernel) {
      case "nearest": return "nearest";
      case "lanczos2": return "lanczos2";
      case "lanczos3": return "lanczos3";
      case "mitchell": return "mitchell";
      case "linear":
      case "bilinear": return "linear";
      case "cubic": return "cubic";
      default: return "lanczos3";
    }
  }

  private async executeConvert(pipeline: sharp.Sharp, op: ConvertOp): Promise<Buffer> {
    switch (op.targetFormat) {
      case "jpeg":
        return pipeline.jpeg({ quality: op.quality ?? 80 }).toBuffer();
      case "png":
        return pipeline.png().toBuffer();
      case "webp":
        return pipeline.webp({ quality: op.quality ?? 80 }).toBuffer();
    }
  }
}

registerAdapter({
  name: "sharp",
  create: async () => new SharpAdapter(),
  color: "#f47067",
});
