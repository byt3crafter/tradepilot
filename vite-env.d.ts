/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
