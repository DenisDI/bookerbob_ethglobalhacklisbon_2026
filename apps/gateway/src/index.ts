import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

// Skeleton only. Route surface per specs/01-gateway.md:
//   GET  /offers?city=&address=   identity -> context -> terms -> inventory
//   POST /prebook                 rate lock + Hedera ScheduleCreate
//   POST /book                    settlement executes
//   GET  /spent                   per-payer x402 totals for the UI counters
// Those land in later steps; /health is the plumbing check.

const app = new Hono();

app.use("*", cors());

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "fairterms-gateway",
    version: "0.1.0",
    uptimeSeconds: Math.round(process.uptime()),
  }),
);

const port = Number(process.env.GATEWAY_PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`gateway listening on http://localhost:${info.port}`);
});

export { app };
