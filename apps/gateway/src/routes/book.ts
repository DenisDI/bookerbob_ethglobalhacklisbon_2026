// POST /book — execute the Hedera schedule at checkout (guest settlement beat).

import type { Context } from "hono";
import { getSettlementByOrder, settleSchedule } from "../settlement.js";
import { getCredential, mayDeferSettlement } from "../world.js";

export async function bookHandler(c: Context) {
  // Same gate as /prebook: executing a deferred settlement is exactly what an
  // anonymous caller has not earned.
  if (!mayDeferSettlement(getCredential(c))) {
    return c.json(
      {
        error: "credential_required",
        message: "no one is accountable for this request, so nothing is settled",
      },
      403,
    );
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    partnerOrderId?: string;
    scheduleId?: string;
  };

  let scheduleId = body.scheduleId?.trim();
  if (!scheduleId && body.partnerOrderId) {
    scheduleId = getSettlementByOrder(body.partnerOrderId.trim())?.scheduleId;
  }
  if (!scheduleId) {
    return c.json({ error: "scheduleId_or_partnerOrderId_required" }, 400);
  }

  try {
    const done = await settleSchedule(scheduleId);
    return c.json({
      scheduleId: done.scheduleId,
      scheduleUrl: done.scheduleUrl,
      transactionId: done.transactionId,
      transactionUrl: done.transactionUrl,
    });
  } catch (err) {
    return c.json(
      {
        error: "schedule_execute_failed",
        message: (err as Error).message,
      },
      502,
    );
  }
}
