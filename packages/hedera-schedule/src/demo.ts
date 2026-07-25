#!/usr/bin/env -S npx tsx
// Autonomous Hedera payment demo for the Agentic Payments prize:
// create a settlement schedule, print HashScan, execute, print result.

import {
  createSettlementSchedule,
  executeSchedule,
} from "./index.js";

const partnerOrderId = `demo-${Date.now()}`;
console.log(`creating schedule for ${partnerOrderId} ...`);

const created = await createSettlementSchedule({ partnerOrderId });
console.log(`scheduleId  ${created.scheduleId}`);
console.log(`schedule    ${created.scheduleUrl}`);
if (created.executedTransactionUrl) {
  console.log(`already executed at create: ${created.executedTransactionUrl}`);
}

console.log("executing / confirming ...");
const done = await executeSchedule(created.scheduleId);
console.log(`transaction ${done.transactionId}`);
console.log(`hashscan    ${done.transactionUrl}`);
console.log("ok");
