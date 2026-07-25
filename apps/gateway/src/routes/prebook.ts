// POST /prebook — rate lock already taken inside /offers for the demo race;
// this route re-attaches / creates the Hedera schedule for a known hold.

import type { Context } from "hono";
import { scheduleForHold } from "../settlement.js";
import { getCredential, mayDeferSettlement } from "../world.js";

export async function prebookHandler(c: Context) {
  // Deferring settlement is the thing the credential underwrites, so the route
  // that schedules it refuses a caller nobody is accountable for. Without this
  // the terms were only enforced where they were displayed.
  const credential = getCredential(c);
  if (!mayDeferSettlement(credential)) {
    return c.json(
      {
        error: "credential_required",
        message: "no one is accountable for this request, so nothing is deferred",
      },
      403,
    );
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    partnerOrderId?: string;
  };
  const partnerOrderId = body.partnerOrderId?.trim();
  if (!partnerOrderId) {
    return c.json({ error: "partnerOrderId_required" }, 400);
  }

  const settlement = await scheduleForHold({ partnerOrderId });
  if (!settlement) {
    return c.json({ error: "schedule_unavailable" }, 503);
  }

  return c.json({
    partnerOrderId: settlement.partnerOrderId,
    scheduleId: settlement.scheduleId,
    scheduleUrl: settlement.scheduleUrl,
    createdAt: settlement.createdAt,
  });
}
