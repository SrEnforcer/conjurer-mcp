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
import type { Linter } from 'eslint';
declare const config: Linter.Config[];
export default config;
//# sourceMappingURL=api.d.ts.map