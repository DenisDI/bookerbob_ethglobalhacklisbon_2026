// Gateway client.
//
// Today this pays with a Studio key. The keyless route is the stronger story
// (pay per query in USDC on Base mainnet, no account anywhere), so the payment
// choice is an explicit seam rather than an if-statement buried in a fetch:
// when GRAPH_X402_KEY is funded, a second Payer implementation drops in here
// and nothing else changes.

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

export function payerFromEnv(): Payer | null {
  const key = process.env.GRAPH_API_KEY?.trim();
  return key ? studioKeyPayer(key) : null;
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
