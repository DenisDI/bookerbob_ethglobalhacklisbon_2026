// The reusability move: a subgraph is added by dropping a JSON file into
// registry/, with no change to any code path. Files under registry/retired/ are
// kept deliberately, so a source that dropped out leaves a reason behind
// instead of vanishing from history.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SubgraphManifest } from "./types.js";

const REGISTRY_DIR = fileURLToPath(new URL("../registry", import.meta.url));

function invalidReason(value: unknown): string | null {
  const m = value as Partial<SubgraphManifest>;
  if (typeof m?.name !== "string") return "name must be a string";
  if (typeof m.schemaType !== "string") return "schemaType must be a string";
  if (typeof m.subgraphId !== "string") return "subgraphId must be a string";
  if (typeof m.network !== "string") return "network must be a string";
  if (m.role !== "activity" && m.role !== "naming") {
    return "role must be activity or naming";
  }
  if (m.countStrategy !== "entities" && m.countStrategy !== "counters") {
    return "countStrategy must be entities or counters";
  }
  // Only an activity source contributes to a band, so only it needs a category.
  if (m.role === "activity" && typeof m.category !== "string") {
    return "an activity source needs a category";
  }
  return null;
}

export function loadRegistry(dir = REGISTRY_DIR): SubgraphManifest[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const manifests: SubgraphManifest[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(dir, entry.name), "utf8"));
    const reason = invalidReason(raw);
    if (reason) {
      throw new Error(`registry/${entry.name}: ${reason}`);
    }
    manifests.push(raw as SubgraphManifest);
  }

  return manifests.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadRetired(dir = join(REGISTRY_DIR, "retired")): unknown[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => JSON.parse(readFileSync(join(dir, e.name), "utf8")));
}
