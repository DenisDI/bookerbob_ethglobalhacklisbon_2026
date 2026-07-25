/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LISBON2026_PRIVY_APP_ID?: string;
  readonly VITE_LISBON2026_GATEWAY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
