// Ties the pieces together: registry -> template per schema -> gateway ->
// freshness gate -> bands. Every source is queried in parallel and every
// failure is reported rather than swallowed, because a missing source changes
// what the answer means.

import { computeBands } from "./bands.js";
import { failedFreshness, readFreshness } from "./freshness.js";
import { type Payer, payerFromEnv, query } from "./graph.js";
import { loadRegistry } from "./registry.js";
import { TEMPLATES } from "./templates/index.js";
import type { BandsResult, SourceResult, SubgraphManifest } from "./types.js";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export class AddressError extends Error {}
export class NoPayerError extends Error {}

export function normaliseAddress(address: string): string {
  const trimmed = address.trim();
  if (!ADDRESS.test(trimmed)) {
    throw new AddressError(`not an EVM address: ${address}`);
  }
  // Messari account ids are lowercase; the Uniswap filters are Bytes and also
  // want lowercase. Normalising here means callers can pass any casing.
  return trimmed.toLowerCase();
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
      freshness: failedFreshness(
        manifest.name,
        `no template for schemaType ${manifest.schemaType}`,
      ),
    };
  }

  try {
    const data = await query<unknown>(
      payer,
      manifest.subgraphId,
      template.query,
      template.variables(address),
    );
    const freshness = readFreshness(manifest.name, data, nowSeconds);
    return {
      manifest,
      // A stale source is read but not counted; keeping the reading makes the
      // difference inspectable instead of invisible.
      reading: template.read(data, manifest.category),
      freshness,
    };
  } catch (err) {
    return {
      manifest,
      reading: null,
      freshness: failedFreshness(manifest.name, (err as Error).message),
    };
  }
}

/**
 * The whole band computation with the network removed: given one raw gateway
 * response per registry entry, produce the answer. Tests drive this directly,
 * which is why the suite needs neither a key nor a connection.
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
        freshness: failedFreshness(manifest.name, "no response recorded"),
      };
    }

    return {
      manifest,
      reading: template.read(data, manifest.category),
      freshness: readFreshness(manifest.name, data, nowSeconds),
    };
  });

  return computeBands(address, results);
}

export interface ServiceOptions {
  payer?: Payer;
  registry?: SubgraphManifest[];
  nowSeconds?: number;
}

export async function getContextBands(
  rawAddress: string,
  options: ServiceOptions = {},
): Promise<BandsResult> {
  const address = normaliseAddress(rawAddress);
  const payer = options.payer ?? payerFromEnv();
  if (!payer) {
    throw new NoPayerError(
      "no way to pay for queries: set GRAPH_API_KEY (or fund the keyless route)",
    );
  }

  const registry = options.registry ?? loadRegistry();
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);

  const results = await Promise.all(
    registry.map((manifest) => readSource(payer, manifest, address, nowSeconds)),
  );

  return computeBands(address, results);
}
