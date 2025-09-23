import { useCallback, useEffect, useMemo, useState } from "react";

import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { FetchArgs } from "@medusajs/js-sdk";
import type { AdminOrder, DetailWidgetProps } from "@medusajs/types";
import { Badge, Container, Heading, IconButton, Text } from "@medusajs/ui";
import { ArrowDownTray, Spinner } from "@medusajs/icons";

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

type ArtworkRequestError = Error & { status?: number };

type AdminSdkClient = {
  fetch: <T = unknown>(
    input: RequestInfo | URL,
    init?: FetchArgs,
  ) => Promise<T>;
};

type AdminSdkGlobal = typeof window & {
  __sdk?: {
    client?: AdminSdkClient;
  };
};

const getWindow = () =>
  (typeof window !== "undefined" ? (window as AdminSdkGlobal) : undefined) ??
  null;

const getAdminSdkClient = (): AdminSdkClient | null => {
  const w = getWindow();

  if (!w) {
    return null;
  }

  const client = w.__sdk?.client;

  if (client && typeof client.fetch === "function") {
    return client;
  }

  return null;
};

const parseResponseJson = async <T,>(response: Response): Promise<T | null> => {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const normalizeErrorMessage = (
  error: unknown,
  fallback = "Unable to load artwork",
) => {
  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

const normalizeRequestError = (error: unknown): ArtworkRequestError => {
  if (error instanceof Error) {
    const enriched = error as ArtworkRequestError;

    if (
      typeof (error as Partial<ArtworkRequestError>).status === "number" &&
      enriched.status === undefined
    ) {
      enriched.status = (error as ArtworkRequestError).status;
    }

    return enriched;
  }

  const fallback = new Error(
    normalizeErrorMessage(error),
  ) as ArtworkRequestError;
  return fallback;
};

const decorateErrorMessage = (error: ArtworkRequestError) => {
  if (typeof error.status === "number") {
    if (error.status === 401) {
      return "You are not authorized to view artwork for this order. Please sign in again.";
    }

    if (error.status === 404) {
      return (
        error.message ||
        "Artwork endpoint was not found. Ensure the backend has been rebuilt with the artwork route."
      );
    }
  }

  return error.message || "Unable to load artwork";
};

const fetchArtwork = async (
  orderId: string,
  signal?: AbortSignal,
): Promise<ArtworkResponse> => {
  const path = `/admin/orders/${orderId}/artwork`;
  const client = getAdminSdkClient();

  if (client) {
    try {
      return await client.fetch<ArtworkResponse>(path, { signal });
    } catch (error) {
      if ((error as Error | undefined)?.name === "AbortError") {
        throw error;
      }

      const normalized = normalizeRequestError(error);
      throw normalized;
    }
  }

  const response = await fetch(path, {
    credentials: "include",
    signal,
    headers: {
      accept: "application/json",
    },
  });

  const parsed = await parseResponseJson<
    ArtworkResponse | { message?: string }
  >(response);

  if (!response.ok) {
    const message = normalizeErrorMessage(
      parsed && typeof parsed === "object" ? (parsed as any).message : null,
      `Request failed with status ${response.status}`,
    );
    const error = new Error(message) as ArtworkRequestError;
    error.status = response.status;
    throw error;
  }

  return (
    (parsed as ArtworkResponse) ?? {
      order_id: orderId,
      generated_at: new Date().toISOString(),
      totals: { incoming: 0, processed: 0 },
      items: [],
    }
  );
};

const shortenId = (value?: string | null, max = 12) => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }

  const edge = Math.max(4, Math.floor((max - 1) / 2));
  return `${trimmed.slice(0, edge)}…${trimmed.slice(-edge)}`;
};

const joinClassNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const sanitizeFileName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_.]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();

const getFileExtension = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const sanitized = value.split("?")[0]?.split("#")[0] ?? "";
  const lastDot = sanitized.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === sanitized.length - 1) {
    return "";
  }

  return sanitized.slice(lastDot).toLowerCase();
};

const getFileNameFromUrl = (value: string): string | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, "http://localhost");
    const segment = url.pathname.split("/").filter(Boolean).pop();
    if (!segment) {
      return null;
    }

    return decodeURIComponent(segment);
  } catch {
    const sanitized = value.split("?")[0]?.split("#")[0] ?? "";
    const segment = sanitized.split("/").filter(Boolean).pop();
    return segment ? decodeURIComponent(segment) : null;
  }
};

const ensureAbsoluteUrl = (href: string, w: Window) => {
  try {
    return new URL(href, w.location?.href ?? "").toString();
  } catch {
    return href;
  }
};

type DownloadResult = {
  success: number;
  failed: number;
};

const downloadImageFiles = async (
  sources: string[],
  baseFileName: string,
): Promise<DownloadResult> => {
  const w = getWindow();
  if (!w?.document?.body) {
    throw new Error("Downloads are only available in a browser context");
  }

  const sanitizedBase = sanitizeFileName(baseFileName) || "artwork";
  let success = 0;
  let failed = 0;

  for (let index = 0; index < sources.length; index += 1) {
    const src = sources[index];
    if (!src) {
      failed += 1;
      continue;
    }

    try {
      const link = w.document.createElement("a");
      link.href = ensureAbsoluteUrl(src, w);
      const originalName = getFileNameFromUrl(src);
      const originalExtension = getFileExtension(originalName);
      const sourceExtension = originalExtension || getFileExtension(src);
      const fallbackName = `${sanitizedBase}-${String(index + 1).padStart(2, "0")}${
        sourceExtension || ""
      }`;
      const sanitizedOriginal =
        originalName?.trim() && sanitizeFileName(originalName);
      link.download = sanitizedOriginal || fallbackName;
      link.rel = "noopener";
      link.target = "_self";
      link.style.display = "none";
      w.document.body.appendChild(link);
      link.click();
      w.document.body.removeChild(link);
      success += 1;

      if (index < sources.length - 1) {
        await new Promise<void>((resolve) => {
          w.setTimeout(resolve, 150);
        });
      }
    } catch (error) {
      failed += 1;
      if (w.console) {
        w.console.warn("Failed to trigger artwork download", src, error);
      }
    }
  }

  if (success === 0) {
    throw new Error("No files could be downloaded");
  }

  return { success, failed };
};

const showDownloadAlert = (message: string) => {
  const w = getWindow();
  if (w?.alert) {
    w.alert(message);
  }
};

const normalizeImages = (images: unknown) => {
  if (!Array.isArray(images)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of images) {
    if (typeof item !== "string") {
      continue;
    }

    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

const getMetadataString = (
  metadata: Record<string, unknown>,
  key: string,
): string | null => {
  const value = metadata[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getCartLineItemId = (metadata: Record<string, unknown>) =>
  getMetadataString(metadata, "cart_line_item_id") ??
  getMetadataString(metadata, "cartLineItemId") ??
  getMetadataString(metadata, "lineItemId") ??
  null;

const useArtworkData = (orderId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ArtworkEntry[]>([]);

  useEffect(() => {
    if (!orderId) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchArtwork(orderId, controller.signal)
      .then((payload) => {
        const normalized = Array.isArray(payload?.items)
          ? payload.items.map((entry) => ({
              ...entry,
              incoming: normalizeImages(entry.incoming),
              processed: normalizeImages(entry.processed),
            }))
          : [];

        setItems(normalized);
        setLoading(false);
      })
      .catch((err: any) => {
        if (err?.name === "AbortError") {
          return;
        }

        setItems([]);
        const normalizedError = decorateErrorMessage(
          normalizeRequestError(err),
        );
        setError(normalizedError);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [orderId]);

  return { loading, error, items };
};

type ArtworkGroupProps = {
  label: string;
  images: string[];
  emptyLabel: string;
  onDownload?: () => void;
  downloading?: boolean;
  className?: string;
};

const ArtworkGroup = ({
  label,
  images,
  emptyLabel,
  onDownload,
  downloading,
  className,
}: ArtworkGroupProps) => {
  const hasImages = images.length > 0;

  return (
    <div className={joinClassNames("flex min-w-0 flex-col gap-y-2", className)}>
      <div className="flex items-center gap-x-2">
        <Text size="small" weight="plus">
          {label}
        </Text>
        {hasImages && (
          <Badge size="2xsmall" color="grey">
            {images.length}
          </Badge>
        )}
        {onDownload && (
          <IconButton
            size="2xsmall"
            variant="transparent"
            className="shrink-0"
            onClick={onDownload}
            isLoading={!!downloading}
            disabled={!hasImages || !!downloading}
            type="button"
            aria-label={`Download ${label} artwork`}
          >
            <ArrowDownTray className="h-3 w-3" />
          </IconButton>
        )}
      </div>

      {hasImages ? (
        <div className="flex flex-wrap gap-2">
          {images.map((src, index) => {
            const derivedName = getFileNameFromUrl(src);

            return (
              <a
                key={`${src}-${index}`}
                href={src}
                target="_blank"
                rel="noreferrer"
                download={
                  derivedName ? sanitizeFileName(derivedName) : undefined
                }
                className="group relative block h-20 w-20 overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-subtle"
                title={src}
              >
                <img
                  src={src}
                  alt={`${label} artwork ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </a>
            );
          })}
        </div>
      ) : (
        <Text size="small" className="text-ui-fg-subtle">
          {emptyLabel}
        </Text>
      )}
    </div>
  );
};

const OrderArtworkWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const orderId = data?.id;
  const { loading, error, items } = useArtworkData(orderId);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const itemsWithFallback = useMemo<ArtworkEntry[]>(() => {
    const orderItems = (data?.items ?? []) as AdminOrder["items"];

    if (!orderItems.length && !items.length) {
      return [];
    }

    const byLineId = new Map<string, ArtworkEntry>();
    const byCartId = new Map<string, ArtworkEntry>();

    for (const entry of items) {
      if (entry.line_item_id) {
        byLineId.set(entry.line_item_id, entry);
      }

      if (entry.cart_line_item_id) {
        byCartId.set(entry.cart_line_item_id, entry);
      }
    }

    const consumed = new Set<ArtworkEntry>();

    const fromOrder = orderItems.map((item) => {
      const metadata = ((item as any)?.metadata ?? {}) as Record<
        string,
        unknown
      >;
      const cartLineItemId = getCartLineItemId(metadata);
      const fromLine = item?.id ? byLineId.get(item.id) : undefined;
      const fromCart =
        !fromLine && cartLineItemId ? byCartId.get(cartLineItemId) : undefined;
      const match = fromLine ?? fromCart;

      if (match) {
        consumed.add(match);
        return {
          ...match,
          line_item_id: match.line_item_id ?? item?.id ?? null,
          title: match.title ?? item?.title ?? null,
          cart_line_item_id: match.cart_line_item_id ?? cartLineItemId,
          quantity:
            match.quantity ??
            (typeof item?.quantity === "number" ? item.quantity : null),
        };
      }

      return {
        line_item_id: item?.id ?? null,
        title: item?.title ?? null,
        cart_line_item_id: cartLineItemId,
        quantity: typeof item?.quantity === "number" ? item.quantity : null,
        incoming: [],
        processed: [],
      };
    });

    const extras = items
      .filter((entry) => !consumed.has(entry))
      .map((entry) => ({
        ...entry,
        line_item_id: entry.line_item_id ?? null,
        cart_line_item_id: entry.cart_line_item_id ?? null,
        title: entry.title ?? null,
        quantity: entry.quantity ?? null,
        incoming: entry.incoming ?? [],
        processed: entry.processed ?? [],
      }));

    return [...fromOrder, ...extras];
  }, [data?.items, items]);

  const hasAnyImage = useMemo(
    () =>
      itemsWithFallback.some(
        (item) => item.incoming.length || item.processed.length,
      ),
    [itemsWithFallback],
  );

  const totals = useMemo(
    () =>
      itemsWithFallback.reduce(
        (acc, current) => {
          acc.incoming += current.incoming.length;
          acc.processed += current.processed.length;
          return acc;
        },
        { incoming: 0, processed: 0 },
      ),
    [itemsWithFallback],
  );

  const handleDownload = useCallback(
    async (key: string, baseName: string, images: string[]) => {
      if (!images.length) {
        return;
      }

      if (downloadingKey) {
        return;
      }

      setDownloadingKey(key);

      try {
        const result = await downloadImageFiles(images, baseName);
        if (result.failed > 0) {
          showDownloadAlert(
            "Some artwork files could not be downloaded. Please try again.",
          );
        }
      } catch (downloadError) {
        showDownloadAlert(
          "Unable to download artwork files. Please check the file URLs and try again.",
        );
      } finally {
        setDownloadingKey((current) => (current === key ? null : current));
      }
    },
    [downloadingKey],
  );

  return (
    <Container className="flex flex-col gap-y-0 p-0">
      <div className="flex flex-col gap-y-2 px-6 py-4">
        <Heading level="h2">Order artwork</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Incoming and processed files matched by cart line item identifiers.
        </Text>
        {hasAnyImage && (
          <div className="flex flex-wrap gap-2">
            <Badge size="xsmall" color="blue">
              Incoming: {totals.incoming}
            </Badge>
            <Badge size="xsmall" color="green">
              Processed: {totals.processed}
            </Badge>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-x-2 px-6 pb-4 text-ui-fg-subtle">
          <Spinner className="h-4 w-4 animate-spin" />
          <Text size="small">Loading artwork…</Text>
        </div>
      )}

      {!loading && error && (
        <div className="px-6 pb-4">
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        </div>
      )}

      {!loading && !error && !hasAnyImage && (
        <div className="px-6 pb-4">
          <Text size="small" className="text-ui-fg-subtle">
            No artwork files were found for this order.
          </Text>
        </div>
      )}

      {!!itemsWithFallback.length && (
        <div className="flex flex-col divide-y">
          {itemsWithFallback.map((item, index) => {
            const baseIdentifier =
              item.line_item_id ??
              item.cart_line_item_id ??
              `line-item-${index}`;
            const rawTitle =
              item.title?.trim() ||
              item.cart_line_item_id ||
              item.line_item_id ||
              `line-item-${index + 1}`;
            const normalizedTitle = sanitizeFileName(rawTitle) || "line-item";
            const incomingKey = `${baseIdentifier}-incoming`;
            const processedKey = `${baseIdentifier}-processed`;

            return (
              <div
                key={baseIdentifier}
                className="flex flex-col gap-y-4 px-6 py-4"
              >
                <div className="flex flex-col gap-y-2">
                  <Heading level="h3" className="text-base">
                    {item.title || "Line item"}
                  </Heading>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.quantity !== null && item.quantity !== undefined && (
                      <Badge size="xsmall" color="grey">
                        Qty {item.quantity}
                      </Badge>
                    )}
                    {item.cart_line_item_id ? (
                      <Badge size="xsmall" color="purple">
                        Cart item {shortenId(item.cart_line_item_id)}
                      </Badge>
                    ) : item.line_item_id ? (
                      <Badge size="xsmall" color="purple">
                        Line item {shortenId(item.line_item_id)}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-y-4 gap-x-4 sm:flex-row">
                  <ArtworkGroup
                    label="Incoming"
                    images={item.incoming}
                    emptyLabel="No incoming files"
                    className="sm:flex-1"
                    onDownload={
                      item.incoming.length
                        ? () =>
                            handleDownload(
                              incomingKey,
                              `${normalizedTitle}-incoming`,
                              item.incoming,
                            )
                        : undefined
                    }
                    downloading={downloadingKey === incomingKey}
                  />
                  <ArtworkGroup
                    label="Processed"
                    images={item.processed}
                    emptyLabel="No processed files"
                    className="sm:flex-1"
                    onDownload={
                      item.processed.length
                        ? () =>
                            handleDownload(
                              processedKey,
                              `${normalizedTitle}-processed`,
                              item.processed,
                            )
                        : undefined
                    }
                    downloading={downloadingKey === processedKey}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
});

export default OrderArtworkWidget;
