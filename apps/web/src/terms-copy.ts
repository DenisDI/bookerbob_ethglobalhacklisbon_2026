// Enums never reach the screen. A guest reads about their money, not about our
// type system, so every term is translated into plain words here and nowhere else.

import type { Payment, Terms, Tier } from "./types";

export const PANE_LABEL: Record<"bot" | "backed", string> = {
  bot: "unbacked agent",
  backed: "human-backed agent",
};

/**
 * Standing, as a chip. "TOP STANDING" rather than "elite": a tier ladder with
 * prizes at the top is the pattern this product exists to avoid, and standing is
 * what the bands actually describe.
 */
export const TIER_CHIP: Record<Tier, string> = {
  bot: "BOT",
  human: "HUMAN-BACKED",
  verified: "VERIFIED",
  elite: "TOP STANDING",
};

/** The term, short enough to sit on the traceable room row. */
export function termChip(payment: Payment): string {
  switch (payment) {
    case "prepay_100":
      return "100% PREPAY";
    case "deposit":
      return "DEPOSIT";
    case "rate_lock_pay_later":
      return "PAY LATER";
    case "pay_at_checkout":
      return "PAY AT CHECKOUT";
  }
}

/** One line under the rail: what the guest actually agrees to. */
export function paymentLine(payment: Payment): string {
  switch (payment) {
    case "prepay_100":
      return "pays the whole stay before anyone holds a room";
    case "deposit":
      return "leaves a deposit, the rest waits";
    case "rate_lock_pay_later":
      return "price held now, settled later";
    case "pay_at_checkout":
      return "nothing moves until checkout";
  }
}

/** Short label for the rail caption. */
export function moneyMovesLabel(payment: Payment): string {
  switch (payment) {
    case "prepay_100":
      return "money out from now";
    case "deposit":
      return "part out, rest waits";
    case "rate_lock_pay_later":
    case "pay_at_checkout":
      return "money stays put until checkout";
  }
}

/**
 * The metering strip.
 *
 * Deliberately not the designed copy. The package writes a live 402 lifecycle
 * ("HTTP 402 · paying $0.01 to unlock this answer") and "402 waived on
 * credential", both of which describe a paywall that is not wired yet. These
 * lines say what the product does without claiming a payment that never
 * happened; the full lifecycle is drawn in the walkable flow as a mock.
 */
export function meterLine(accent: boolean): string {
  return accent
    ? "no per-query charge when someone is accountable"
    : "pay-per-query · a cent before every answer";
}

/**
 * How much of the guest's money is tied up between booking and the stay.
 * Drives the height of the exposure bar, so the two panes are comparable at a
 * glance without reading a word.
 */
export function exposure(payment: Payment): number {
  switch (payment) {
    case "prepay_100":
      return 1;
    case "deposit":
      return 0.3;
    case "rate_lock_pay_later":
    case "pay_at_checkout":
      return 0;
  }
}

export function inventoryLine(terms: Terms, shown: number): string {
  return terms.inventory === "basic"
    ? `${shown} rooms, the short list`
    : `${shown} rooms, everything available`;
}

/**
 * The footnote under the rooms.
 *
 * The package reads "8 more rooms sit behind another payment", which says pay
 * more and see more. Depth follows from someone being accountable for the
 * booking, not from paying again: in the terms engine the short list is the
 * anti-farming limit. So the footnote says that instead.
 */
export function roomsFootnote(terms: Terms, shown: number, matching: number | null): string | null {
  const rest = matching === null ? 0 : Math.max(0, matching - shown);
  if (rest === 0) return null;
  return terms.inventory === "basic"
    ? `${rest} more rooms need someone accountable`
    : `+ ${rest} more rooms in inventory · nothing leaves the wallet until checkout`;
}
