/**
 * @tsfpp/eslint-config/api
 *
 * TSF++ ESLint configuration profile for HTTP API / Node.js server code.
 * Extends the base config with rules that enforce stricter output hygiene,
 * async correctness, and boundary discipline required by API_CODING_STANDARD.md.
 *
 * Rule references in this file are to API_CODING_STANDARD.md unless prefixed with "TSF++".
 *
 * Usage:
 *   // eslint.config.js
 *   import tsfppApi from '@tsfpp/eslint-config/api'
 *   export default tsfppApi
 *
 * With project-specific overrides:
 *   import tsfppApi from '@tsfpp/eslint-config/api'
 *   export default [
 *     ...tsfppApi,
 *     { files: ['src/adapters/**'], rules: { 'no-console': 'off' } },
 *   ]
 *
 * No additional devDependencies are required beyond the base package requirements.
 */
import base from './base.js';
const config = [
    // ── Inherit all base TSF++ rules ─────────────────────────────────────────────
    ...base,
    // ── API-specific overrides and additions ──────────────────────────────────────
    {
        files: ['**/*.ts'],
        rules: {
            // ── Output / logging hygiene ────────────────────────────────────────────
            // API servers must never use console.* — structured logging only (withLogging from logger.ts).
            // The base config sets this to 'warn'; API elevates to 'error'.
            'no-console': 'error',
            // ── Async correctness (Rules 6.x, TSF++ Rule 6.4) ──────────────────────
            // Every async function must contain at least one await expression.
            // Prevents accidentally marking synchronous handlers as async.
            '@typescript-eslint/require-await': 'error',
            // Returned promises must be awaited (catches fire-and-forget in handlers).
            '@typescript-eslint/return-await': ['error', 'always'],
            // ── Boundary strictness (Rules 1.x, 5.x) ───────────────────────────────
            // API rule 5.1 — every request body / query param must pass through Zod (or equivalent).
            // Enforced structurally; no ESLint rule maps cleanly without custom plugin.
            // Document this at the code-review gate (API_CODING_STANDARD.md §10 checklist).
            // Disallow usage of unsafe any-typed values passed to typed parameters.
            // Belt-and-suspenders at parse/validate boundaries.
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            // ── Error handling (TSF++ Rule 6.2; API Rule 4.x) ──────────────────────
            // functional/no-throw-statements is already 'error' in base.
            // No additional override required; adapter boundaries use DEVIATION(6.2).
            // Prevent Promise rejection with non-Error values.
            'prefer-promise-reject-errors': 'error',
        },
    },
    // ── Adapter / boundary files — allow `new` and `throw` with deviation ─────────
    // Projects that follow TSF++ boundary conventions will place all I/O adapters in
    // a dedicated directory (e.g. src/adapters/, src/infrastructure/).
    // Override per-project in the consuming eslint.config.js if needed:
    //
    //   {
    //     files: ['src/adapters/**'],
    //     rules: {
    //       'no-restricted-syntax':           'off',  // allows `new` and `instanceof`
    //       'functional/no-throw-statements': 'off',  // allows `throw` at boundary
    //     },
    //   },
];
export default config;
//# sourceMappingURL=api.js.map