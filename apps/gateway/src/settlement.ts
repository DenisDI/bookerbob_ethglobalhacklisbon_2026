// Glue between underwriting (terms + Graph context) and Hedera schedules.
//
// Stitch point (do not pull Graph into @bookerbob/hedera-schedule):
//   ?address=  →  lookupContext (context-bands MCP)  →  decide()  →  Terms
//   earnsRateLock(terms)  →  scheduleForHold({ partnerOrderId })
//
// Who pays: the guest carries settlement risk. The agent only asks for terms
// and holds a rate. Demo: operator signs the HBAR schedule so HashScan is real.
// Prod would attach the guest's payer key / allowance instead.

import {
  createSettlementSchedule,
  executeSchedule,
  hasHederaCredentials,
  HederaScheduleError,
  type SettlementExecution,
  type SettlementSchedule,
} from "@bookerbob/hedera-schedule";

export type SettlementRecord = {
  partnerOrderId: string;
  scheduleId: string;
  scheduleUrl: string;
  createdAt: string;
  executed?: SettlementExecution;
};

/** In-process store so POST /book can find the schedule from prebook/offers. */
const byOrder = new Map<string, SettlementRecord>();
const bySchedule = new Map<string, SettlementRecord>();

export function getSettlementByOrder(
  partnerOrderId: string,
): SettlementRecord | undefined {
  return byOrder.get(partnerOrderId);
}

export async function scheduleForHold(input: {
  partnerOrderId: string;
}): Promise<SettlementRecord | null> {
  if (!hasHederaCredentials()) {
    console.warn("hedera: no LISBON2026_HEDERA_* credentials; skip schedule");
    return null;
  }

  const existing = byOrder.get(input.partnerOrderId);
  if (existing) return existing;

  try {
    const created: SettlementSchedule = await createSettlementSchedule({
      partnerOrderId: input.partnerOrderId,
    });
    const record: SettlementRecord = {
      partnerOrderId: input.partnerOrderId,
      scheduleId: created.scheduleId,
      scheduleUrl: created.scheduleUrl,
      createdAt: new Date().toISOString(),
    };
    byOrder.set(record.partnerOrderId, record);
    bySchedule.set(record.scheduleId, record);
    return record;
  } catch (err) {
    console.error(
      "hedera: ScheduleCreate failed",
      err instanceof HederaScheduleError ? err.code : err,
    );
    return null;
  }
}

export async function settleSchedule(
  scheduleId: string,
): Promise<SettlementExecution> {
  const done = await executeSchedule(scheduleId);
  const record = bySchedule.get(scheduleId);
  if (record) {
    record.executed = done;
  }
  return done;
}
