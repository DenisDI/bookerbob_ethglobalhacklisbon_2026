/** HashScan links — UI opens these; never show a bare id as the product surface. */

export function scheduleUrl(scheduleId: string): string {
  return `https://hashscan.io/testnet/schedule/${scheduleId}`;
}

export function transactionUrl(transactionId: string): string {
  // HashScan accepts the SDK string form with @ and ?scheduled stripped/encoded.
  const id = transactionId.replace(/\?scheduled$/, "");
  return `https://hashscan.io/testnet/transaction/${encodeURIComponent(id)}`;
}
