import type { Adapter, Operation, ResizeOp, ConvertOp, ImageFormat, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";
import { resolveOpDimensions } from "../operations/definitions";

registerAdapterColor("jimp", "#e3b341");

const KERNEL_MAP: Record<string, string> = {
  lanczos3: "bicubicInterpolation",
  lanczos2: "bicubicInterpolation",
  cubic: "bicubicInterpolation",
  bilinear: "bilinearInterpolation",
  linear: "bilinearInterpolation",
  nearest: "nearestNeighbor",
  mitchell: "bicubicInterpolation",
};

const MIME_MAP: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

let JimpCustom: any = null;

async function getJimp() {
  if (JimpCustom) return JimpCustom;
  const { createJimp } = await import("@jimp/core" as string);
  const { defaultFormats, defaultPlugins } = await import("jimp" as string);
  const createWebp = (await import("@jimp/wasm-webp" as string)).default;
  JimpCustom = createJimp({
    formats: [...defaultFormats, createWebp],
    plugins: defaultPlugins,
  });
  return JimpCustom;
}

export class JimpAdapter implements Adapter {
  name = "jimp";

  async execute(operation: Operation, inputPath: string, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const Jimp = await getJimp();
    const image = await Jimp.read(inputPath);

    if (operation.kind === "resize") {
      return this.executeResize(image, operation, fixtureMeta);
    }
    return this.executeConvert(image, operation);
  }

  private async executeResize(image: any, op: ResizeOp, fixtureMeta: FixtureMeta): Promise<Buffer> {
    const { width, height } = resolveOpDimensions(op, { ...fixtureMeta, type: "landscape", size: "medium", path: "", fileSizeBytes: 0 } as any);

    const mode = (KERNEL_MAP[op.kernel] || "bicubicInterpolation") as any;

    if (op.fit === "inside") {
      image.scaleToFit({ w: width, h: height, mode });
    } else {
      image.resize({ w: width, h: height, mode });
    }

    const mime = image.mime || "image/jpeg";
    return image.getBuffer(mime);
  }

  private async executeConvert(image: any, op: ConvertOp): Promise<Buffer> {
    const mime = MIME_MAP[op.targetFormat];
    const options: Record<string, unknown> = {};

    if (op.targetFormat === "jpeg" || op.targetFormat === "webp") {
      options.quality = op.quality ?? 80;
    }

    return image.getBuffer(mime, options);
  }
}

registerAdapter({
  name: "jimp",
  create: async () => new JimpAdapter(),
  color: "#e3b341",
});
