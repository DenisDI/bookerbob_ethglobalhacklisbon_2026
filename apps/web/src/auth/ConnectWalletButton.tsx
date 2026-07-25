import { useEffect, useState } from "react";
import { privyConfigured } from "./PrivyRoot";
import { shortAddress, useConsentedWallet } from "./useConsentedWallet";
import "./connect-wallet.css";

/**
 * Fixed top-right connect control. Drop onto any page under <PrivyRoot>.
 * Design-agnostic: owns its own CSS; restyle via .cw-btn* if needed.
 */
export function ConnectWalletButton({
  onAddress,
}: {
  /** Fired when a live wallet is available — fills the race address field. */
  onAddress?: (address: string) => void;
} = {}) {
  if (!privyConfigured) {
    return (
      <button
        type="button"
        className="cw-btn cw-btn--missing"
        disabled
        title="Set VITE_LISBON2026_PRIVY_APP_ID"
      >
        wallet off
      </button>
    );
  }
  return <ConnectWalletButtonLive onAddress={onAddress} />;
}

function ConnectWalletButtonLive({
  onAddress,
}: {
  onAddress?: (address: string) => void;
}) {
  const { ready, authenticated, address, login, logout } = useConsentedWallet();
  // Don't leave the control disabled forever if Privy init hangs.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setWaited(true), 2500);
    return () => window.clearTimeout(t);
  }, [ready]);

  // Belt-and-suspenders with PrivySessionBridge: button path also pushes the
  // connected address into the consent field as soon as SIWE finishes.
  useEffect(() => {
    if (!ready || !authenticated || !address) return;
    onAddress?.(address);
  }, [ready, authenticated, address, onAddress]);

  if (!authenticated || !address) {
    const loading = !ready && !waited;
    return (
      <button
        type="button"
        className="cw-btn"
        disabled={loading}
        onClick={() => login()}
        title={loading ? "Privy starting…" : undefined}
      >
        {loading ? "…" : "connect wallet"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="cw-btn cw-btn--ghost"
      title={address}
      onClick={() => void logout()}
    >
      <span className="cw-btn__addr">{shortAddress(address)}</span>
      <span>disconnect</span>
    </button>
  );
}
