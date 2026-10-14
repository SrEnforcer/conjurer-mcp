import tsfppApi from '@tsfpp/eslint-config/api';

// The api profile makes no-console an error, which enforces the stdio rule that the
// server never writes to stdout; it also adds the no-unsafe-* boundary checks.
export default [
  ...tsfppApi,
  {
    // DEVIATION(T-5.4): the tool tests read handler output through JSON.parse helpers
    // that return `any`. Revoked once tool-json.ts validates each payload against a
    // typed schema and the specs read typed values.
    files: ['src/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
];
