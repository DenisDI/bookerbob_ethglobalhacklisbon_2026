// Temporary wire-debug strip. Design will replace this; keep it data-honest.

import { credentialLabel, type CredentialState } from "./credential";
import { shortAddress } from "./auth";
import type { PaneState } from "./RacePane";
import { paymentLine } from "./terms-copy";

type WalletSnap = {
  ready: boolean;
  authenticated: boolean;
  address: string | null;
};

interface Props {
  wallet: WalletSnap;
  credential: CredentialState;
  addressField: string;
  backed: PaneState;
}

type Step = {
  key: string;
  label: string;
  detail: string;
  state: "idle" | "active" | "done" | "warn" | "skip";
};

function stepsFor(props: Props): Step[] {
  const { wallet, credential, addressField, backed } = props;
  const data = backed.data;
  const working = backed.status === "working";
  const failed = backed.status === "failed";

  const walletStep: Step = !wallet.ready
    ? {
        key: "wallet",
        label: "wallet",
        detail: "Privy loading…",
        state: "active",
      }
    : wallet.authenticated && wallet.address
      ? {
          key: "wallet",
          label: "wallet",
          detail: shortAddress(wallet.address),
          state: "done",
        }
      : {
          key: "wallet",
          label: "wallet",
          detail: "not connected — type an address or connect",
          state: addressField.trim() ? "warn" : "idle",
        };

  const credStep: Step = {
    key: "credential",
    label: "credential",
    detail: credentialLabel(credential),
    state:
      credential.status === "missing"
        ? "idle"
        : credential.status === "stand_in"
          ? "warn"
          : "done",
  };

  const addr = addressField.trim() || wallet.address || "";
  let graph: Step = {
    key: "graph",
    label: "graph",
    detail: addr ? `will read ${shortAddress(addr)}` : "needs an address",
    state: addr ? "idle" : "skip",
  };
  if (working && addr) {
    graph = {
      key: "graph",
      label: "graph",
      detail: `looking up ${shortAddress(addr)}…`,
      state: "active",
    };
  } else if (data?.context) {
    const b = data.context.bands;
    graph = {
      key: "graph",
      label: "graph",
      detail: `activity ${b.activity} · tenure ${b.tenure} · breadth ${b.breadth} · scale ${b.scale}`,
      state: "done",
    };
  } else if (data && !data.context && addr) {
    graph = {
      key: "graph",
      label: "graph",
      detail: "no live bands (human terms on credential alone)",
      state: "warn",
    };
  } else if (failed) {
    graph = {
      key: "graph",
      label: "graph",
      detail: backed.error ?? "lookup failed",
      state: "warn",
    };
  }

  let terms: Step = {
    key: "terms",
    label: "terms",
    detail: "waiting for race",
    state: "idle",
  };
  if (working) {
    terms = {
      key: "terms",
      label: "terms",
      detail: "underwriting…",
      state: "active",
    };
  } else if (data) {
    terms = {
      key: "terms",
      label: "terms",
      detail: `${data.terms.tier} · ${paymentLine(data.terms.payment)} — ${data.reason}`,
      state: "done",
    };
  }

  let hedera: Step = {
    key: "hedera",
    label: "hedera",
    detail: "only if rate lock / pay at checkout",
    state: "idle",
  };
  if (working) {
    hedera = {
      key: "hedera",
      label: "hedera",
      detail: "…",
      state: "active",
    };
  } else if (data?.scheduleUrl) {
    hedera = {
      key: "hedera",
      label: "hedera",
      detail: data.scheduleId
        ? `scheduled ${data.scheduleId}`
        : "schedule created",
      state: "done",
    };
  } else if (data) {
    hedera = {
      key: "hedera",
      label: "hedera",
      detail: "no schedule for these terms",
      state: "skip",
    };
  }

  return [walletStep, credStep, graph, terms, hedera];
}

export function PipelineStatus(props: Props) {
  const steps = stepsFor(props);
  const scheduleUrl = props.backed.data?.scheduleUrl;

  return (
    <aside className="pipe" aria-label="pipeline status">
      <header className="pipe__head">
        <span className="pipe__title">pipeline</span>
        <span className="pipe__note">temp wire view · design will replace</span>
      </header>
      <ol className="pipe__steps">
        {steps.map((s) => (
          <li key={s.key} className={`pipe__step pipe__step--${s.state}`}>
            <span className="pipe__label">{s.label}</span>
            <span className="pipe__detail mono">{s.detail}</span>
          </li>
        ))}
      </ol>
      {scheduleUrl ? (
        <p className="pipe__link">
          <a href={scheduleUrl} target="_blank" rel="noreferrer">
            open HashScan schedule
          </a>
        </p>
      ) : null}
    </aside>
  );
}

/** Safe when Privy is not configured — no hook call. */
export function PipelineStatusGuest(props: Omit<Props, "wallet">) {
  return (
    <PipelineStatus
      {...props}
      wallet={{ ready: true, authenticated: false, address: null }}
    />
  );
}
