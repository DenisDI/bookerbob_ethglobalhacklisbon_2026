import {
  useActiveWallet,
  usePrivy,
  useWallets,
  type User,
  type ConnectedWallet,
} from "@privy-io/react-auth";

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

function fromLinkedAccounts(user: User | null): string | null {
  for (const account of user?.linkedAccounts ?? []) {
    if (
      account.type === "wallet" &&
      "address" in account &&
      typeof account.address === "string" &&
      account.address.startsWith("0x")
    ) {
      return account.address;
    }
  }
  return null;
}

/** Prefer the active external wallet, then any connected, then linked. */
export function resolveWalletAddress(
  active: ConnectedWallet | { address?: string } | undefined,
  wallets: { address: string }[],
  user: User | null,
): string | null {
  if (active && "address" in active && typeof active.address === "string") {
    return active.address;
  }
  if (wallets[0]?.address) return wallets[0].address;
  if (user?.wallet?.address) return user.wallet.address;
  return fromLinkedAccounts(user);
}

/** Call only under <PrivyRoot> when privyConfigured. */
export function useConsentedWallet(): ConsentedWallet {
  const { ready, authenticated, login, logout, getAccessToken, user } =
    usePrivy();
  const { wallets } = useWallets();
  const { wallet: activeWallet } = useActiveWallet();

  const address = resolveWalletAddress(activeWallet, wallets, user);

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
