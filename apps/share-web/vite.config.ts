import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import babel from '@rollup/plugin-babel';

// https://vitejs.dev/config/
export default defineConfig({
  root: './src',
  plugins: [
    babel({
      extensions: ['ts', 'tsx'],
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      plugins: ['effector/babel-plugin'],
    }),
    react(),
    tsconfigPaths(),
  ],
  server: {
    port: 4000,
    host: '0.0.0.0',
    proxy: {
      '/trpc': 'http://127.0.0.1:4001',
      '/storage': 'http://127.0.0.1:4001',
    },
  },
});
