import type { Adapter, Operation, ResizeOp, ConvertOp, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";
import { resolveOpDimensions } from "../operations/definitions";

registerAdapterColor("bun", "#70d0ff");

export class BunAdapter implements Adapter {
  name = "bun";

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    if (operation.kind === "resize") {
      return this.executeResize(inputPath, operation, fixtureMeta);
    }
    return this.executeConvert(inputPath, operation);
  }

  private async executeResize(inputPath: string, op: ResizeOp, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const { width, height } = resolveOpDimensions(op, fixtureMeta);

    const options: Record<string, unknown> = {};
    if (op.fit === "inside") options.fit = "inside";
    if (op.kernel && op.kernel !== "lanczos3") options.filter = op.kernel;

    const img = new (Bun as any).Image(inputPath).resize(width, height, options);
    const buf = await img.buffer();
    return Buffer.from(buf);
  }

  private async executeConvert(inputPath: string, op: ConvertOp): Promise<Buffer> {
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

registerAdapter({
  name: "bun",
  create: async () => new BunAdapter(),
  color: "#70d0ff",
});
