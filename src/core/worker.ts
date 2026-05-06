import type { Operation, Adapter, FixtureMeta } from "../types";
import { getAdapterEntry } from "../adapters/registry";

import "../adapters/sharp.adapter";
import "../adapters/bun.adapter";
import "../adapters/ffmpeg.adapter";
import "../adapters/jimp.adapter";
import "../adapters/canvas.adapter";
import "../adapters/imagemagick.adapter";
import "../adapters/photon.adapter";

interface WorkerInput {
  adapterName: string;
  operation: Operation;
  inputPath: string;
  fixtureMeta: FixtureMeta;
}

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  const input = JSON.parse(Buffer.concat(chunks).toString()) as WorkerInput;

  const entry = getAdapterEntry(input.adapterName);
  if (!entry) {
    console.log(JSON.stringify({ durationMs: 0, outputSizeBytes: null, hasError: true, errorMessage: `Unknown adapter: ${input.adapterName}` }));
    return;
  }

  let adapter: Adapter;
  try {
    adapter = await entry.create();
  } catch (err: any) {
    console.log(JSON.stringify({ durationMs: 0, outputSizeBytes: null, hasError: true, errorMessage: `Adapter load failed: ${err.message}` }));
    return;
  }

  if (typeof globalThis.gc === "function") globalThis.gc();

  const start = performance.now();
  try {
    const result = await adapter.execute(input.operation, input.inputPath, input.fixtureMeta);
    const durationMs = performance.now() - start;
    console.log(JSON.stringify({ durationMs, outputSizeBytes: result.byteLength }));
  } catch (err: any) {
    console.log(JSON.stringify({ durationMs: 0, outputSizeBytes: null, hasError: true, errorMessage: err.message || String(err) }));
  }
}

main();
