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
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Call only under <PrivyRoot> when privyConfigured. */
export function useConsentedWallet(): ConsentedWallet {
  const { ready, authenticated, login, logout, getAccessToken, user } =
    usePrivy();
  const { wallets } = useWallets();

  // Prefer live connected wallet; fall back to the linked wallet on the user.
  const address = wallets[0]?.address ?? user?.wallet?.address ?? null;

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
