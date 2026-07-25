// POST /book — execute the Hedera schedule at checkout (guest settlement beat).

import type { Context } from "hono";
import { getSettlementByOrder, settleSchedule } from "../settlement.js";

export async function bookHandler(c: Context) {
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
