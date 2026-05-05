import type { Adapter, Operation, ResizeOp, ConvertOp, Fixture, ImageFormat } from "../types";
import { resolveOpDimensions } from "../operations/definitions";
import { extname } from "path";

const FORMAT_FROM_EXT: Record<string, ImageFormat> = {
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".webp": "webp",
};

export class CanvasAdapter implements Adapter {
  name = "canvas";

  async execute(operation: Operation, inputPath: string): Promise<Buffer> {
    const { loadImage, createCanvas } = await import("@napi-rs/canvas" as string);
    const image = await loadImage(inputPath);

    if (operation.kind === "resize") {
      return this.executeResize(image, createCanvas, operation);
    }
    return this.executeConvert(image, createCanvas, operation, inputPath);
  }

  private async executeResize(
    image: any,
    createCanvas: any,
    op: ResizeOp
  ): Promise<Buffer> {
    const fixture: Fixture = {
      type: "landscape",
      size: "medium",
      format: "jpeg",
      path: "",
      width: image.width,
      height: image.height,
      fileSizeBytes: 0,
    };
    const { width, height } = resolveOpDimensions(op, fixture);

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

  private async executeConvert(
    image: any,
    createCanvas: any,
    op: ConvertOp,
    inputPath: string
  ): Promise<Buffer> {
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
