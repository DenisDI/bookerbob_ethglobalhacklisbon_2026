// Live inventory: the deployed booker MCP (RateHawk-backed).
//
// Verified against the live server on 2026-07-25:
//   endpoint  https://flexrep.xyz/mcp_travel/mcp  (exact path; bare paths 301/405
//             and MCP clients do not replay POST through a redirect)
//   transport streamable-http, responses arrive as text/event-stream
//   auth      Authorization: Bearer <token>, wrong key -> HTTP 401
//   timing    find_and_prebook_hotel ~15s (real supplier search + prebook),
//             get_hotel_info ~0.4s (cached 30 days upstream)
//
// Sessions are in-memory on a single instance, so mcp-session-id is treated as
// disposable: every attempt opens its own client and any failure retries once
// with a fresh session before giving up (specs/00-final-plan.md E).

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "../env.js";
import type { InventoryQuery, InventoryResult } from "../types.js";
import {
  type RawFindAndPrebook,
  type RawHotelInfo,
  toHold,
  toOffers,
  toRates,
} from "./map.js";

/** The one-shot call does a real supplier round trip; 2s would never survive. */
const SEARCH_TIMEOUT_MS = 25_000;
const INFO_TIMEOUT_MS = 5_000;

export class BookerError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "BookerError";
  }
}

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  if (!env.bookerToken) {
    throw new BookerError("BOOKER_TOKEN is not set", "no_credentials");
  }
  const transport = new StreamableHTTPClientTransport(new URL(env.bookerUrl), {
    requestInit: { headers: { Authorization: `Bearer ${env.bookerToken}` } },
  });
  const client = new Client({ name: "fairterms-gateway", version: "0.1.0" });
  try {
    await client.connect(transport);
    return await fn(client);
  } finally {
    await client.close().catch(() => {});
  }
}

/** Any failure gets exactly one fresh-session retry, then we surrender. */
async function withRetry<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  try {
    return await withClient(fn);
  } catch (first) {
    if (first instanceof BookerError && first.code !== "unreachable") throw first;
    try {
      return await withClient(fn);
    } catch (second) {
      throw new BookerError(
        `booker unreachable: ${(second as Error).message}`,
        "unreachable",
      );
    }
  }
}

/**
 * MCP reports tool failures as a normal result with isError set, not as a
 * rejection. Missing that turns a server-side crash into a silently empty
 * object, so surface it as an error here.
 */
async function callToolStructured<T>(
  client: Client,
  name: string,
  args: Record<string, unknown>,
  timeoutMs: number,
): Promise<T> {
  const res = await client.callTool({ name, arguments: args }, undefined, {
    timeout: timeoutMs,
  });

  if (res.isError) {
    const text = Array.isArray(res.content)
      ? res.content
          .map((part) => (part as { text?: string }).text)
          .filter(Boolean)
          .join(" ")
      : "";
    throw new BookerError(text || `${name} failed`, "tool_error");
  }

  if (!res.structuredContent) {
    throw new BookerError(`${name} returned no structured content`, "no_content");
  }

  return res.structuredContent as T;
}

function searchArgs(query: InventoryQuery): Record<string, unknown> {
  return {
    city: query.city,
    checkin: query.checkin,
    checkout: query.checkout,
    guests: [{ adults: query.adults ?? 2, children: [] }],
    refundable_only: true,
    top_n: query.topN ?? 3,
    currency: "USD",
    ...(query.maxPerNightUsd ? { max_per_night_usd: query.maxPerNightUsd } : {}),
  };
}

/** Names and photos are not in the search payload; fetch them per hotel. */
async function fetchHotelInfo(
  client: Client,
  hotelIds: string[],
): Promise<Map<string, RawHotelInfo>> {
  const entries = await Promise.all(
    hotelIds.map(async (id) => {
      try {
        const info = await callToolStructured<RawHotelInfo>(
          client,
          "get_hotel_info",
          { hotel_id: id },
          INFO_TIMEOUT_MS,
        );
        return [id, info] as const;
      } catch (err) {
        // Enrichment only — never fail an offer over a missing photo. Still
        // say so out loud: a silent miss looks identical to a hotel with no
        // pictures, and the finale card depends on these.
        console.warn(`hotel info failed for ${id}: ${(err as Error).message}`);
        return [id, {} as RawHotelInfo] as const;
      }
    }),
  );
  return new Map(entries);
}

async function searchWithInfo(
  client: Client,
  query: InventoryQuery,
): Promise<{ result: RawFindAndPrebook; info: Map<string, RawHotelInfo> }> {
  const result = await callToolStructured<RawFindAndPrebook>(
    client,
    "find_and_prebook_hotel",
    searchArgs(query),
    SEARCH_TIMEOUT_MS,
  );

  if (result.status !== "ok") {
    throw new BookerError(
      result.message ?? result.error ?? "booker returned an error",
      result.error ?? result.status ?? "unknown",
    );
  }

  const ids = (result.search_hotels?.top ?? [])
    .map((h) => h.hotel_id)
    .filter((id): id is string => Boolean(id));
  return { result, info: await fetchHotelInfo(client, ids) };
}

/**
 * Prod path per the partner doc: one call that searches, picks the best match,
 * and holds its rate. No payment, no booking.
 */
export async function findAndPrebook(
  query: InventoryQuery,
): Promise<InventoryResult> {
  const { result, info } = await withRetry((client) =>
    searchWithInfo(client, query),
  );

  return {
    city: query.city,
    checkin: query.checkin,
    checkout: query.checkout,
    nights: result.request?.nights ?? null,
    matchingCount: result.search_hotels?.count_matching ?? null,
    offers: toOffers(result, info),
    rates: toRates(result),
    hold: toHold(result),
    summary: result.summary ?? null,
    source: "live",
    capturedAt: null,
  };
}

/** Raw passthrough for scripts/capture-fixtures.ts. */
export async function captureRaw(query: InventoryQuery): Promise<{
  response: RawFindAndPrebook;
  hotelInfo: Record<string, RawHotelInfo>;
}> {
  const { result, info } = await withRetry((client) =>
    searchWithInfo(client, query),
  );
  return { response: result, hotelInfo: Object.fromEntries(info) };
}

/**
 * Seam for when the service enables real bookings. book_hotel is disabled
 * server-side today so test runs cannot leave real reservations behind; this
 * refuses locally too, so nothing reaches the network by accident.
 */
export async function bookHotel(): Promise<never> {
  if (!env.bookingEnabled) {
    throw new BookerError(
      "real bookings are off: booker runs prebook-only and BOOKER_BOOKING_ENABLED is not true",
      "booking_disabled",
    );
  }
  throw new BookerError(
    "book_hotel is not implemented yet; enable it on the booker server first",
    "not_implemented",
  );
}
