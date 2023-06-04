const { configure, presets } = require('eslint-kit');

module.exports = configure({
  allowDebug: process.env.NODE_ENV !== 'production',
  presets: [
    presets.node(),
    presets.prettier({
      semi: true,
    }),
    presets.typescript({
      tsconfig: 'packages/tsconfig/base.json',
    }),
    presets.react(),
    presets.effector(),
  ],
  extend: {
    rules: {
      'no-new': 'off',
    },
  },
});
