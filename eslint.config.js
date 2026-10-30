const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*"],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'off',
    },
  }
]);
