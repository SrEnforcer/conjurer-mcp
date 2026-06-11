/**
 * @tsfpp/eslint-config/react
 *
 * TSF++ ESLint configuration profile for React / TSX code.
 * Extends the base config with React-, hooks-, accessibility-, and TanStack Query–specific rules.
 *
 * Enforces rules from REACT_CODING_STANDARD.md (a profile of CODING_STANDARD.md).
 * Rule references in this file are to REACT_CODING_STANDARD.md unless prefixed with "TSF++".
 *
 * Usage:
 *   // eslint.config.js
 *   import tsfppReact from '@tsfpp/eslint-config/react'
 *   export default tsfppReact
 *
 * With project-specific overrides:
 *   import tsfppReact from '@tsfpp/eslint-config/react'
 *   export default [
 *     ...tsfppReact,
 *     { rules: { 'react/display-name': 'off' } },
 *   ]
 *
 * Required devDependencies (in addition to base requirements):
 *   eslint-plugin-react
 *   eslint-plugin-react-hooks
 *   eslint-plugin-jsx-a11y
 *   @tanstack/eslint-plugin-query
 */
import type { Linter } from 'eslint';
declare const config: Linter.Config[];
export default config;
//# sourceMappingURL=react.d.ts.map