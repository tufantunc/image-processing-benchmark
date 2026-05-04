import sharp from "sharp";
import type { Adapter, Operation, ResizeOp, ConvertOp, Fixture } from "../types";
import { resolveOpDimensions } from "../operations/definitions";

export class SharpAdapter implements Adapter {
  name = "sharp";

  async execute(operation: Operation, inputPath: string): Promise<Buffer> {
    const pipeline = sharp(inputPath);

    if (operation.kind === "resize") {
      return this.executeResize(pipeline, operation);
    }
    return this.executeConvert(pipeline, operation);
  }

  private async executeResize(
    pipeline: sharp.Sharp,
    op: ResizeOp
  ): Promise<Buffer> {
    const meta = await pipeline.metadata();
    const fixture: Fixture = {
      type: "landscape",
      size: "medium",
      format: (meta.format as "jpeg" | "png" | "webp") || "jpeg",
      path: "",
      width: meta.width || 100,
      height: meta.height || 100,
      fileSizeBytes: 0,
    };
    const { width, height } = resolveOpDimensions(op, fixture);

    const sharpFit =
      op.fit === "inside" ? "inside" : op.fit === "fill" ? "fill" : "fill";
    const sharpKernel =
      op.kernel === "nearest"
        ? "nearest"
        : op.kernel === "lanczos3"
          ? "lanczos3"
          : op.kernel === "lanczos2"
            ? "lanczos2"
            : op.kernel === "mitchell"
              ? "mitchell"
              : op.kernel === "linear" || op.kernel === "bilinear"
                ? "linear"
                : op.kernel === "cubic"
                  ? "cubic"
                  : "lanczos3";

    return pipeline
      .resize(width, height, {
        fit: sharpFit,
        kernel: sharpKernel,
      })
      .toBuffer();
  }

  private async executeConvert(
    pipeline: sharp.Sharp,
    op: ConvertOp
  ): Promise<Buffer> {
    switch (op.targetFormat) {
      case "jpeg":
        return pipeline
          .jpeg({ quality: op.quality ?? 80 })
          .toBuffer();
      case "png":
        return pipeline.png().toBuffer();
      case "webp":
        return pipeline
          .webp({ quality: op.quality ?? 80 })
          .toBuffer();
    }
  }
}
