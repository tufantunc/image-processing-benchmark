import type { Adapter, Operation, ResizeOp, ConvertOp, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";
import { resolveOpDimensions } from "../operations/definitions";

registerAdapterColor("canvas", "#39d353");

export class CanvasAdapter implements Adapter {
  name = "canvas";

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const { loadImage, createCanvas } = await import("@napi-rs/canvas" as string);
    const image = await loadImage(inputPath);

    if (operation.kind === "resize") {
      return this.executeResize(image, createCanvas, operation, fixtureMeta);
    }
    return this.executeConvert(image, createCanvas, operation);
  }

  private async executeResize(image: any, createCanvas: any, op: ResizeOp, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const { width, height } = resolveOpDimensions(op, fixtureMeta);

    let canvasW = width;
    let canvasH = height;

    if (op.fit === "inside") {
      const scale = Math.min(width / image.width, height / image.height);
      canvasW = Math.round(image.width * scale);
      canvasH = Math.round(image.height * scale);
    }

    const canvas = createCanvas(canvasW, canvasH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvasW, canvasH);

    return canvas.encode("png");
  }

  private async executeConvert(image: any, createCanvas: any, op: ConvertOp): Promise<Buffer> {
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    switch (op.targetFormat) {
      case "jpeg":
        return canvas.encode("jpeg", op.quality ?? 80);
      case "png":
        return canvas.encode("png");
      case "webp":
        return canvas.encode("webp", op.quality ?? 80);
    }
  }
}

registerAdapter({
  name: "canvas",
  create: async () => new CanvasAdapter(),
  color: "#39d353",
});
