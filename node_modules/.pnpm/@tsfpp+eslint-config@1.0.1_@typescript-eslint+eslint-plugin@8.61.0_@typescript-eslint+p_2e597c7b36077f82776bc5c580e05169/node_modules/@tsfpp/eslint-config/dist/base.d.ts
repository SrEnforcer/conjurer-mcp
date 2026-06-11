/**
 * @tsfpp/eslint-config — base
 *
 * Shared ESLint flat configuration for TSF++ projects (pure TypeScript targets).
 * Enforces Rules 1.2–1.9, 2.1–2.3, 3.1–3.2, 3.4, 4.1, 4.2, 4.5, 6.2, 6.4, 11.2
 * from CODING_STANDARD.md via @typescript-eslint and eslint-plugin-functional.
 *
 * Usage (base only):
 *   // eslint.config.js
 *   import tsfpp from '@tsfpp/eslint-config'
 *   export default tsfpp
 *
 * Usage with project-specific overrides:
 *   import tsfpp from '@tsfpp/eslint-config'
 *   export default [
 *     ...tsfpp,
 *     { rules: { 'no-console': 'off' } },
 *   ]
 *
 * For React projects, import '@tsfpp/eslint-config/react' instead.
 * For API projects, import '@tsfpp/eslint-config/api' instead.
 */
import type { Linter } from 'eslint';
declare const config: Linter.Config[];
export default config;
//# sourceMappingURL=base.d.ts.map