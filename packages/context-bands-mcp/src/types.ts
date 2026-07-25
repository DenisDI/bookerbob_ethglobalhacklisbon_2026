export type Category = "lending" | "dex" | "perps";

export type SchemaType = "messari-lending" | "messari-perps" | "uniswap-v3";

/** Reading strategy, declared per deployment because data quality differs. */
export type CountStrategy = "entities" | "counters";

export interface SubgraphManifest {
  name: string;
  schemaType: SchemaType;
  subgraphId: string;
  network: string;
  category: Category;
  countStrategy: CountStrategy;
  verifiedAt?: string;
  note?: string;
}

export type Band = "T0" | "T1" | "T2" | "T3" | "T4" | "unavailable";

export type FreshnessStatus = "live" | "stale" | "error";

export interface FreshnessEntry {
  subgraph: string;
  blockNumber: number | null;
  ageSeconds: number | null;
  status: FreshnessStatus;
  detail?: string;
}

/** What one source says about one address. */
export interface CategoryReading {
  category: Category;
  /** Number of on-chain actions found. See `saturated`. */
  actions: number;
  /**
   * The query hit its page limit, so `actions` means "at least this many".
   * Bands must not claim precision past this point.
   */
  saturated: boolean;
  /** The address appears in this source at all. */
  present: boolean;
}

export interface SourceResult {
  manifest: SubgraphManifest;
  reading: CategoryReading | null;
  freshness: FreshnessEntry;
}

export interface BandsResult {
  address: string;
  bands: Record<string, Band>;
  activeCategories: Category[];
  freshness: FreshnessEntry[];
  source: string;
}
