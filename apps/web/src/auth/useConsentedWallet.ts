import { usePrivy, useWallets } from "@privy-io/react-auth";

export type ConsentedWallet = {
  ready: boolean;
  authenticated: boolean;
  address: string | null;
  getAccessToken: () => Promise<string | null>;
  login: () => void;
  logout: () => Promise<void>;
};

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Call only under <PrivyRoot> when privyConfigured. */
export function useConsentedWallet(): ConsentedWallet {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address ?? null;

  return {
    ready,
    authenticated,
    address,
    getAccessToken: async () => {
      try {
        return (await getAccessToken()) ?? null;
      } catch {
        return null;
      }
    },
    login,
    logout,
  };
}
