import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:4001';

// https://vitejs.dev/config/
export default defineConfig({
  root: './src',
  plugins: [
    react(),
    vanillaExtractPlugin(),
    tsconfigPaths(),
  ],
  server: {
    port: 4000,
    host: '0.0.0.0',
    proxy: {
      '/trpc': apiTarget,
      '/media': apiTarget,
      '/auth': apiTarget,
    },
  },
});
