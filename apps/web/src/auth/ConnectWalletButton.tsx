import { privyConfigured } from "./PrivyRoot";
import { shortAddress, useConsentedWallet } from "./useConsentedWallet";
import "./connect-wallet.css";

/**
 * Fixed top-right connect control. Drop onto any page under <PrivyRoot>.
 * Design-agnostic: owns its own CSS; restyle via .cw-btn* if needed.
 */
export function ConnectWalletButton() {
  if (!privyConfigured) {
    return (
      <button type="button" className="cw-btn cw-btn--missing" disabled title="Set VITE_LISBON2026_PRIVY_APP_ID">
        wallet off
      </button>
    );
  }
  return <ConnectWalletButtonLive />;
}

function ConnectWalletButtonLive() {
  const { ready, authenticated, address, login, logout } = useConsentedWallet();

  if (!ready) {
    return (
      <button type="button" className="cw-btn" disabled>
        …
      </button>
    );
  }

  if (!authenticated || !address) {
    return (
      <button type="button" className="cw-btn" onClick={login}>
        connect wallet
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
