#!/usr/bin/env node
// Launcher so `npx context-bands-mcp` works in a fresh checkout: prefers the
// compiled server, falls back to running the TypeScript source through tsx.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const compiled = resolve(here, "../dist/server.js");

if (existsSync(compiled)) {
  await import(pathToFileURL(compiled).href);
} else {
  const require = createRequire(import.meta.url);
  const tsxCli = require.resolve("tsx/cli");
  const source = resolve(here, "../src/server.ts");
  const child = spawn(process.execPath, [tsxCli, source, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}
