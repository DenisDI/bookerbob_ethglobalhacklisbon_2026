export type Category = "lending" | "dex" | "perps";

export type SchemaType =
  | "messari-lending"
  | "messari-perps"
  | "uniswap-v3"
  | "ens";

/** Reading strategy, declared per deployment because data quality differs. */
export type CountStrategy = "entities" | "counters";

/**
 * What a source is for. Activity sources feed the bands; a naming source
 * resolves names and cannot contribute activity, which is why the distinction
 * is declared rather than inferred.
 */
export type SourceRole = "activity" | "naming";

export interface SubgraphManifest {
  name: string;
  schemaType: SchemaType;
  subgraphId: string;
  network: string;
  role: SourceRole;
  /** Absent for naming sources. */
  category?: Category;
  countStrategy: CountStrategy;
  verifiedAt?: string;
  note?: string;
}

export type Band = "T0" | "T1" | "T2" | "T3" | "T4" | "unavailable";

/** The four axes. They are deliberately independent: no single total. */
export type BandName = "activity" | "tenure" | "breadth" | "scale";

/**
 * Public repayment history of the consented address. Not a scale and not a
 * verdict on a person: it states whether borrowed money came back, which is
 * exactly the question behind deferring settlement.
 */
export type RepaymentSignal = "no_credit_history" | "clean" | "liquidated";

export type FreshnessStatus = "live" | "stale" | "error";

export interface FreshnessEntry {
  subgraph: string;
  blockNumber: number | null;
  ageSeconds: number | null;
  status: FreshnessStatus;
  detail?: string;
}

/** What one activity source says about one address. */
export interface Reading {
  category: Category;
  /** Actions found. See `saturated`. */
  actions: number;
  /** The page limit was hit, so counts mean "at least this many". */
  saturated: boolean;
  present: boolean;
  /** Unix seconds of the oldest and newest action seen. */
  firstSeen: number | null;
  lastSeen: number | null;
  /** Summed amountUSD over the page that was read. */
  volumeUsd: number;
  /** Distinct markets or pools touched. */
  venues: number;
  /** Lending only: borrowed and returned, in USD. */
  borrowed: number;
  repaid: number;
  /** Lending only: times THIS address was liquidated. Not times it liquidated. */
  liquidations: number;
}

export interface NameRecord {
  name: string;
  /** Unix seconds the name was registered. Old names are expensive to fake. */
  createdAt: number | null;
}

export interface SourceResult {
  manifest: SubgraphManifest;
  reading: Reading | null;
  name: NameRecord | null;
  freshness: FreshnessEntry;
}

export interface BandsResult {
  address: string;
  ens: NameRecord | null;
  /**
   * Calendar year the address was first seen, or the year its name was
   * registered. A year is coarse enough to say out loud and specific enough to
   * mean something; the underlying timestamps stay inside.
   */
  since: number | null;
  bands: Record<BandName, Band>;
  signals: { repayment: RepaymentSignal };
  activeCategories: Category[];
  freshness: FreshnessEntry[];
  source: string;
}

export function emptyReading(category: Category): Reading {
  return {
    category,
    actions: 0,
    saturated: false,
    present: false,
    firstSeen: null,
    lastSeen: null,
    volumeUsd: 0,
    venues: 0,
    borrowed: 0,
    repaid: 0,
    liquidations: 0,
  };
}
