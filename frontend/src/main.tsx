import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/globals.css';
import { applyBrand, defaultBrand } from '@/theme';
import { AppProviders } from '@/providers/AppProviders';
import { createAppAnalytics } from '@/analytics';
import { registerServiceWorker } from '@/pwa';
import { App } from '@/App';

// Inject the brand's theme variables SYNCHRONOUSLY before first render so the
// UI paints with correct, on-brand colors immediately (no FOUC). The
// ThemeProvider keeps them in sync for runtime rebrand / scheme switches.
applyBrand(defaultBrand);

// Built once, outside render: a provider rebuilt on every render would re-run the
// Clarity loader and churn the context for every consumer.
const analytics = createAppAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders analytics={analytics}>
      <App />
    </AppProviders>
  </StrictMode>,
);

// Register the PWA service worker (production only).
registerServiceWorker();
