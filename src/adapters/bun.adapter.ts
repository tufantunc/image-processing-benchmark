import type { Adapter, Operation, ResizeOp, ConvertOp, Fixture } from "../types";
import { resolveOpDimensions } from "../operations/definitions";

export class BunAdapter implements Adapter {
  name = "bun";

  async execute(operation: Operation, inputPath: string): Promise<Buffer> {
    if (operation.kind === "resize") {
      return this.executeResize(inputPath, operation);
    }
    return this.executeConvert(inputPath, operation);
  }

  private async executeResize(inputPath: string, op: ResizeOp): Promise<Buffer> {
    const meta = await new (Bun as any).Image(inputPath).metadata();
    const fixture: Fixture = {
      type: "landscape",
      size: "medium",
      format: meta.format || "jpeg",
      path: "",
      width: meta.width,
      height: meta.height,
      fileSizeBytes: 0,
    };
    const { width, height } = resolveOpDimensions(op, fixture);

    const options: Record<string, unknown> = {};
    if (op.fit === "inside") options.fit = "inside";
    if (op.kernel && op.kernel !== "lanczos3") options.filter = op.kernel;

    const img = new (Bun as any).Image(inputPath).resize(width, height, options);

    const buf = await img.buffer();
    return Buffer.from(buf);
  }

  private async executeConvert(
    inputPath: string,
    op: ConvertOp
  ): Promise<Buffer> {
    const img = new (Bun as any).Image(inputPath);

    switch (op.targetFormat) {
      case "jpeg":
        return Buffer.from(await img.jpeg({ quality: op.quality ?? 80 }).buffer());
      case "png":
        return Buffer.from(await img.png().buffer());
      case "webp":
        return Buffer.from(await img.webp({ quality: op.quality ?? 80 }).buffer());
    }
  }
}
