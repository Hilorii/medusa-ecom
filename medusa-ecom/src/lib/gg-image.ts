// gg-image.ts
import path from "node:path";

// Upewniamy się, że TypeScript zna globalne `require` w CJS:
declare const require: NodeJS.Require;

let cachedSharp: any;

function ggRequireSharp(): any {
  if (cachedSharp) {
    return cachedSharp;
  }

  const envPath = process.env.GG_SHARP_PATH;
  const searchBases = [
    process.cwd(),
    path.join(process.cwd(), "node_modules"),
    path.join(process.cwd(), ".."),
    path.join(process.cwd(), "..", "medusa-ecom-storefront"),
    envPath && path.resolve(envPath),
  ].filter(Boolean) as string[];

  for (const base of searchBases) {
    try {
      const resolved = require.resolve("sharp", { paths: [base] });
      cachedSharp = require(resolved);
      return cachedSharp;
    } catch {
      // próbujemy kolejne lokalizacje
    }
  }

  throw new Error(
    "sharp module not found. Install it in the backend project (npm install sharp) or make it available via GG_SHARP_PATH.",
  );
}

export async function ggConvertBufferToWebp(
  buffer: Buffer,
  options?: { quality?: number; maxWidth?: number; maxHeight?: number },
): Promise<Buffer> {
  const sharp = ggRequireSharp();

  let instance = sharp(buffer, { failOn: "truncated" });
  instance = instance.rotate();

  if (options?.maxWidth || options?.maxHeight) {
    instance = instance.resize({
      width: options.maxWidth,
      height: options.maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const quality = typeof options?.quality === "number" ? options.quality : 80;
  return instance.webp({ quality, effort: 6 }).toBuffer();
}
