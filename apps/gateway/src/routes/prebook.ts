// POST /prebook — rate lock already taken inside /offers for the demo race;
// this route re-attaches / creates the Hedera schedule for a known hold.

import type { Context } from "hono";
import { scheduleForHold } from "../settlement.js";

export async function prebookHandler(c: Context) {
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
