import type { Operation, ResizeOp, ConvertOp, Fixture } from "../types";

export const RESIZE_OPERATIONS: ResizeOp[] = [
  {
    kind: "resize",
    id: "resize_down_half",
    label: "Resize 50% (half)",
    targetWidth: (f: Fixture) => Math.round(f.width / 2),
    targetHeight: (f: Fixture) => Math.round(f.height / 2),
    fit: "fill",
    kernel: "lanczos3",
  },
  {
    kind: "resize",
    id: "resize_inside_800x600",
    label: "Resize inside 800x600",
    targetWidth: 800,
    targetHeight: 600,
    fit: "inside",
    kernel: "lanczos3",
  },
  {
    kind: "resize",
    id: "resize_fill_800x600",
    label: "Resize fill 800x600",
    targetWidth: 800,
    targetHeight: 600,
    fit: "fill",
    kernel: "lanczos3",
  },
  {
    kind: "resize",
    id: "resize_thumbnail_256",
    label: "Resize thumbnail 256x256",
    targetWidth: 256,
    targetHeight: 256,
    fit: "fill",
    kernel: "lanczos3",
  },
  {
    kind: "resize",
    id: "resize_upscale_2x",
    label: "Resize upscale 2x",
    targetWidth: (f: Fixture) => f.width * 2,
    targetHeight: (f: Fixture) => f.height * 2,
    fit: "fill",
    kernel: "lanczos3",
  },
  {
    kind: "resize",
    id: "resize_kernel_nearest",
    label: "Resize nearest kernel",
    targetWidth: (f: Fixture) => Math.round(f.width / 2),
    targetHeight: (f: Fixture) => Math.round(f.height / 2),
    fit: "fill",
    kernel: "nearest",
  },
  {
    kind: "resize",
    id: "resize_kernel_lanczos3",
    label: "Resize lanczos3 kernel",
    targetWidth: (f: Fixture) => Math.round(f.width / 2),
    targetHeight: (f: Fixture) => Math.round(f.height / 2),
    fit: "fill",
    kernel: "lanczos3",
  },
];

export const CONVERT_OPERATIONS: ConvertOp[] = [
  {
    kind: "convert",
    id: "convert_jpeg_to_png",
    label: "JPEG → PNG",
    sourceFormat: "jpeg",
    targetFormat: "png",
  },
  {
    kind: "convert",
    id: "convert_jpeg_to_webp",
    label: "JPEG → WebP (q80)",
    sourceFormat: "jpeg",
    targetFormat: "webp",
    quality: 80,
  },
  {
    kind: "convert",
    id: "convert_png_to_jpeg",
    label: "PNG → JPEG (q85)",
    sourceFormat: "png",
    targetFormat: "jpeg",
    quality: 85,
  },
  {
    kind: "convert",
    id: "convert_png_to_webp",
    label: "PNG → WebP (q80)",
    sourceFormat: "png",
    targetFormat: "webp",
    quality: 80,
  },
  {
    kind: "convert",
    id: "convert_webp_to_jpeg",
    label: "WebP → JPEG (q85)",
    sourceFormat: "webp",
    targetFormat: "jpeg",
    quality: 85,
  },
  {
    kind: "convert",
    id: "convert_webp_to_png",
    label: "WebP → PNG",
    sourceFormat: "webp",
    targetFormat: "png",
  },
];

export function getAllOperations(): Operation[] {
  return [...RESIZE_OPERATIONS, ...CONVERT_OPERATIONS];
}

export function getOperationsByIds(ids: string[]): Operation[] {
  if (ids.length === 0) return getAllOperations();
  return getAllOperations().filter((op) => ids.includes(op.id));
}

export function resolveOpDimensions(
  op: ResizeOp,
  fixture: Fixture
): { width: number; height: number } {
  const width =
    typeof op.targetWidth === "function" ? op.targetWidth(fixture) : op.targetWidth;
  const height =
    typeof op.targetHeight === "function"
      ? op.targetHeight(fixture)
      : op.targetHeight;
  return { width, height };
}
