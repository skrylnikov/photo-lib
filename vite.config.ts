import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import tsconfigPaths from 'vite-tsconfig-paths';
import babel from '@rollup/plugin-babel';
import linaria from '@linaria/rollup';
import svgr from 'vite-plugin-svgr';


// https://vitejs.dev/config/
export default defineConfig({
  root: './client',
  plugins: [
    linaria({ sourceMap: true }),
    babel({
      'extensions': ['ts', 'tsx'],
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      plugins: ['effector/babel-plugin'],
    }),
    reactRefresh(),
    tsconfigPaths(),
    svgr(),
  ],
  server: {
    port: 4000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
