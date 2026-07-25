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

/**
 * What a lane is about to do, before anything has been asked.
 *
 * An empty lane reading "not asked" teaches nothing, and both lanes idle
 * identically, so a first-time viewer cannot tell what is about to differ. This
 * says it in the agent's own voice, as a sentence and not as a list of what each
 * lane gets: two feature lists side by side is exactly the plan-chooser this
 * product must never become.
 */
export function idleBrief(accent: boolean): string {
  return accent
    ? "a real person will be standing behind this one. it pays nothing to ask, and the money can wait."
    : "nobody will be standing behind this one. it pays a cent for every answer, and whatever it takes has to be paid for in full, up front.";
}

/**
 * The same term, said to the person it happens to.
 *
 * paymentLine() describes an agent in a lane, so it is written in the third
 * person: "pays the whole stay". On the overview the subject is the reader, and
 * a panel headed "your terms right now" that then talks about somebody else is
 * the reason people said they could not tell what it was showing them.
 */
export function yourTermsLine(payment: Payment): string {
  switch (payment) {
    case "prepay_100":
      return "you pay the whole stay before anyone holds a room";
    case "deposit":
      return "you leave a deposit, and the rest waits";
    case "rate_lock_pay_later":
      return "your price is held now, and settled later";
    case "pay_at_checkout":
      return "nothing moves until you check out";
  }
}

/**
 * What the hatched stretch on the rail actually means, in money.
 *
 * The glyph is good and it is not self-explanatory: a hatched bar over a
 * timeline says nothing on its own about whose money it is or how much of it.
 */
export function yourExposureLine(payment: Payment): string {
  switch (payment) {
    case "prepay_100":
      return "all of it, tied up from today";
    case "deposit":
      return "part of it, and only once free cancellation ends";
    case "rate_lock_pay_later":
      return "none of it, until the day it settles";
    case "pay_at_checkout":
      return "none of it, until you arrive";
  }
}

/**
 * Whether these terms let the money wait, which is the only reason a settlement
 * gets scheduled. Mirrors the gateway's earnsRateLock, kept here so the copy
 * layer can ask the question without importing the underwriting engine.
 */
export function earnsSchedule(payment: Payment): boolean {
  return payment === "rate_lock_pay_later" || payment === "pay_at_checkout";
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
 * The metering strip's tag.
 *
 * It read "x402", the protocol that does this work, in both lanes. That is the
 * developer vocabulary the story surface bans by name: a guest reads about their
 * money, and the name of the payment rail is not their money. Identical in both
 * lanes on purpose, so the row stays comparable and only the line under it
 * differs, the same way the rate stays put and only the term moves.
 *
 * The protocol name is not lost, it is just not here: it lives in the specs, the
 * gateway, and the package description.
 */
export const METER_TAG = "PER QUERY";

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
