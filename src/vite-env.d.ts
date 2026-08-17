/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INITIAL_ADMIN_TOKEN?: string;
  readonly VITE_INITIAL_ADMIN_PIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
