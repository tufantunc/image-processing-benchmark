import type { Fixture, FixtureType, FixtureSize, ImageFormat } from "../types";
import { statSync } from "fs";
import { join } from "path";

export const FIXTURE_TYPES: FixtureType[] = ["landscape", "portrait", "city"];
export const FIXTURE_SIZES: FixtureSize[] = ["small", "medium", "large"];
export const FORMATS: ImageFormat[] = ["jpeg", "png", "webp"];

export const FIXTURE_DIMS: Record<string, [number, number]> = {
  landscape_small: [256, 171],
  landscape_medium: [1920, 1281],
  landscape_large: [3840, 2563],
  portrait_small: [256, 384],
  portrait_medium: [1920, 2880],
  portrait_large: [3840, 5760],
  city_small: [256, 170],
  city_medium: [1920, 1280],
  city_large: [3840, 2560],
};

export function discoverFixtures(fixturesDir: string): Fixture[] {
  const fixtures: Fixture[] = [];
  for (const type of FIXTURE_TYPES) {
    for (const size of FIXTURE_SIZES) {
      for (const format of FORMATS) {
        const filename = `${type}_${size}.${format}`;
        const filepath = join(fixturesDir, filename);
        try {
          const stat = statSync(filepath);
          const key = `${type}_${size}`;
          const [w, h] = FIXTURE_DIMS[key] || [0, 0];
          fixtures.push({
            type,
            size,
            format,
            path: filepath,
            width: w,
            height: h,
            fileSizeBytes: stat.size,
          });
        } catch {}
      }
    }
  }
  return fixtures;
}
