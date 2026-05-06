import type { Adapter } from "../types";

export interface AdapterEntry {
  name: string;
  create: () => Promise<Adapter>;
  color: string;
}

const entries: Map<string, AdapterEntry> = new Map();

export function registerAdapter(entry: AdapterEntry): void {
  entries.set(entry.name, entry);
}

export function getAdapterEntry(name: string): AdapterEntry | undefined {
  return entries.get(name);
}

export function getAllEntries(): AdapterEntry[] {
  return [...entries.values()];
}

export function getAdapterNames(): string[] {
  return [...entries.keys()];
}

export const ADAPTER_COLORS: Record<string, string> = {};

export function registerAdapterColor(name: string, color: string): void {
  ADAPTER_COLORS[name] = color;
}
