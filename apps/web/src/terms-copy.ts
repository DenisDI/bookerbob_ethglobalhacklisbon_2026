// Enums never reach the screen. A guest reads about their money, not about our
// type system, so every term is translated into plain words here and nowhere else.

import type { Payment, Terms } from "./types";

export const PANE_LABEL: Record<"bot" | "backed", string> = {
  bot: "unbacked agent",
  backed: "human-backed agent",
};

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

/** Short label for the rail marker. */
export function moneyMovesLabel(payment: Payment): string {
  return payment === "prepay_100" || payment === "deposit"
    ? "money out from now"
    : "money stays put until checkout";
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
