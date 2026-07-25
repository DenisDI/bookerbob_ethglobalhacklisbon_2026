// Drop-in Privy shell. Paste this folder into any Vite React app:
//   <PrivyRoot><App /></PrivyRoot>
// Needs VITE_LISBON2026_PRIVY_APP_ID. Without it children still render.

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { base, baseSepolia, mainnet, sepolia } from "viem/chains";

const APP_ID = import.meta.env.VITE_LISBON2026_PRIVY_APP_ID?.trim() ?? "";

export const privyConfigured = APP_ID.length > 0;

export function PrivyRoot({ children }: { children: ReactNode }) {
  if (!privyConfigured) return <>{children}</>;

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ["wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#3b5bff",
          walletChainType: "ethereum-only",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: base,
        supportedChains: [base, mainnet, baseSepolia, sepolia],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
