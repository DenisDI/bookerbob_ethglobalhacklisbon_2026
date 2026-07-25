// The browser half of personhood: a person proves they are one.
//
// Everything that decides anything happens on the gateway. This component asks
// for a signed request context, opens the World widget with it, hands the
// finished proof back, and keeps the session token it gets in return. It cannot
// make itself verified, and there is no branch in here that tries: the button
// reflects what the server said, nothing more.
//
// Phase A per specs/00-final-plan.md D.2: environment "staging" drives the
// browser simulator at https://simulator.worldcoin.org, so a judge needs no phone.

import { IDKitRequestWidget } from "@worldcoin/idkit";
import { useCallback, useEffect, useState } from "react";
import { setWorldIdToken, worldIdExpiresAt } from "./session";
import "./selfie.css";

const GATEWAY =
  (import.meta.env.VITE_LISBON2026_GATEWAY_URL as string | undefined)?.trim() ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

type RpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

type WorldIdConfig = {
  appId: `app_${string}`;
  rpId: string;
  action: string;
  /**
   * What the gateway will accept, in the order it prefers. Selfie comes first
   * because it is the check anybody with a World App can pass; asking only for
   * proof_of_human is what made a real World App answer "Humans Only, visit an
   * Orb", which is a barrier almost nobody clears.
   */
  credentials: ("selfie" | "proof_of_human" | "passport" | "mnc")[];
  environment: "production" | "staging" | "sandbox";
  rpContext: RpContext;
};

/**
 * Said in words, because a code on a screen is not an explanation.
 *
 * The first entry is the one that cost an evening. A real World App answers
 * `credential_unavailable` when the person holds neither credential we accept,
 * and the widget renders that as "Something went wrong", which sends an
 * integrator hunting through environments and protocol versions. It is not a
 * fault at all: it means this World ID has nothing to show yet.
 */
const FAILURE_COPY: Record<string, string> = {
  credential_unavailable:
    "world app has no face credential yet, it is still coming soon there. an orb verified world id works, otherwise use the simulator",
  credential_missing: "the proof carried no credential this desk accepts",
  portal_refused: "world could not verify that proof",
  stale: "the request went stale, press the button again",
  unreachable: "world did not answer, try again",
};

/**
 * A rehearsal switch: `?personhood=stand-in` marks the step done without asking
 * World anything.
 *
 * It exists because the check itself is out of our hands. Face credential is
 * still "Coming soon" in World App, the World team confirmed the orb-less web
 * path is broken on their side, and the simulator is a popup that can be slow at
 * the worst moment. A demo that cannot move past step one is worse than a demo
 * that says which step was stood in for.
 *
 * What it may never do is claim a check that did not run. It calls the same
 * onVerified the real path calls, which makes the browser ASK with a stand-in,
 * and the gateway answers `stand_in` exactly as it does for any browser
 * assertion. Nothing downstream can turn that into "verified by World".
 */
function standInRequested(search = window.location.search): boolean {
  const asked = new URLSearchParams(search).get("personhood")?.trim().toLowerCase();
  return asked === "stand-in" || asked === "stand_in" || asked === "1";
}

type Phase =
  /** The gateway has no Portal keys, so the step is honestly not offered. */
  | { name: "unconfigured" }
  /** Marked done for a rehearsal. Says so, and cannot say anything stronger. */
  | { name: "stand_in" }
  | { name: "loading" }
  | { name: "ready"; config: WorldIdConfig }
  | { name: "checking"; config: WorldIdConfig }
  | { name: "verified"; credential: string; simulated: boolean }
  | { name: "failed"; config: WorldIdConfig | null; reason: string };

export function SelfieCheck({ onVerified }: { onVerified?: () => void }) {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");
  const [failure, setFailure] = useState("");

  // A fresh request context every time the step is offered, because the one the
  // gateway signs lives five minutes.
  const loadConfig = useCallback(async (environment?: string) => {
    setPhase({ name: "loading" });
    try {
      const query = environment ? `?env=${environment}` : "";
      const res = await fetch(`${GATEWAY}/world-id/context${query}`);
      if (!res.ok) throw new Error(String(res.status));
      setPhase({ name: "ready", config: (await res.json()) as WorldIdConfig });
    } catch {
      // 503 means the gateway has no keys. Either way the honest answer is the
      // same: this check cannot finish here, so it is not offered as if it could.
      setPhase({ name: "unconfigured" });
    }
  }, []);

  useEffect(() => {
    if (standInRequested()) {
      setPhase({ name: "stand_in" });
      onVerified?.();
      return;
    }
    void loadConfig();
  }, [loadConfig, onVerified]);

  // The gateway stops believing the session on its own schedule. When that moment
  // comes the screen has to stop claiming it too, or it goes on describing
  // something that has already stopped being true. Offering the check again is
  // the honest thing to show next.
  useEffect(() => {
    if (phase.name !== "verified") return;
    const left = worldIdExpiresAt() - Date.now();
    if (left <= 0) {
      void loadConfig();
      return;
    }
    const timer = setTimeout(() => void loadConfig(), left);
    return () => clearTimeout(timer);
  }, [phase.name, loadConfig]);

  const handleVerify = useCallback(async (result: unknown) => {
    // The proof is with us and the Portal has not answered yet. Without this the
    // state existed in the type and was never reached, so the button never said
    // what it was doing.
    setPhase((prev) => (prev.name === "ready" ? { name: "checking", config: prev.config } : prev));

    const res = await fetch(`${GATEWAY}/world-id/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Forwarded exactly as the widget produced it. The gateway forwards it on
      // to the Portal the same way, and neither of us edits a proof.
      body: JSON.stringify(result),
    });

    if (!res.ok) {
      // Thrown on purpose: the widget shows its own failure state, and a proof
      // the Portal refused must not look like one it accepted. The category
      // travels with it so the screen can say which of four things happened
      // instead of leaving a person at a demo with "something went wrong".
      const { reason } = (await res.json().catch(() => ({}))) as { reason?: string };
      setFailure(reason ?? "unreachable");
      throw new Error(reason ?? "the check did not verify");
    }

    const { token, credential, expiresInSeconds } = (await res.json()) as {
      token: string;
      credential: string;
      expiresInSeconds: number;
    };
    setWorldIdToken(token, expiresInSeconds);
    // Which check actually ran, so the screen names it instead of implying one.
    setDone(credential);
  }, []);

  if (phase.name === "unconfigured") {
    return (
      <p className="selfie selfie--off reason">
        proof of personhood is not connected on this gateway
      </p>
    );
  }

  if (phase.name === "stand_in") {
    return (
      <p className="selfie selfie--done reason">
        standing in for the personhood check. the desk is asked with a stand-in,
        which is not a world check and never reads as one
      </p>
    );
  }

  if (phase.name === "loading") {
    return <p className="selfie reason">preparing the personhood check</p>;
  }

  if (phase.name === "verified") {
    return (
      <p className="selfie selfie--done reason">
        personhood proved by {phase.credential.replace(/_/g, " ")}
        {phase.simulated ? " in the world simulator" : ""}. this browser now asks
        as a person, not as a stranger
      </p>
    );
  }

  const config = phase.config;

  return (
    <div className="selfie">
      <button
        type="button"
        className="selfie__button"
        disabled={!config || phase.name === "checking"}
        onClick={() => setOpen(true)}
      >
        {phase.name === "checking" ? "checking" : "prove you are a person"}
      </button>

      {/* Both paths are offered and both are named. The simulator is the one a
        * person can actually walk today, because Face credential is still
        * "Coming soon" in the production World App, so calling it anything other
        * than a simulator would be a lie. The phone path stays for anybody whose
        * World ID is orb verified. */}
      {config ? (
        <button
          type="button"
          className="selfie__alt"
          onClick={() => void loadConfig(config.environment === "staging" ? "production" : "staging")}
        >
          {config.environment === "staging"
            ? "orb verified world app? verify on your phone"
            : "no orb? verify via the simulator"}
        </button>
      ) : null}

      {phase.name === "failed" ? (
        <p className="selfie__reason reason">{phase.reason}</p>
      ) : (
        <p className="selfie__reason reason">
          {!config
            ? "world id"
            : config.environment === "staging"
              ? "world id, via the world simulator"
              : `world id, ${config.credentials.map((c) => c.replace(/_/g, " ")).join(" or ")}`}
        </p>
      )}

      {config ? (
        <IDKitRequestWidget
          app_id={config.appId}
          action={config.action}
          rp_context={config.rpContext}
          environment={config.environment}
          // Measured, not guessed: turning this on sent IDKit to
          // bridge.worldcoin.org, the protocol 3.0 bridge, where Selfie Check
          // does not exist as a credential at all. The phone then answered
          // credential_unavailable for a person who had enrolled selfie three
          // times. Legacy proofs and Selfie Check are mutually exclusive.
          allow_legacy_proofs={false}
          constraints={
            config.credentials.length > 1
              ? { any: config.credentials.map((type) => ({ type })) }
              : { type: config.credentials[0]! }
          }
          open={open}
          onOpenChange={setOpen}
          handleVerify={handleVerify}
          onSuccess={() => {
            setPhase({
              name: "verified",
              credential: done || config.credentials[0]!,
              simulated: config.environment !== "production",
            });
            onVerified?.();
          }}
          onError={(code) =>
            setPhase({
              name: "failed",
              config,
              // The code is World's own, quoted rather than paraphrased, so a
              // FEEDBACK note can be written from what the user actually saw.
              // Our own category first when we have one, then the widget's code,
              // then the code itself rather than a shrug.
              reason:
                FAILURE_COPY[failure] ??
                FAILURE_COPY[code] ??
                `the check did not finish: ${code}`,
            })
          }
        />
      ) : null}
    </div>
  );
}
