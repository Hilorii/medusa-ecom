import fs from "node:fs/promises";
import path from "node:path";

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";

import { ggSanitizeLineItemId } from "../../../../lib/gg-incoming";

const STATIC_ROOT = path.resolve(process.cwd(), "static");
const INCOMING_DIR = path.join(STATIC_ROOT, "incoming");
const PROCESSED_DIR = path.join(STATIC_ROOT, "processed");

const MIN_SEGMENT_LENGTH = 6;

const KNOWN_ID_PREFIXES = [
  "cart_line_item_id",
  "cart-line-item-id",
  "cart_line_item",
  "cart-item",
  "cartitem",
  "line_item",
  "line-item",
  "lineitem",
  "order_item",
  "order-item",
  "orderitem",
  "order_",
  "variant_",
  "item_",
  "li_",
  "ci_",
  "cli_",
];

type ArtworkEntry = {
  line_item_id: string | null;
  title: string | null;
  cart_line_item_id: string | null;
  quantity: number | null;
  incoming: string[];
  processed: string[];
};

type ArtworkResponse = {
  order_id: string;
  generated_at: string;
  totals: {
    incoming: number;
    processed: number;
  };
  items: ArtworkEntry[];
};

const isMedusaAuthError = (error: unknown) =>
  MedusaError.isMedusaError(error) &&
  (error.type === MedusaError.Types.UNAUTHORIZED ||
    error.type === MedusaError.Types.NOT_ALLOWED);

const isMedusaNotFound = (error: unknown) =>
  MedusaError.isMedusaError(error) &&
  error.type === MedusaError.Types.NOT_FOUND;

const normalizeListResult = <T>(value: unknown): T[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    if (
      value.length === 2 &&
      Array.isArray(value[0]) &&
      typeof value[1] === "number"
    ) {
      return normalizeListResult<T>(value[0]);
    }

    return value as T[];
  }

  if (typeof value === "object") {
    const data = (value as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as T[];
    }

    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return items as T[];
    }

    const orders = (value as { orders?: unknown }).orders;
    if (Array.isArray(orders)) {
      return orders as T[];
    }
  }

  return [];
};

const normalizeLineItems = (value: unknown): any[] =>
  normalizeListResult<any>(value).map((entry) => {
    if (!entry || typeof entry !== "object") {
      return entry;
    }

    if ("item" in entry && (entry as any).item) {
      return (entry as any).item;
    }

    if ("line_item" in entry && (entry as any).line_item) {
      return (entry as any).line_item;
    }

    if ("order_item" in entry && (entry as any).order_item) {
      return (entry as any).order_item;
    }

    return entry;
  });

const loadOrderWithItems = async (orderModule: any, orderId: string) => {
  const withItemsConfig = { relations: ["items"] };
  let lastError: unknown = null;

  const attempt = async <T>(fn?: () => Promise<T>) => {
    if (typeof fn !== "function") {
      return { success: true, value: null as T | null };
    }

    try {
      const result = await fn();
      return { success: true, value: (result ?? null) as T | null };
    } catch (error) {
      if (isMedusaAuthError(error)) {
        throw error;
      }

      if (isMedusaNotFound(error)) {
        return { success: true, value: null as T | null };
      }

      lastError = error;
      return { success: false, value: null as T | null };
    }
  };

  const direct = await attempt(() =>
    orderModule?.retrieveOrder?.(orderId, withItemsConfig),
  );
  if (direct.success && direct.value) {
    return direct.value;
  }

  const listed = await attempt(() =>
    orderModule?.listOrders?.({ id: [orderId] }, withItemsConfig),
  );
  if (listed.success && listed.value) {
    const arr = normalizeListResult<any>(listed.value);
    if (arr.length) {
      return arr[0];
    }
  }

  const listedAndCounted = await attempt(() =>
    orderModule?.listAndCountOrders?.({ id: [orderId] }, withItemsConfig),
  );
  if (listedAndCounted.success && listedAndCounted.value) {
    const arr = normalizeListResult<any>(listedAndCounted.value);
    if (arr.length) {
      return arr[0];
    }
  }

  const base = await attempt(() => orderModule?.retrieveOrder?.(orderId));
  if (base.success && base.value) {
    const order = base.value as any;

    if (!Array.isArray(order?.items) || !order.items.length) {
      const [details, lineItems] = await Promise.all([
        attempt(() =>
          orderModule?.listOrderItems?.(
            { order_id: orderId },
            {
              relations: ["item"],
            },
          ),
        ),
        attempt(() =>
          orderModule?.listOrderLineItems?.(
            { order_id: orderId },
            {
              relations: ["item"],
            },
          ),
        ),
      ]);

      const normalizedItems = normalizeLineItems(details.value);
      const normalizedLineItems = normalizeLineItems(lineItems.value);

      const merged = [
        ...(Array.isArray(order?.items) ? order.items : []),
        ...normalizedItems,
        ...normalizedLineItems,
      ].filter(Boolean);

      if (merged.length) {
        const deduped: any[] = [];
        const seen = new Set<string>();

        for (const entry of merged) {
          if (!entry || typeof entry !== "object") {
            deduped.push(entry);
            continue;
          }

          const entryId = (entry as any).id;
          if (typeof entryId === "string" && entryId) {
            if (seen.has(entryId)) {
              continue;
            }
            seen.add(entryId);
          }

          deduped.push(entry);
        }

        order.items = deduped;
      }
    }

    if (!Array.isArray(order?.items)) {
      order.items = [];
    }

    return order;
  }

  if (lastError) {
    throw lastError;
  }

  return null;
};

const ensureLeadingSlash = (value: string) =>
  value.startsWith("/") ? value : `/${value}`;

const buildStaticUrl = (folder: "incoming" | "processed", name: string) => {
  const normalized = name.replace(/\\/g, "/").replace(/^\/+/, "");
  return ensureLeadingSlash(path.posix.join("static", folder, normalized));
};

const readDirSafe = async (dir: string) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [] as string[];
  }
};

const collectTokens = (item: any) => {
  const tokens = new Set<string>();
  const metadata = (item?.metadata ?? {}) as Record<string, unknown>;

  const addToken = (value: unknown) => {
    if (typeof value !== "string") {
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const addRaw = (input: string) => {
      if (!input) {
        return;
      }

      const queue: string[] = [input];
      const seen = new Set<string>();

      const register = (value: string) => {
        if (!value) {
          return;
        }

        tokens.add(value);
        tokens.add(value.toLowerCase());
      };

      while (queue.length) {
        const current = queue.shift() as string;
        if (!current || seen.has(current)) {
          continue;
        }

        seen.add(current);
        register(current);

        const normalizedSlash = current.replace(/\\/g, "/");
        if (normalizedSlash && normalizedSlash !== current) {
          queue.push(normalizedSlash);
        }

        const sanitized = ggSanitizeLineItemId(current);
        if (sanitized && sanitized !== current) {
          queue.push(sanitized);
        }

        const lowered = current.toLowerCase();
        for (const prefix of KNOWN_ID_PREFIXES) {
          if (lowered.startsWith(prefix) && current.length > prefix.length) {
            const stripped = current.slice(prefix.length);
            if (stripped) {
              queue.push(stripped);
            }
          }
        }

        const segments = current.split(/[\/]/).filter(Boolean);
        for (const segment of segments) {
          if (segment && segment !== current) {
            queue.push(segment);
          }

          const dotIndex = segment.lastIndexOf(".");
          if (dotIndex > 0) {
            const base = segment.slice(0, dotIndex);
            if (base && base !== segment) {
              queue.push(base);
            }
          }

          const pieces = segment
            .split(/[^0-9A-Za-z]+/)
            .filter((part) => part.length >= MIN_SEGMENT_LENGTH);
          for (const piece of pieces) {
            if (piece && piece !== segment && piece !== current) {
              queue.push(piece);
            }
          }
        }
      }
    };

    addRaw(trimmed);
  };

  addToken(metadata["cart_line_item_id"]);
  addToken(metadata["cartLineItemId"]);
  addToken(metadata["lineItemId"]);
  addToken(metadata["fileName"]);
  addToken(metadata["relativePath"]);
  addToken(metadata["fileUrl"]);
  addToken(metadata["processedUrl"]);
  addToken(item?.id);

  return Array.from(tokens).filter(Boolean);
};

const matchFiles = (files: string[], tokens: string[]) => {
  if (!tokens.length || !files.length) {
    return [];
  }

  const matches: string[] = [];
  for (const file of files) {
    const lower = file.toLowerCase();
    if (
      tokens.some((token) => token && lower.includes(token.toLowerCase())) &&
      !matches.includes(file)
    ) {
      matches.push(file);
    }
  }

  return matches;
};

const normalizeDirectUrl = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return ensureLeadingSlash(trimmed.replace(/\\/g, "/"));
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const orderId = (req.params?.id || req.params?.order_id || "") as string;

  if (!orderId) {
    return res.status(400).json({
      code: "invalid_request",
      message: "Order id is required",
    });
  }

  try {
    const orderModule = req.scope.resolve(Modules.ORDER);
    const order = await loadOrderWithItems(orderModule, orderId);

    if (!order) {
      return res.status(404).json({
        code: "order_not_found",
        message: "Order not found",
      });
    }

    const rawItems = Array.isArray((order as any)?.items)
      ? ((order as any).items as any[])
      : [];

    const [incomingFiles, processedFiles] = await Promise.all([
      readDirSafe(INCOMING_DIR),
      readDirSafe(PROCESSED_DIR),
    ]);

    const items: ArtworkEntry[] = rawItems.map((item: any) => {
      const tokens = collectTokens(item);
      const metadata = (item?.metadata ?? {}) as Record<string, unknown>;

      const incomingMatches = matchFiles(incomingFiles, tokens).map((name) =>
        buildStaticUrl("incoming", name),
      );

      const processedMatches = matchFiles(processedFiles, tokens).map((name) =>
        buildStaticUrl("processed", name),
      );

      const directIncoming = normalizeDirectUrl(metadata["fileUrl"]);
      if (
        directIncoming &&
        directIncoming.includes("/static/incoming/") &&
        !incomingMatches.includes(directIncoming)
      ) {
        incomingMatches.unshift(directIncoming);
      }

      const directProcessed = normalizeDirectUrl(metadata["processedUrl"]);
      if (
        directProcessed &&
        directProcessed.includes("/static/processed/") &&
        !processedMatches.includes(directProcessed)
      ) {
        processedMatches.unshift(directProcessed);
      }

      return {
        line_item_id: item?.id ?? null,
        title: item?.title ?? null,
        cart_line_item_id:
          (metadata["cart_line_item_id"] as string | undefined) ??
          (metadata["cartLineItemId"] as string | undefined) ??
          (metadata["lineItemId"] as string | undefined) ??
          null,
        quantity: typeof item?.quantity === "number" ? item.quantity : null,
        incoming: incomingMatches,
        processed: processedMatches,
      };
    });

    const totals = items.reduce(
      (acc, current) => {
        acc.incoming += current.incoming.length;
        acc.processed += current.processed.length;
        return acc;
      },
      { incoming: 0, processed: 0 },
    );

    const payload: ArtworkResponse = {
      order_id: orderId,
      generated_at: new Date().toISOString(),
      totals,
      items,
    };

    return res.json(payload);
  } catch (error: unknown) {
    if (MedusaError.isMedusaError(error)) {
      if (error.type === MedusaError.Types.NOT_FOUND) {
        return res.status(404).json({
          code: "order_not_found",
          message: error.message || "Order not found",
        });
      }

      if (
        error.type === MedusaError.Types.UNAUTHORIZED ||
        error.type === MedusaError.Types.NOT_ALLOWED
      ) {
        return res.status(401).json({
          code: "unauthorized",
          message:
            error.message ||
            "You are not allowed to access artwork for this order",
        });
      }
    }

    if (error && typeof error === "object") {
      const status = (error as { status?: unknown }).status;
      if (typeof status === "number" && status >= 400 && status < 600) {
        const message =
          typeof (error as { message?: unknown }).message === "string"
            ? ((error as { message?: unknown }).message as string)
            : "Unexpected error";

        return res.status(status).json({
          code: status === 401 ? "unauthorized" : "artwork_lookup_failed",
          message,
        });
      }
    }

    const message =
      error && typeof error === "object" && "message" in error
        ? String(
            (error as Record<string, unknown>).message ?? "Unexpected error",
          )
        : "Unexpected error";

    return res.status(500).json({
      code: "artwork_lookup_failed",
      message,
    });
  }
};
