/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Can add more environment variables
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 