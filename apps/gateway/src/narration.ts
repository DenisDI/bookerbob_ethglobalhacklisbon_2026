// The agent thinking out loud. Every pipeline step pushes one line, and the
// web demo renders them as a feed beside each pane (specs/00-final-plan.md B.3).
//
// House style: lowercase, warm, plain English. No protocol names, no percentages,
// no jargon on this surface — those belong in a dev pane, not the story. Lines
// describe what actually happened, so they stay true when a step fails.

import { env } from "./env.js";
import type {
  ContextSnapshot,
  InventoryResult,
  NarrationLine,
  PrebookHold,
  Terms,
} from "./types.js";

export class Narrator {
  private readonly lines: NarrationLine[] = [];
  private readonly started = Date.now();

  say(line: string): void {
    this.lines.push({ t: Date.now() - this.started, line });
  }

  all(): NarrationLine[] {
    return [...this.lines];
  }
}

function humanDate(iso: string): string {
  const [, month, day] = iso.split("-");
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  const idx = Number(month) - 1;
  return `${Number(day)} ${months[idx] ?? month}`;
}

export function narrateSearch(n: Narrator, city: string, result: InventoryResult): void {
  n.say(
    `looking for a room in ${city.toLowerCase()}, ${humanDate(result.checkin)} to ${humanDate(result.checkout)}`,
  );

  if (result.source === "cached") {
    // Two different truths wear the same tag. Saying the desk is silent while
    // we deliberately chose not to call it would be a lie on camera.
    n.say(
      env.inventorySource === "cached"
        ? "running on the prices i wrote down earlier"
        : "the desk is not answering right now. going with the prices i wrote down earlier",
    );
  }

  if (result.matchingCount !== null) {
    n.say(`${result.matchingCount} places have a room free`);
  }
}

export function narrateTerms(
  n: Narrator,
  terms: Terms,
  shown: number,
  context: ContextSnapshot | null = null,
  /** True when an address was given and the lookup did not come back. */
  lookupFailed = false,
): void {
  if (terms.tier === "bot") {
    n.say(`nobody is standing behind this request, so i only get to see ${shown}`);
    n.say("and whatever i take here has to be paid for in full, up front");
    return;
  }

  n.say(
    context?.ens
      ? `${context.ens.name} is standing behind this request`
      : "a real person is standing behind this request",
  );
  n.say(`that opens the full list: ${shown} places`);

  const categories = context?.activeCategories ?? [];

  if (terms.tier === "human") {
    // Scripted, not an apology: the credential alone still carries the guest.
    // Which line is true depends on why there is no usable context, and saying
    // the wrong one on camera would be a small lie.
    const band = context?.bands.activity;
    if (lookupFailed) {
      // Never say a wallet was not shared when one was: the request had an
      // address, we simply could not read it.
      n.say("i asked about their wallet and could not get an answer");
    } else if (!context) {
      n.say("no wallet shared here. human terms via the credential alone");
    } else if (band === "unavailable") {
      n.say("i cannot read their history right now, and i am not going to guess");
    } else if (band === "T0") {
      n.say("no onchain history yet. human terms via the credential alone");
    } else {
      n.say("not much history on that address yet. human terms via the credential alone");
    }
    n.say("so i can leave a deposit instead of handing over the whole amount");
    return;
  }

  // The underwriting file, in words. Each line is one axis, so a viewer can see
  // which fact produced which term instead of watching a number go up.
  if (context?.since) {
    n.say(`they have been around since ${context.since}, and they still are`);
  }

  if (categories.length > 0) {
    n.say(`active where it counts: ${categories.join(", ")}`);
  }

  switch (context?.signals.repayment) {
    case "clean":
      n.say("they have borrowed before and paid it back, never caught short");
      break;
    case "borrowing_open":
      // Not a judgement, just money already committed somewhere else.
      n.say("they still owe on something, so this one settles at booking");
      break;
    case "liquidated":
      // Not a verdict on the person, just the reason the money moves earlier.
      n.say("they have been caught short before, so the money moves at booking");
      break;
    default:
      n.say("no borrowing history either way, so nothing to hold against them");
  }

  n.say(
    terms.tier === "elite"
      ? "asking to settle nothing until they actually arrive"
      : "asking to hold this price now and settle it later",
  );
}

/** Only for tiers that are actually given the lock — a bot prepays instead. */
export function narrateHold(n: Narrator, hold: PrebookHold | null): void {
  if (!hold) return;
  n.say(
    hold.freeCancellationBefore
      ? `price held. free to walk away until ${hold.freeCancellationBefore.slice(0, 10)}`
      : "price held",
  );
}
