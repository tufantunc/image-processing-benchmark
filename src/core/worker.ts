import type { Operation, ResizeOp, Adapter } from "../types";
import { SharpAdapter } from "../adapters/sharp.adapter";
import { BunAdapter } from "../adapters/bun.adapter";

const adapters: Record<string, Adapter> = {
  sharp: new SharpAdapter(),
  bun: new BunAdapter(),
};

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

  const adapter = adapters[input.adapterName];
  if (!adapter) {
    console.log(
      JSON.stringify({
        durationMs: 0,
        outputSizeBytes: 0,
        error: `Unknown adapter: ${input.adapterName}`,
      })
    );
    return;
  }

  if (typeof globalThis.gc === "function") globalThis.gc();

  const start = performance.now();
  try {
    const result = await adapter.execute(input.operation, input.inputPath);
    const durationMs = performance.now() - start;

    console.log(
      JSON.stringify({
        durationMs,
        outputSizeBytes: result.byteLength,
      })
    );
  } catch (err: any) {
    console.log(
      JSON.stringify({
        durationMs: 0,
        outputSizeBytes: 0,
        error: err.message || String(err),
      })
    );
  }
}

main();
