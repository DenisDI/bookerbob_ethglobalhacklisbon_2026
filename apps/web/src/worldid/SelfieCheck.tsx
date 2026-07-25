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

type Phase =
  /** The gateway has no Portal keys, so the step is honestly not offered. */
  | { name: "unconfigured" }
  | { name: "loading" }
  | { name: "ready"; config: WorldIdConfig }
  | { name: "checking"; config: WorldIdConfig }
  | { name: "verified"; credential: string }
  | { name: "failed"; config: WorldIdConfig | null; reason: string };

export function SelfieCheck({ onVerified }: { onVerified?: () => void }) {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");

  // A fresh request context every time the step is offered, because the one the
  // gateway signs lives five minutes.
  const loadConfig = useCallback(async () => {
    setPhase({ name: "loading" });
    try {
      const res = await fetch(`${GATEWAY}/world-id/context`);
      if (!res.ok) throw new Error(String(res.status));
      setPhase({ name: "ready", config: (await res.json()) as WorldIdConfig });
    } catch {
      // 503 means the gateway has no keys. Either way the honest answer is the
      // same: this check cannot finish here, so it is not offered as if it could.
      setPhase({ name: "unconfigured" });
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

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
      // the Portal refused must not look like one it accepted.
      throw new Error("the check did not verify");
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

  if (phase.name === "loading") {
    return <p className="selfie reason">preparing the personhood check</p>;
  }

  if (phase.name === "verified") {
    return (
      <p className="selfie selfie--done reason">
        personhood proved by {phase.credential.replace(/_/g, " ")}. this browser now
        asks as a person, not as a stranger
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

      {phase.name === "failed" ? (
        <p className="selfie__reason reason">{phase.reason}</p>
      ) : (
        <p className="selfie__reason reason">
          {config
            ? `world id ${config.credentials[0]!.replace(/_/g, " ")} (${config.environment})`
            : "world id"}
        </p>
      )}

      {config ? (
        <IDKitRequestWidget
          app_id={config.appId}
          action={config.action}
          rp_context={config.rpContext}
          environment={config.environment}
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
            setPhase({ name: "verified", credential: done || config.credentials[0]! });
            onVerified?.();
          }}
          onError={(code) =>
            setPhase({
              name: "failed",
              config,
              // The code is World's own, quoted rather than paraphrased, so a
              // FEEDBACK note can be written from what the user actually saw.
              reason: `the check did not finish: ${code}`,
            })
          }
        />
      ) : null}
    </div>
  );
}
