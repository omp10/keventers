/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: 'development' | 'staging' | 'production' | 'preview';
  readonly VITE_APP_VERSION?: string;
  readonly VITE_COMMIT_SHA?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_VERSION?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_SOCKET_PATH?: string;
  readonly VITE_SOCKET_ENABLED?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_ANALYTICS_ENABLED?: string;
  readonly VITE_ANALYTICS_WRITE_KEY?: string;
  readonly VITE_FF_PAYMENTS?: string;
  readonly VITE_FF_LOYALTY?: string;
  readonly VITE_FF_NOTIFICATIONS?: string;
  readonly VITE_FF_QR?: string;
  readonly VITE_FF_DISCOVERY?: string;
  readonly VITE_FF_MAPS?: string;
  readonly VITE_FF_ANALYTICS?: string;
  readonly VITE_FF_KITCHEN?: string;
  readonly VITE_FF_EXPERIMENTAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
