/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TERMS_AND_CONDITIONS: string;
  // Add other variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}