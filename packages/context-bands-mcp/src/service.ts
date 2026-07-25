// Ties the pieces together: registry -> template per schema -> gateway ->
// freshness gate -> bands. Sources are queried in parallel and every failure is
// reported rather than swallowed, because a missing source changes what the
// answer means.

import { computeBands } from "./bands.js";
import { failedFreshness, readFreshness } from "./freshness.js";
import { API_KEY_VARS, type Payer, payerFromEnv, query } from "./graph.js";
import { loadRegistry } from "./registry.js";
import { TEMPLATES } from "./templates/index.js";
import type {
  BandsResult,
  NameRecord,
  SourceResult,
  SubgraphManifest,
} from "./types.js";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export class AddressError extends Error {}
export class NoPayerError extends Error {}

export function looksLikeName(input: string): boolean {
  return NAME.test(input.trim());
}

export function normaliseAddress(address: string): string {
  const trimmed = address.trim();
  if (!ADDRESS.test(trimmed)) {
    throw new AddressError(`not an EVM address: ${address}`);
  }
  // Messari account ids are lowercase and the Uniswap filters are Bytes, which
  // also want lowercase. Normalising here lets callers pass any casing.
  return trimmed.toLowerCase();
}

function namingSource(registry: SubgraphManifest[]): SubgraphManifest | undefined {
  return registry.find((m) => m.role === "naming");
}

/** name.eth -> address, through the same gateway as everything else. */
export async function resolveName(
  name: string,
  options: ServiceOptions = {},
): Promise<{ address: string; record: NameRecord } | null> {
  const payer = options.payer ?? requirePayer();
  const registry = options.registry ?? loadRegistry();
  const manifest = namingSource(registry);
  if (!manifest) return null;

  const template = TEMPLATES[manifest.schemaType];
  if (!template || template.kind !== "naming") return null;

  try {
    const data = await query<unknown>(
      payer,
      manifest.subgraphId,
      template.forwardQuery,
      template.forwardVariables(name),
    );
    return template.readForward(data);
  } catch {
    return null;
  }
}

async function readSource(
  payer: Payer,
  manifest: SubgraphManifest,
  address: string,
  nowSeconds: number,
): Promise<SourceResult> {
  const template = TEMPLATES[manifest.schemaType];
  if (!template) {
    return {
      manifest,
      reading: null,
      name: null,
      freshness: failedFreshness(
        manifest.name,
        `no template for schemaType ${manifest.schemaType}`,
      ),
    };
  }

  try {
    const isNaming = template.kind === "naming";
    const data = await query<unknown>(
      payer,
      manifest.subgraphId,
      isNaming ? template.reverseQuery : template.query,
      isNaming
        ? template.reverseVariables(address)
        : template.variables(address),
    );

    return {
      manifest,
      // A stale source is still read; the gate decides whether it counts, which
      // keeps the difference inspectable instead of invisible.
      reading:
        template.kind === "activity" && manifest.category
          ? template.read(data, manifest.category)
          : null,
      name: isNaming ? template.readReverse(data) : null,
      freshness: readFreshness(manifest.name, data, nowSeconds),
    };
  } catch (err) {
    return {
      manifest,
      reading: null,
      name: null,
      freshness: failedFreshness(manifest.name, (err as Error).message),
    };
  }
}

/**
 * The whole computation with the network removed: one raw response per registry
 * entry in, the answer out. Tests drive this directly, which is why the suite
 * needs neither a key nor a connection.
 */
export function bandsFromResponses(
  rawAddress: string,
  registry: SubgraphManifest[],
  responses: Record<string, unknown>,
  nowSeconds: number,
): BandsResult {
  const address = normaliseAddress(rawAddress);

  const results = registry.map((manifest): SourceResult => {
    const template = TEMPLATES[manifest.schemaType];
    const data = responses[manifest.name];

    if (!template) {
      return {
        manifest,
        reading: null,
        name: null,
        freshness: failedFreshness(
          manifest.name,
          `no template for schemaType ${manifest.schemaType}`,
        ),
      };
    }
    if (data === undefined) {
      return {
        manifest,
        reading: null,
        name: null,
        freshness: failedFreshness(manifest.name, "no response recorded"),
      };
    }

    return {
      manifest,
      reading:
        template.kind === "activity" && manifest.category
          ? template.read(data, manifest.category)
          : null,
      name: template.kind === "naming" ? template.readReverse(data) : null,
      freshness: readFreshness(manifest.name, data, nowSeconds),
    };
  });

  return computeBands(address, results, nowSeconds);
}

export interface ServiceOptions {
  payer?: Payer;
  registry?: SubgraphManifest[];
  nowSeconds?: number;
}

function requirePayer(): Payer {
  const payer = payerFromEnv();
  if (!payer) {
    throw new NoPayerError(
      `no way to pay for queries: set one of ${API_KEY_VARS.join(" or ")}`,
    );
  }
  return payer;
}

/** Accepts an address or an ENS name. */
export async function getContextBands(
  input: string,
  options: ServiceOptions = {},
): Promise<BandsResult> {
  const payer = options.payer ?? requirePayer();
  const registry = options.registry ?? loadRegistry();
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);

  let knownName: NameRecord | null = null;
  let address: string;

  if (looksLikeName(input)) {
    const resolved = await resolveName(input, { payer, registry });
    if (!resolved) {
      throw new AddressError(`${input} does not resolve to an address`);
    }
    address = resolved.address;
    knownName = resolved.record;
  } else {
    address = normaliseAddress(input);
  }

  const results = await Promise.all(
    registry.map((manifest) => readSource(payer, manifest, address, nowSeconds)),
  );

  return computeBands(address, results, nowSeconds, knownName);
}
