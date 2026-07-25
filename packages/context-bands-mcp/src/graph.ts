// Gateway client.
//
// Today this pays with a Studio key. The keyless route is the stronger story
// (pay per query in USDC on Base mainnet, no account anywhere), so the payment
// choice is an explicit seam rather than an if-statement buried in a fetch:
// when the Base wallet is funded, a second Payer implementation drops in here
// and nothing else changes.
//
// Key lookup takes GRAPH_API_KEY, the name anyone reusing this package would
// export, and prefers LISBON2026_GRAPH_API_KEY when set so it also obeys this
// repo's secret-naming convention. A reusable package must not demand a
// project-specific variable name.

export interface GraphError extends Error {
  subgraphId: string;
}

export interface Payer {
  readonly kind: "studio-key" | "x402";
  endpoint(subgraphId: string): string;
  headers(): Record<string, string>;
}

const GATEWAY = "https://gateway.thegraph.com";

export function studioKeyPayer(apiKey: string): Payer {
  return {
    kind: "studio-key",
    endpoint: (id) => `${GATEWAY}/api/${apiKey}/subgraphs/id/${id}`,
    headers: () => ({ "Content-Type": "application/json" }),
  };
}

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

const TIMEOUT_MS = 12_000;

function graphError(subgraphId: string, message: string): GraphError {
  const err = new Error(message) as GraphError;
  err.name = "GraphError";
  err.subgraphId = subgraphId;
  return err;
}

async function once<T>(
  payer: Payer,
  subgraphId: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(payer.endpoint(subgraphId), {
      method: "POST",
      headers: payer.headers(),
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

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
  } finally {
    clearTimeout(timer);
  }
}

/** One retry: gateway hiccups are common and cheap to absorb. */
export async function query<T>(
  payer: Payer,
  subgraphId: string,
  gql: string,
  variables: Record<string, unknown>,
): Promise<T> {
  try {
    return await once<T>(payer, subgraphId, gql, variables);
  } catch {
    return once<T>(payer, subgraphId, gql, variables);
  }
}
