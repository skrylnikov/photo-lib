import { defineConfig } from '@tanstack/react-start/config'
import tsConfigPaths from 'vite-tsconfig-paths'
import pandacss from "@pandacss/dev/postcss";

export default defineConfig({
  tsr: {
    appDirectory: 'src',
  },
  vite: {
    plugins: [
      pandacss,
      tsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
  server: {
    preset: 'bun',
    devProxy: {
      '/s3': {
        target: 'http://s3:9000',
        changeOrigin: true,
      },
    },
  },
})
