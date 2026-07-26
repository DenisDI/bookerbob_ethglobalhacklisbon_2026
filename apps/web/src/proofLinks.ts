/**
 * Pages a viewer can open to check the claims on screen.
 *
 * Every URL here was opened in a browser on 2026-07-26 and rendered the thing it
 * claims to render. That check is the point: a proof link that 404s is worse than
 * no link, because it invites somebody to test the claim and then fails the test
 * in front of them.
 *
 * Two notes on the choices.
 *
 * World Chain: worldscan.org sits behind a bot check that answers "Performing
 * security verification" to a fresh browser, so the Blockscout instance is used
 * instead. It opened straight to the transaction, showing the `register` call.
 *
 * The Graph: these are the deployments the MCP actually queries, taken from
 * packages/context-bands-mcp/registry. Nothing decorative is linked.
 */

/** The agent wallet the gateway signs with, registered in the AgentBook. */
export const AGENT_ADDRESS = "0x1597866E3F9870241EebC1153136fDbf71C3CBF3";

const WORLD_CHAIN_EXPLORER = "https://worldchain-mainnet.explorer.alchemy.com";

/** The transaction that put this agent in the AgentBook, on World Chain. */
export const AGENT_REGISTRATION_URL = `${WORLD_CHAIN_EXPLORER}/tx/0xfc2fe4d9ddbd26db6005e5328358afb57cc4d8f922c240bcd6b281159f02eeb1`;

export const AGENT_ADDRESS_URL = `${WORLD_CHAIN_EXPLORER}/address/${AGENT_ADDRESS}`;

const EXPLORER = "https://thegraph.com/explorer/subgraphs";

/**
 * Subgraphs behind the bands, by the category the reader sees.
 *
 * `dex` and `lending` and `perps` are the words the gateway returns in
 * activeCategories, so a signal on screen can link to the source it came from
 * without a second mapping to get out of date.
 */
export const SUBGRAPHS: Record<
  string,
  { label: string; schema: string; url: string }
> = {
  dex: {
    label: "Uniswap v3",
    // Deliberately not Messari: there is no Account entity, so the registry
    // carries its own schemaType and reads activity through Swap.origin.
    schema: "canonical",
    url: `${EXPLORER}/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`,
  },
  lending: {
    label: "Aave v3",
    schema: "Messari lending",
    url: `${EXPLORER}/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`,
  },
  perps: {
    label: "GMX",
    schema: "Messari perps",
    url: `${EXPLORER}/DiR5cWwB3pwXXQWWdus7fDLR2mnFRQLiBFsVmHAH9VAs`,
  },
};

/** The subgraph to lead with, given what the address was actually active in. */
export function leadSubgraph(categories: string[]): {
  label: string;
  schema: string;
  url: string;
} {
  for (const category of categories) {
    const hit = SUBGRAPHS[category];
    if (hit) return hit;
  }
  return SUBGRAPHS.lending!;
}
