import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "./env.js";
import { offersHandler } from "./routes/offers.js";

// Route surface per specs/01-gateway.md:
//   GET  /offers?city=&address=   identity -> context -> terms -> inventory
//   POST /prebook                 rate lock + Hedera ScheduleCreate
//   POST /book                    settlement executes
//   GET  /spent                   per-payer x402 totals for the UI counters
// /offers currently covers the inventory leg only; the rest land in later steps.

const app = new Hono();

app.use("*", cors());

app.get("/offers", offersHandler);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "bookerbob-gateway",
    version: "0.1.0",
    uptimeSeconds: Math.round(process.uptime()),
    inventorySource: env.inventorySource,
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
