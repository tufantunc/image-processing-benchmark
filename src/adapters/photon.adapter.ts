import type { Adapter, Operation, FixtureMeta } from "../types";
import { registerAdapter, registerAdapterColor } from "./registry";

registerAdapterColor("photon", "#d2a8ff");

export class PhotonAdapter implements Adapter {
  name = "photon";

  async execute(_operation: Operation, _inputPath: string, _fixtureMeta: FixtureMeta): Promise<Buffer> {
    throw new Error("Photon adapter is experimental — WASM bindings not yet available via npm");
  }
}

registerAdapter({
  name: "photon",
  create: async () => new PhotonAdapter(),
  color: "#d2a8ff",
});
