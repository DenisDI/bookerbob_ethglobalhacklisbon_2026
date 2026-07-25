/** HashScan links — UI opens these; never show a bare id as the product surface. */

/**
 * HashScan dropped hash-router URLs (`/#/testnet/...`). Path form is what the
 * explorer serves now; the old `#/` links open a blank shell.
 */
export function scheduleUrl(scheduleId: string): string {
  return `https://hashscan.io/testnet/schedule/${scheduleId}`;
}

/**
 * Normalize SDK / facilitator ids (`0.0.x@seconds.nanos`) to the mirror/HashScan
 * form (`0.0.x-seconds-nanos`) and open the live explorer page.
 */
export function toHashScanTxId(transactionId: string): string {
  const cleaned = transactionId.replace(/\?scheduled$/, "").trim();
  const m = /^([\d.]+)@(\d+)\.(\d+)$/.exec(cleaned);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return cleaned.replace("@", "-");
}

export function transactionUrl(transactionId: string): string {
  return `https://hashscan.io/testnet/transaction/${toHashScanTxId(transactionId)}`;
}
