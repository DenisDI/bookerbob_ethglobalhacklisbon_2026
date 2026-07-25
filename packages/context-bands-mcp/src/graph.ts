// Gateway access, with paying for it kept behind one method.
//
// WHY THE INTERFACE LOOKS LIKE THIS. The first version exposed `endpoint()` and
// `headers()`, which reads like a seam but cannot express the route that matters:
// paying per query in USDC means sending a request, receiving HTTP 402 with a
// price quote, signing an authorisation, and sending it again. That is a
// conversation, not a header. So a Payer owns the whole round trip, and the
// keyless route can be added as a second implementation without touching
// anything above.
//
// What exists today is the Studio key. The keyless route is NOT implemented and
// is not claimed anywhere: it needs a funded Base mainnet wallet to run even
// once, and this project does not name integrations it has not seen work.

export interface GraphError extends Error {
  subgraphId: string;
}

export interface Payer {
  readonly kind: "studio-key" | "x402";
  /**
   * Run one GraphQL request and return `data`, doing whatever paying the route
   * requires along the way. Throws a GraphError on refusal.
   */
  fetchJson<T>(
    subgraphId: string,
    body: unknown,
    signal: AbortSignal,
  ): Promise<T>;
}

const GATEWAY = "https://gateway.thegraph.com";
const TIMEOUT_MS = 12_000;

function graphError(subgraphId: string, message: string): GraphError {
  const err = new Error(message) as GraphError;
  err.name = "GraphError";
  err.subgraphId = subgraphId;
  return err;
}

/** Unwraps the GraphQL envelope the same way for every payment route. */
async function unwrap<T>(
  subgraphId: string,
  res: Response,
): Promise<T> {
  if (!res.ok) {
    throw graphError(subgraphId, `gateway returned ${res.status}`);
  }

  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw graphError(subgraphId, JSON.stringify(json.errors).slice(0, 200));
  }
  if (!json.data) {
    throw graphError(subgraphId, "gateway returned no data");
  }
  return json.data;
}

export function studioKeyPayer(apiKey: string): Payer {
  return {
    kind: "studio-key",
    async fetchJson<T>(
      subgraphId: string,
      body: unknown,
      signal: AbortSignal,
    ): Promise<T> {
      const res = await fetch(`${GATEWAY}/api/${apiKey}/subgraphs/id/${subgraphId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      return unwrap<T>(subgraphId, res);
    },
  };
}

/**
 * Key lookup takes GRAPH_API_KEY, the name anyone reusing this package would
 * export, and prefers LISBON2026_GRAPH_API_KEY when set so it also obeys this
 * repo's secret-naming convention. A reusable package must not demand a
 * project-specific variable name.
 */
export const API_KEY_VARS = [
  "LISBON2026_GRAPH_API_KEY",
  "GRAPH_API_KEY",
] as const;

export function payerFromEnv(): Payer | null {
  for (const name of API_KEY_VARS) {
    const key = process.env[name]?.trim();
    if (key) return studioKeyPayer(key);
  }
  return null;
}

/**
 * One retry, but only for failures a retry can fix. A malformed query or a
 * missing subgraph fails identically the second time, so retrying it just pays
 * twice to learn the same thing.
 */
function worthRetrying(err: unknown): boolean {
  const message = (err as Error)?.message ?? "";
  if (/no data|malformed|not found|no allocations/i.test(message)) return false;
  return true;
}

async function once<T>(
  payer: Payer,
  subgraphId: string,
  gql: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await payer.fetchJson<T>(
      subgraphId,
      { query: gql, variables },
      controller.signal,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function query<T>(
  payer: Payer,
  subgraphId: string,
  gql: string,
  variables: Record<string, unknown>,
): Promise<T> {
  try {
    return await once<T>(payer, subgraphId, gql, variables);
  } catch (first) {
    if (!worthRetrying(first)) throw first;
    return once<T>(payer, subgraphId, gql, variables);
  }
}
