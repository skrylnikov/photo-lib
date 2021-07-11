import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import tsconfigPaths from 'vite-tsconfig-paths';
import babel from '@rollup/plugin-babel';


// https://vitejs.dev/config/
export default defineConfig({
  root: './client',
  plugins: [
    babel({
      'extensions': ['ts', 'tsx'],
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      plugins: ['effector/babel-plugin'],
    }),
    reactRefresh(),
    tsconfigPaths(),
  ],
  server: {
    port: 4000,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
