import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import babel from '@rollup/plugin-babel';


// https://vitejs.dev/config/
export default defineConfig({
  root: './src',
  plugins: [
    babel({
      'extensions': ['ts', 'tsx'],
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
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/imgproxy': {
        target: 'http://localhost:8282',
        rewrite: (path) => path.replace(/^\/imgproxy/, ''),
      },
    },
  },
});
