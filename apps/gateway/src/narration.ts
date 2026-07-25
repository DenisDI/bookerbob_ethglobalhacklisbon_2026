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
): void {
  if (terms.tier === "bot") {
    n.say(`nobody is standing behind this request, so i only get to see ${shown}`);
    n.say("and whatever i take here has to be paid for in full, up front");
    return;
  }

  n.say("a real person is standing behind this request");
  n.say(`that opens the full list: ${shown} places`);

  const categories = context?.activeCategories ?? [];

  if (terms.tier === "human") {
    // Scripted, not an apology: the credential alone still carries the guest.
    n.say("no onchain history yet. human terms via the credential alone");
    n.say("so i can leave a deposit instead of handing over the whole amount");
    return;
  }

  if (categories.length > 0) {
    n.say(`and they have a track record here: ${categories.join(", ")}`);
  } else {
    n.say("and they have a track record worth counting");
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
