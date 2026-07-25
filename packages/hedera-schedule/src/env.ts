import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Load repo-root .env without requiring Node 20's process.loadEnvFile. */
function loadDotEnv(): void {
  const path = fileURLToPath(new URL("../../../.env", import.meta.url));
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

function str(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export type HederaEnv = {
  accountId: string;
  privateKey: string;
  /** Who receives the scheduled HBAR. Defaults to operator (demo self-settle). */
  payeeAccountId: string;
};

export function loadHederaEnv(): HederaEnv {
  const accountId = str("LISBON2026_HEDERA_ACCOUNT_ID");
  const privateKey = str("LISBON2026_HEDERA_PRIVATE_KEY");
  if (!accountId || !privateKey) {
    throw new Error(
      "LISBON2026_HEDERA_ACCOUNT_ID and LISBON2026_HEDERA_PRIVATE_KEY are required",
    );
  }
  // Self-transfer nets to zero — useless schedule. Default tip: testnet 0.0.98.
  let payeeAccountId = str("LISBON2026_HEDERA_PAYEE_ACCOUNT_ID", "0.0.98");
  if (payeeAccountId === accountId) payeeAccountId = "0.0.98";
  return { accountId, privateKey, payeeAccountId };
}

export function hasHederaCredentials(): boolean {
  return (
    str("LISBON2026_HEDERA_ACCOUNT_ID").length > 0 &&
    str("LISBON2026_HEDERA_PRIVATE_KEY").length > 0
  );
}
