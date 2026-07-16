import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Vite + React 19 + Tailwind CSS v4 (via the first-party plugin — no PostCSS).
// `@/*` resolves to `src/*` so every import is absolute and refactor-safe.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing vendors so app code stays cache-hot.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom)\//.test(id)) return 'react';
          if (id.includes('node_modules/framer-motion/')) return 'motion';
          if (id.includes('node_modules/@tanstack/react-query/')) return 'query';
          if (id.includes('node_modules/lucide-react/')) return 'icons';
          if (id.includes('node_modules/@radix-ui/') || id.includes('node_modules/vaul/')) return 'ui-primitives';
          if (/node_modules\/(react-hook-form|zod|input-otp)\//.test(id)) return 'forms';
          if (/node_modules\/(socket.io-client|engine.io-client|socket.io-parser)\//.test(id)) return 'realtime';
          return undefined;
        },
      },
    },
  },
});
