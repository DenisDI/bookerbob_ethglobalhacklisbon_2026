#!/usr/bin/env -S npx tsx
/**
 * End-to-end scenario runner for the BookerBob gateway race path.
 *
 *   npm run test:scenarios                  # local :3000
 *   LISBON2026_GATEWAY_URL=https://lisbonhack.world npm run test:scenarios
 *   npm run test:scenarios -- --learn       # append novel outcomes to catalog
 *   npm run test:scenarios -- --soft-hedera # rate-lock without schedule = warn, not fail
 *
 * Catalog: scripts/scenarios/catalog.json
 * Learned cases land with needsReview:true so we expand coverage without lying.
 */

import { createAgentkitClient, declareAgentkitExtension } from "@worldcoin/agentkit";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CATALOG_PATH = fileURLToPath(
  new URL("./scenarios/catalog.json", import.meta.url),
);

loadDotEnv(fileURLToPath(new URL("../.env", import.meta.url)));

const GATEWAY =
  process.env.LISBON2026_GATEWAY_URL?.trim() || "http://localhost:3000";
const LEARN = process.argv.includes("--learn");
const SOFT_HEDERA =
  process.argv.includes("--soft-hedera") ||
  process.env.LISBON2026_SOFT_HEDERA === "1";
// Local often has no Graph key; prod must be strict unless overridden.
const SOFT_GRAPH =
  process.argv.includes("--soft-graph") ||
  process.env.LISBON2026_SOFT_GRAPH === "1" ||
  (!process.argv.includes("--strict-graph") &&
    /localhost|127\.0\.0\.1/.test(GATEWAY));

type ScheduleExpect = "absent" | "present" | "if_rate_lock";

type Expect = {
  ok?: boolean;
  credentialStatus?: string;
  credentialSource?: string;
  tier?: string;
  tierAnyOf?: string[];
  payment?: string;
  paymentAnyOf?: string[];
  hasContext?: boolean;
  hold?: boolean;
  schedule?: ScheduleExpect;
};

type Case = {
  id: string;
  kind: "health" | "offers" | "agentkit";
  query?: Record<string, string>;
  expect: Expect;
  optional?: boolean;
  notes?: string;
  learned?: boolean;
  needsReview?: boolean;
  learnedAt?: string;
  learnedFrom?: string;
};

type Catalog = { version: number; description?: string; cases: Case[] };

type OffersBody = {
  error?: string;
  terms?: { tier: string; payment: string; inventory: string };
  reason?: string;
  credential?: { status: string; source?: string };
  context?: { bands?: Record<string, string> } | null;
  hold?: { partnerOrderId: string } | null;
  scheduleId?: string | null;
  scheduleUrl?: string | null;
  hasCredential?: boolean;
};

type Result = {
  id: string;
  ok: boolean;
  skipped?: boolean;
  warn?: boolean;
  errors: string[];
  observed?: Record<string, unknown>;
};

function loadDotEnv(path: string): void {
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

function rateLock(payment: string | undefined): boolean {
  return payment === "rate_lock_pay_later" || payment === "pay_at_checkout";
}

function fingerprint(input: {
  kind: string;
  query?: Record<string, string>;
  observed: Record<string, unknown>;
}): string {
  return JSON.stringify({
    kind: input.kind,
    query: input.query ?? {},
    tier: input.observed.tier,
    payment: input.observed.payment,
    credentialStatus: input.observed.credentialStatus,
    hasContext: input.observed.hasContext,
    schedule: input.observed.schedulePresent,
  });
}

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function runHealth(c: Case): Promise<Result> {
  const { status, body } = await fetchJson(`${GATEWAY}/health`);
  const b = body as { ok?: boolean };
  const errors: string[] = [];
  if (status !== 200) errors.push(`HTTP ${status}`);
  if (c.expect.ok === true && b.ok !== true) errors.push("health.ok !== true");
  return {
    id: c.id,
    ok: errors.length === 0,
    errors,
    observed: { status, ok: b.ok },
  };
}

function checkOffersExpect(c: Case, body: OffersBody): string[] {
  const errors: string[] = [];
  const tier = body.terms?.tier;
  const payment = body.terms?.payment;
  const cred = body.credential?.status;
  const hasContext = body.context != null;
  const hold = body.hold != null;
  const schedulePresent = Boolean(body.scheduleId && body.scheduleUrl);

  if (body.error) errors.push(`error field: ${body.error}`);

  if (c.expect.credentialStatus && cred !== c.expect.credentialStatus) {
    errors.push(
      `credential.status ${cred ?? "∅"} !== ${c.expect.credentialStatus}`,
    );
  }
  if (
    c.expect.credentialSource &&
    body.credential?.source !== c.expect.credentialSource
  ) {
    errors.push(
      `credential.source ${body.credential?.source ?? "∅"} !== ${c.expect.credentialSource}`,
    );
  }
  if (c.expect.tier && tier !== c.expect.tier) {
    errors.push(`tier ${tier ?? "∅"} !== ${c.expect.tier}`);
  }
  if (c.expect.tierAnyOf && tier && !c.expect.tierAnyOf.includes(tier)) {
    errors.push(`tier ${tier} not in [${c.expect.tierAnyOf.join(",")}]`);
  }
  if (c.expect.payment && payment !== c.expect.payment) {
    errors.push(`payment ${payment ?? "∅"} !== ${c.expect.payment}`);
  }
  if (
    c.expect.paymentAnyOf &&
    payment &&
    !c.expect.paymentAnyOf.includes(payment)
  ) {
    errors.push(
      `payment ${payment} not in [${c.expect.paymentAnyOf.join(",")}]`,
    );
  }
  if (c.expect.hasContext !== undefined && hasContext !== c.expect.hasContext) {
    errors.push(
      hasContext === false && c.expect.hasContext === true
        ? "hasContext false (Graph lookup empty — key/MCP?)"
        : `hasContext ${hasContext} !== ${c.expect.hasContext}`,
    );
  }
  if (c.expect.hold !== undefined && hold !== c.expect.hold) {
    errors.push(`hold ${hold} !== ${c.expect.hold}`);
  }

  if (c.expect.schedule === "absent" && schedulePresent) {
    errors.push("schedule present but expected absent");
  }
  if (c.expect.schedule === "present" && !schedulePresent) {
    errors.push("schedule missing but expected present");
  }
  if (c.expect.schedule === "if_rate_lock" && rateLock(payment) && !schedulePresent) {
    errors.push(
      "rate-lock terms but no scheduleId/scheduleUrl (Hedera secrets?)",
    );
  }

  // Tier/payment/hold that depend on Graph are noisy when context is missing.
  if (!hasContext && c.query?.address) {
    return errors.filter(
      (e) =>
        e.startsWith("hasContext") ||
        e.startsWith("credential") ||
        e.startsWith("error") ||
        e.startsWith("schedule present"),
    );
  }

  return errors;
}

function observeOffers(body: OffersBody): Record<string, unknown> {
  return {
    tier: body.terms?.tier,
    payment: body.terms?.payment,
    credentialStatus: body.credential?.status,
    credentialSource: body.credential?.source,
    hasContext: body.context != null,
    hold: body.hold != null,
    schedulePresent: Boolean(body.scheduleId && body.scheduleUrl),
    scheduleId: body.scheduleId ?? null,
    reason: body.reason,
    bands: body.context?.bands ?? null,
  };
}

async function runOffers(c: Case): Promise<Result> {
  const params = new URLSearchParams(c.query ?? {});
  const { status, body } = await fetchJson(
    `${GATEWAY}/offers?${params.toString()}`,
  );
  const b = body as OffersBody;
  const errors: string[] = [];
  if (status !== 200) errors.push(`HTTP ${status}`);
  errors.push(...checkOffersExpect(c, b));
  const { hard, soft } = soften(errors);
  return {
    id: c.id,
    ok: hard.length === 0,
    warn: soft.length > 0,
    errors: [...hard, ...soft.map((e) => `WARN ${e}`)],
    observed: observeOffers(b),
  };
}

function soften(errors: string[]): { hard: string[]; soft: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];
  for (const e of errors) {
    const graphSoft = SOFT_GRAPH && e.includes("Graph lookup empty");
    const hederaSoft = SOFT_HEDERA && e.includes("Hedera secrets");
    if (graphSoft || hederaSoft) soft.push(e);
    else hard.push(e);
  }
  return { hard, soft };
}

async function buildAgentkitHeader(resource: string): Promise<string | null> {
  const key = process.env.LISBON2026_AGENT_PRIVATE_KEY?.trim();
  if (!key) return null;
  const account = privateKeyToAccount(key as `0x${string}`);
  const chain = "eip155:480";
  const client = createAgentkitClient({
    signer: {
      address: account.address,
      chainId: chain,
      type: "eip191",
      signMessage: (message) => account.signMessage({ message }),
    },
  });
  const declared = declareAgentkitExtension({
    domain: new URL(GATEWAY).hostname,
    resourceUri: resource,
    statement: "book a room on behalf of the human backing this agent",
    network: chain,
  });
  const base = Object.values(declared)[0];
  if (!base) throw new Error("agentkit extension missing");
  const extension = {
    ...base,
    info: {
      ...base.info,
      nonce: crypto.randomUUID().replace(/-/g, ""),
      issuedAt: new Date().toISOString(),
    },
  };
  return client.createHeader(extension);
}

async function runAgentkit(c: Case): Promise<Result> {
  const resource = `${GATEWAY}/offers`;
  const header = await buildAgentkitHeader(resource);
  if (!header) {
    return {
      id: c.id,
      ok: true,
      skipped: true,
      errors: ["skipped: LISBON2026_AGENT_PRIVATE_KEY not set"],
    };
  }
  const params = new URLSearchParams(c.query ?? {});
  const { status, body } = await fetchJson(`${resource}?${params}`, {
    headers: { agentkit: header },
  });
  const b = body as OffersBody;
  const errors: string[] = [];
  if (status !== 200) errors.push(`HTTP ${status}`);
  errors.push(...checkOffersExpect(c, b));
  const { hard, soft } = soften(errors);
  return {
    id: c.id,
    ok: hard.length === 0,
    warn: soft.length > 0,
    errors: [...hard, ...soft.map((e) => `WARN ${e}`)],
    observed: observeOffers(b),
  };
}

async function runCase(c: Case): Promise<Result> {
  try {
    if (c.kind === "health") return runHealth(c);
    if (c.kind === "offers") return runOffers(c);
    if (c.kind === "agentkit") {
      if (c.optional && !process.env.LISBON2026_AGENT_PRIVATE_KEY?.trim()) {
        return {
          id: c.id,
          ok: true,
          skipped: true,
          errors: ["skipped: optional AgentKit case, no key"],
        };
      }
      return runAgentkit(c);
    }
    return { id: c.id, ok: false, errors: [`unknown kind`] };
  } catch (err) {
    return {
      id: c.id,
      ok: false,
      errors: [(err as Error).message],
    };
  }
}

function learnFrom(
  catalog: Catalog,
  c: Case,
  result: Result,
): Case | null {
  if (!result.observed || result.skipped) return null;
  const fp = fingerprint({
    kind: c.kind,
    query: c.query,
    observed: result.observed,
  });
  const known = new Set(
    catalog.cases.map((x) =>
      fingerprint({
        kind: x.kind,
        query: x.query,
        observed: {
          tier: x.expect.tier ?? x.expect.tierAnyOf?.[0],
          payment: x.expect.payment ?? x.expect.paymentAnyOf?.[0],
          credentialStatus: x.expect.credentialStatus,
          hasContext: x.expect.hasContext,
          schedulePresent:
            x.expect.schedule === "present" ||
            x.expect.schedule === "if_rate_lock",
        },
      }),
    ),
  );
  // Only learn when the case failed (unexpected) or fingerprint is new.
  if (result.ok && known.has(fp)) return null;

  const obs = result.observed;
  const payment = String(obs.payment ?? "");
  const learned: Case = {
    id: `learned-${c.id}-${Date.now().toString(36)}`,
    kind: c.kind,
    query: c.query,
    expect: {
      credentialStatus: obs.credentialStatus as string | undefined,
      credentialSource: obs.credentialSource as string | undefined,
      tier: obs.tier as string | undefined,
      payment: payment || undefined,
      hasContext: obs.hasContext as boolean | undefined,
      hold: obs.hold as boolean | undefined,
      schedule: obs.schedulePresent
        ? "present"
        : rateLock(payment)
          ? "if_rate_lock"
          : "absent",
    },
    learned: true,
    needsReview: true,
    learnedAt: new Date().toISOString(),
    learnedFrom: c.id,
    notes: `Auto-learned from ${c.id} against ${GATEWAY}. Review before trusting.`,
  };
  return learned;
}

async function main(): Promise<void> {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as Catalog;
  console.log(`gateway  ${GATEWAY}`);
  console.log(`catalog  ${catalog.cases.length} cases`);
  console.log(
    `flags    learn=${LEARN} softHedera=${SOFT_HEDERA} softGraph=${SOFT_GRAPH}`,
  );
  console.log("");

  const results: Result[] = [];
  const learned: Case[] = [];

  for (const c of catalog.cases) {
    process.stdout.write(`· ${c.id} … `);
    const result = await runCase(c);
    results.push(result);

    if (result.skipped) {
      console.log(`skip (${result.errors[0] ?? "optional"})`);
      continue;
    }
    if (result.ok && !result.warn) {
      console.log("ok");
    } else if (result.ok && result.warn) {
      console.log(`ok* ${result.errors.filter((e) => e.startsWith("WARN")).join("; ")}`);
    } else {
      console.log(`FAIL`);
      for (const e of result.errors) console.log(`    ${e}`);
      if (result.observed) {
        console.log(`    observed ${JSON.stringify(result.observed)}`);
      }
    }

    if (LEARN && (!result.ok || result.warn)) {
      const draft = learnFrom(catalog, c, result);
      if (draft) {
        // de-dupe against already-learned this run
        const dup = learned.some(
          (x) =>
            fingerprint({
              kind: x.kind,
              query: x.query,
              observed: {
                tier: x.expect.tier,
                payment: x.expect.payment,
                credentialStatus: x.expect.credentialStatus,
                hasContext: x.expect.hasContext,
                schedulePresent: x.expect.schedule === "present",
              },
            }) ===
            fingerprint({
              kind: draft.kind,
              query: draft.query,
              observed: {
                tier: draft.expect.tier,
                payment: draft.expect.payment,
                credentialStatus: draft.expect.credentialStatus,
                hasContext: draft.expect.hasContext,
                schedulePresent: draft.expect.schedule === "present",
              },
            }),
        );
        if (!dup) {
          learned.push(draft);
          console.log(`    learned → ${draft.id}`);
        }
      }
    }
  }

  if (LEARN && learned.length) {
    catalog.cases.push(...learned);
    writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
    console.log(
      `\nwrote ${learned.length} learned case(s) to scripts/scenarios/catalog.json`,
    );
  }

  const failed = results.filter((r) => !r.ok && !r.skipped);
  const warned = results.filter((r) => r.warn);
  const skipped = results.filter((r) => r.skipped);
  console.log("");
  console.log(
    `done  ${results.length - failed.length - skipped.length} pass · ${failed.length} fail · ${warned.length} warn · ${skipped.length} skip`,
  );

  // Write a machine-readable last run next to the catalog (gitignored optional — commit for CI later).
  const reportPath = fileURLToPath(
    new URL("./scenarios/last-run.json", import.meta.url),
  );
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        gateway: GATEWAY,
        at: new Date().toISOString(),
        root: ROOT,
        results,
        learnedIds: learned.map((c) => c.id),
      },
      null,
      2,
    )}\n`,
  );

  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
