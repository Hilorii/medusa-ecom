import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const GG_STATIC_ROOT = path.resolve(process.cwd(), "static");
const GG_INCOMING_ROOT = path.join(GG_STATIC_ROOT, "incoming");

type GGIncomingTarget = {
  absPath: string;
  urlPath: string;
  fileName: string;
  relDir: string;
  relativePath: string;
  day: string;
  month: string;
};

export function ggFormatDateParts(now = new Date()) {
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return { day, month };
}

export function ggSanitizeBase(name: string) {
  return (name || "").replace(/[^\w.\-]+/g, "_");
}

export function ggSanitizeLineItemId(value?: string) {
  if (!value) return "";
  return ggSanitizeBase(value).replace(/\.+/g, "_").slice(0, 120);
}

function ggBuildRelDir() {
  return path.join("static", "incoming");
}

function ggBuildRelativePath(fileName: string) {
  return fileName.replace(/\\/g, "/");
}

function ggBuildUrl(fileName: string) {
  return "/" + path.join("static", "incoming", fileName).replace(/\\/g, "/");
}

export async function ggPrepareIncomingFinalTarget(
  lineItemId: string,
  now = new Date(),
): Promise<GGIncomingTarget> {
  const sanitized = ggSanitizeLineItemId(lineItemId);
  if (!sanitized) {
    throw new Error("Invalid line item id");
  }

  const { day, month } = ggFormatDateParts(now);
  await fs.mkdir(GG_INCOMING_ROOT, { recursive: true });

  const fileName = `${day}-${month}-${sanitized}.webp`;
  const absPath = path.join(GG_INCOMING_ROOT, fileName);

  return {
    absPath,
    urlPath: ggBuildUrl(fileName),
    fileName,
    relDir: ggBuildRelDir(),
    relativePath: ggBuildRelativePath(fileName),
    day,
    month,
  };
}

export async function ggPrepareIncomingTempTarget(
  now = new Date(),
): Promise<GGIncomingTarget> {
  const { day, month } = ggFormatDateParts(now);
  await fs.mkdir(GG_INCOMING_ROOT, { recursive: true });

  const random = crypto.randomBytes(6).toString("hex");
  const fileName = `${day}-${month}-pending-${random}.webp`;
  const absPath = path.join(GG_INCOMING_ROOT, fileName);

  return {
    absPath,
    urlPath: ggBuildUrl(fileName),
    fileName,
    relDir: ggBuildRelDir(),
    relativePath: ggBuildRelativePath(fileName),
    day,
    month,
  };
}

function ggNormalizeIncomingUrl(input?: string) {
  if (!input) return "";
  const clean = input.split("?")[0].split("#")[0];
  if (!clean) return "";
  return clean.startsWith("/") ? clean.slice(1) : clean;
}

export function ggIncomingUrlToAbsolute(urlPath: string) {
  const normalized = ggNormalizeIncomingUrl(urlPath);
  if (!normalized.startsWith("static/incoming/")) {
    return null;
  }

  const relative = normalized.slice("static/incoming/".length);
  const absPath = path.join(GG_INCOMING_ROOT, relative);
  const resolved = path.resolve(absPath);
  if (!resolved.startsWith(GG_INCOMING_ROOT)) {
    return null;
  }
  return resolved;
}

export async function ggFinalizeIncomingFile({
  currentUrl,
  lineItemId,
  now = new Date(),
}: {
  currentUrl: string;
  lineItemId: string;
  now?: Date;
}): Promise<GGIncomingTarget | null> {
  const sanitized = ggSanitizeLineItemId(lineItemId);
  if (!sanitized) return null;

  const currentAbs = ggIncomingUrlToAbsolute(currentUrl);
  if (!currentAbs) return null;

  try {
    await fs.access(currentAbs);
  } catch {
    return null;
  }

  const target = await ggPrepareIncomingFinalTarget(sanitized, now);
  if (path.resolve(currentAbs) === path.resolve(target.absPath)) {
    return target;
  }

  await fs.mkdir(path.dirname(target.absPath), { recursive: true });
  await fs.rm(target.absPath, { force: true });
  await fs.rename(currentAbs, target.absPath);

  return target;
}
