# Deploy handoff (Fly)

The app is one Fly process serving both the gateway and the built web (Dockerfile
builds web into the gateway). There is NO .env in the container, so every credential
must be a Fly secret. If a secret is missing, the gateway silently falls back (context
returns human terms for everyone, inventory falls to fixtures), so set them all before
trusting a deploy.

## App

| | |
|---|---|
| Fly app | `fairterms-lisbon` |
| Region | `ams` |
| Internal port | `3000` |
| URL | https://lisbonhack.world |

## Runtime secrets (Fly secrets, NOT GitHub)

Rule: secrets live in Fly, never in GitHub Actions secrets or repo variables. Deploy
manually with flyctl so no Fly token has to sit in GitHub.

The person who holds `.env` sets them in one shot (values never leave their machine):

```
fly secrets import -a fairterms-lisbon < .env
```

That loads the runtime keys the server reads:

| Secret | For |
|---|---|
| `LISBON2026_AGENT_PRIVATE_KEY` | World AgentKit. The registered agent wallet `0x1597866E3F9870241EebC1153136fDbf71C3CBF3` (see docs/AGENT-REGISTRATION.md). The gateway signs with it and verifies against AgentBook on World Chain. No RPC var needed, the verifier uses the default World Chain RPC. |
| `LISBON2026_GRAPH_API_KEY` (or `GRAPH_API_KEY`) | The Graph. The MCP subprocess gets it through an explicit env allowlist (apps/gateway/src/context.ts childEnv), so it works in the container. |
| `LISBON2026_BOOKER_MCP_URL`, `LISBON2026_BOOKER_TOKEN`, `LISBON2026_BOOKER_BOOKING_ENABLED` | Inventory (booker / RateHawk). |
| `LISBON2026_HEDERA_ACCOUNT_ID`, `LISBON2026_HEDERA_PRIVATE_KEY`, `LISBON2026_HEDERA_PAYEE_ACCOUNT_ID` | Hedera scheduled settlement. |
| `LISBON2026_INVENTORY_SOURCE` | `live` or `cached`. |
| `LISBON2026_PUBLIC_URL` | Base URL for links (set to https://lisbonhack.world). |
| `LISBON2026_GRAPH_USDC_KEY` | Optional, only for the keyless x402-to-Graph path. |

`fly secrets import` will also pick up the `VITE_` lines from .env, which is harmless
but they do nothing at runtime (see build args below).

Selfie Check secrets (`LISBON2026_WORLD_APP_ID` / `RP_ID` / `SIGNING_KEY`) are only
needed once the Selfie flow lands. Not required for the AgentKit deploy.

## Build arg (public, frontend)

The Privy App ID is inlined into the frontend at BUILD time (not a runtime secret) and
is public by design. Pass it to the build:

```
fly deploy -a fairterms-lisbon --build-arg VITE_LISBON2026_PRIVY_APP_ID=<privy-app-id>
```

If Privy is not configured, the app still runs (wallet connect shows a disabled
state); the typed-address path works regardless.

## Deploy

From a machine with flyctl authed to the app (Fly token, not in GitHub):

```
fly secrets import -a fairterms-lisbon < .env        # once, or when a key changes
fly deploy -a fairterms-lisbon --build-arg VITE_LISBON2026_PRIVY_APP_ID=<privy-app-id>
```

The GitHub Actions workflow (.github/workflows/deploy.yml) needs a Fly token in GitHub
secrets, which we are avoiding. Prefer manual deploy, or set the workflow trigger to
workflow_dispatch only.

## Post-deploy smoke check

```
curl https://lisbonhack.world/health
# expect ok:true, and inventorySource matching LISBON2026_INVENTORY_SOURCE

curl "https://lisbonhack.world/offers?address=vitalik.eth"
# expect real context bands (not empty) and terms; if bands are empty for a known
# rich address, the Graph key did not reach the MCP subprocess in the container.
```

Then confirm the AgentKit path: a request with a valid agentkit header resolves to the
human tier; without it, bot. Registration is verifiable any time:

```
npx @worldcoin/agentkit-cli status 0x1597866E3F9870241EebC1153136fDbf71C3CBF3
# registered: true
```
