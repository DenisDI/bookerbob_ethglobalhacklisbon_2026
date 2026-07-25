// Mapping from the booker MCP payload to our shapes. Shared by the live client
// and the fixtures source so both produce identical offers — the captured file
// is a snapshot of a real response, not a parallel format.

import type { Offer, PrebookHold, RateOption } from "../types.js";

export interface RawTopHotel {
  hotel_id?: string;
  lead_price_usd?: number;
  per_night_usd?: number;
  free_cancellation_before?: string | null;
}

export interface RawFindAndPrebook {
  status?: string;
  error?: string;
  message?: string;
  request?: { nights?: number };
  search_hotels?: { count_matching?: number; top?: RawTopHotel[] };
  hotel?: {
    hotel_id?: string;
    name?: string;
    address?: string;
    star_rating?: number;
  };
  rates?: {
    options?: Array<{
      book_hash?: string;
      room_name?: string;
      meal?: string;
      amount_usd?: number;
      per_night_usd?: number;
      free_cancellation_before?: string | null;
    }>;
  };
  prebook?: {
    partner_order_id?: string;
    room_name?: string;
    amount_usd?: number;
    per_night_usd?: number;
    free_cancellation_before?: string | null;
  };
  summary?: string;
}

export interface RawHotelInfo {
  id?: string;
  name?: string;
  address?: string;
  star_rating?: number;
  images?: string[];
}

export function toOffers(
  raw: RawFindAndPrebook,
  info: Map<string, RawHotelInfo>,
): Offer[] {
  const top = raw.search_hotels?.top ?? [];
  return top.flatMap((h): Offer[] => {
    const hotelId = h.hotel_id;
    if (!hotelId) return [];
    const meta = info.get(hotelId) ?? {};
    const chosen = raw.hotel?.hotel_id === hotelId ? raw.hotel : undefined;
    return [
      {
        hotelId,
        name: meta.name ?? chosen?.name ?? null,
        stars: meta.star_rating ?? chosen?.star_rating ?? null,
        address: meta.address ?? chosen?.address ?? null,
        perNightUsd: h.per_night_usd ?? 0,
        totalUsd: h.lead_price_usd ?? 0,
        freeCancellationBefore: h.free_cancellation_before ?? null,
        photoUrl: meta.images?.[0] ?? null,
      },
    ];
  });
}

export function toRates(raw: RawFindAndPrebook): RateOption[] {
  return (raw.rates?.options ?? []).flatMap((r): RateOption[] =>
    r.book_hash
      ? [
          {
            bookHash: r.book_hash,
            roomName: r.room_name ?? null,
            meal: r.meal ?? null,
            totalUsd: r.amount_usd ?? 0,
            perNightUsd: r.per_night_usd ?? 0,
            freeCancellationBefore: r.free_cancellation_before ?? null,
          },
        ]
      : [],
  );
}

export function toHold(raw: RawFindAndPrebook): PrebookHold | null {
  const p = raw.prebook;
  if (!p?.partner_order_id) return null;
  return {
    partnerOrderId: p.partner_order_id,
    roomName: p.room_name ?? null,
    totalUsd: p.amount_usd ?? 0,
    perNightUsd: p.per_night_usd ?? 0,
    freeCancellationBefore: p.free_cancellation_before ?? null,
  };
}
