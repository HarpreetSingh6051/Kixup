/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_GEMINI_MODEL?: string
  readonly VITE_R2_PUBLIC_BASE_URL?: string
  readonly VITE_APP_URL?: string
  readonly VITE_DEFAULT_CURRENCY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
