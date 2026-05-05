import type { Operation, Adapter } from "../types";

interface WorkerInput {
  adapterName: string;
  operation: Operation;
  inputPath: string;
}

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  const input = JSON.parse(Buffer.concat(chunks).toString()) as WorkerInput;

  let adapter: Adapter;
  try {
    if (input.adapterName === "sharp") {
      const { SharpAdapter } = await import("../adapters/sharp.adapter");
      adapter = new SharpAdapter();
    } else if (input.adapterName === "bun") {
      const { BunAdapter } = await import("../adapters/bun.adapter");
      adapter = new BunAdapter();
    } else if (input.adapterName === "ffmpeg") {
      const { FFmpegAdapter } = await import("../adapters/ffmpeg.adapter");
      adapter = new FFmpegAdapter();
    } else if (input.adapterName === "jimp") {
      const { JimpAdapter } = await import("../adapters/jimp.adapter");
      adapter = new JimpAdapter();
    } else if (input.adapterName === "canvas") {
      const { CanvasAdapter } = await import("../adapters/canvas.adapter");
      adapter = new CanvasAdapter();
    } else {
      console.log(JSON.stringify({ durationMs: 0, outputSizeBytes: null, hasError: true, errorMessage: `Unknown adapter: ${input.adapterName}` }));
      return;
    }
  } catch (err: any) {
    console.log(JSON.stringify({ durationMs: 0, outputSizeBytes: null, hasError: true, errorMessage: `Adapter load failed: ${err.message}` }));
    return;
  }

  if (typeof globalThis.gc === "function") globalThis.gc();

  const start = performance.now();
  try {
    const result = await adapter.execute(input.operation, input.inputPath);
    const durationMs = performance.now() - start;
    console.log(JSON.stringify({ durationMs, outputSizeBytes: result.byteLength }));
  } catch (err: any) {
    console.log(JSON.stringify({ durationMs: 0, outputSizeBytes: null, hasError: true, errorMessage: err.message || String(err) }));
  }
}

main();
