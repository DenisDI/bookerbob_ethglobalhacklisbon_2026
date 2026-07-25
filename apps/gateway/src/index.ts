import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "./env.js";
import { privyConfigured } from "./privy.js";
import { bookHandler } from "./routes/book.js";
import { offersHandler } from "./routes/offers.js";
import { paidOffersHandler } from "./routes/paidOffers.js";
import { prebookHandler } from "./routes/prebook.js";
import { spentHandler } from "./routes/spent.js";
import {
  worldIdContextHandler,
  worldIdVerifyHandler,
} from "./routes/world-id.js";
import { publicOrigin } from "./public-url.js";
import { credentialMiddleware, verifierFromEnv } from "./world.js";
import { worldChainStatus, worldRpcUrl } from "./world-chain.js";
import { worldIdReady } from "./world-id.js";
import {
  demoPayerAddress,
  meteringMiddleware,
  x402Configured,
  x402Meta,
} from "./x402.js";

// Route surface per specs/01-gateway.md:
//   GET  /offers?city=&address=   identity -> (x402 Hedera if bot) -> Graph -> terms
//                                 (+ Authorization: Bearer Privy access token)
//   POST /x402/paid-offers        race bot: demo Hedera pays HBAR, then offers
//   GET  /world-id/context        signed request context for the Selfie widget
//   POST /world-id/verify         finished proof -> Portal -> session token
//   POST /prebook                 Hedera ScheduleCreate for an existing hold
//   POST /book                    schedule executes (checkout settlement)
//   GET  /spent                   per-payer x402 totals for the UI counters

const app = new Hono();

app.use("*", cors());

// Ahead of the routes on purpose. specs/01-gateway.md puts credential resolution
// in front of the x402 paywall so a credentialed request skips metering; keeping
// it here means the paywall, /offers and the settlement routes all read one
// answer. A request without the header costs nothing: nothing is parsed.
// One verifier for the process, so /health reports the same one the middleware
// uses rather than a second instance that could disagree with it.
const verifier = verifierFromEnv();
app.use("*", credentialMiddleware(verifier));
app.use("*", meteringMiddleware());

app.get("/offers", offersHandler);
app.post("/x402/paid-offers", paidOffersHandler);
app.get("/spent", spentHandler);
app.get("/world-id/context", worldIdContextHandler);
app.post("/world-id/verify", worldIdVerifyHandler);
app.post("/prebook", prebookHandler);
app.post("/book", bookHandler);

// The last two fields are here because both of this file's credential bugs were
// invisible from outside: a stand-in verifier looks exactly like a rejected
// signature, and a mismatched resource looks exactly like an unregistered wallet.
// Neither field is a secret. `resource` is the URL the caller just used, and
// `credentialVerifier` is which of two publicly documented modes is running.
app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "bookerbob-gateway",
    version: "0.1.0",
    uptimeSeconds: Math.round(process.uptime()),
    inventorySource: env.inventorySource,
    credentialVerifier: verifier.kind,
    privyWalletVerify: privyConfigured(),
    resource: `${publicOrigin(c)}/offers`,
    // Cached and refreshed off the request path, so this never delays the check
    // Fly polls. null means the first probe has not answered yet.
    // Same lesson as credentialVerifier: an integration that is quietly not
    // configured must be visible from outside, not only in a log nobody reads.
    worldId: worldIdReady() ? env.worldEnvironment : "unconfigured",
    worldChain: worldChainStatus(),
    worldRpc: worldRpcUrl(),
    x402: {
      configured: x402Configured(),
      network: x402Meta.network,
      price: x402Meta.price,
      demoPayer: demoPayerAddress(),
    },
  }),
);

// Static hosting comes last: the catch-all must not shadow an API route.
const staticDir = process.env.STATIC_DIR ?? join(process.cwd(), "../web/dist");
if (existsSync(staticDir)) {
  app.use(
    "*",
    serveStatic({
      root: staticDir,
      rewriteRequestPath: (path) => (path === "/" ? "/index.html" : path),
    }),
  );
  app.get("*", serveStatic({ path: "index.html", root: staticDir }));
} else {
  console.warn(`STATIC_DIR missing (${staticDir}); API-only mode`);
}

const port = env.gatewayPort;
const hostname = process.env.GATEWAY_HOST ?? "0.0.0.0";

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`gateway listening on http://${hostname}:${info.port}`);
});

export { app };
