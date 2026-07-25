// The reusability move: a subgraph is added by dropping a JSON file into
// registry/, with no change to any code path. Files under registry/retired/ are
// kept deliberately, so a source that dropped out leaves a reason behind
// instead of vanishing from history.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SubgraphManifest } from "./types.js";

const REGISTRY_DIR = fileURLToPath(new URL("../registry", import.meta.url));

function isManifest(value: unknown): value is SubgraphManifest {
  const m = value as Partial<SubgraphManifest>;
  return (
    typeof m?.name === "string" &&
    typeof m.schemaType === "string" &&
    typeof m.subgraphId === "string" &&
    typeof m.network === "string" &&
    typeof m.category === "string" &&
    (m.countStrategy === "entities" || m.countStrategy === "counters")
  );
}

export function loadRegistry(dir = REGISTRY_DIR): SubgraphManifest[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const manifests: SubgraphManifest[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(dir, entry.name), "utf8"));
    if (!isManifest(raw)) {
      throw new Error(`registry/${entry.name} is not a valid manifest`);
    }
    manifests.push(raw);
  }

  return manifests.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadRetired(dir = join(REGISTRY_DIR, "retired")): unknown[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => JSON.parse(readFileSync(join(dir, e.name), "utf8")));
}
