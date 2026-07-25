// Portable Privy wallet auth for BookerBob / any Vite React shell.
//
// Usage:
//   import { PrivyRoot, ConnectWalletButton, useConsentedWallet } from "./auth";
//   <PrivyRoot>
//     <ConnectWalletButton />
//     <App />
//   </PrivyRoot>
//
// Env: VITE_LISBON2026_PRIVY_APP_ID
// Privy Dashboard origins: http://localhost:5173 , https://lisbonhack.world

export { PrivyRoot, privyConfigured } from "./PrivyRoot";
export { ConnectWalletButton } from "./ConnectWalletButton";
export {
  useConsentedWallet,
  shortAddress,
  type ConsentedWallet,
} from "./useConsentedWallet";
