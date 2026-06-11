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
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
// eslint-plugin-jsx-a11y ships no types — declared in declarations.d.ts
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import base from './base.js';
import { coercePlugin } from './plugin-compat.js';
const config = [
    // ── Inherit all base TSF++ rules (applies to .ts and .tsx) ───────────────────
    ...base,
    // ── React / TSX layer ────────────────────────────────────────────────────────
    {
        files: ['**/*.tsx'],
        plugins: {
            'react': coercePlugin(reactPlugin),
            'react-hooks': coercePlugin(reactHooksPlugin),
            'jsx-a11y': coercePlugin(jsxA11yPlugin),
            '@tanstack/query': coercePlugin(tanstackQueryPlugin),
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            // ── Component shape (Rules 1.1–1.2) ────────────────────────────────────
            // Rule 1.1 — no function declarations for components (must be arrow const)
            // `@typescript-eslint/explicit-function-return-type` already enforces the return type half;
            // this prevents the function-declaration form.
            'react/function-component-definition': ['error', {
                    namedComponents: 'arrow-function',
                    unnamedComponents: 'arrow-function',
                }],
            // JSX transform — no explicit React import required (React 17+)
            'react/jsx-uses-react': 'off',
            'react/react-in-jsx-scope': 'off',
            // Rule core — JSX hygiene
            'react/jsx-key': ['error', { checkFragmentShorthand: true }],
            'react/jsx-no-leaked-render': 'error', // forbids `{count && <X />}` rendering "0"
            'react/no-array-index-key': 'error', // index keys break diffing
            'react/no-unstable-nested-components': 'error', // new component identity per render
            'react/self-closing-comp': 'error',
            'react/jsx-pascal-case': 'error',
            'react/jsx-no-useless-fragment': 'error',
            'react/display-name': 'error',
            // ── Hooks (Rules 4.1–4.6, 14.1) ────────────────────────────────────────
            // Rule 14.1 — hooks rules (conditional calls, top-level only)
            'react-hooks/rules-of-hooks': 'error',
            // Rule 4.6 — exhaustive deps (disabling this rule requires DEVIATION(4.6))
            'react-hooks/exhaustive-deps': 'error',
            // ── Props (Rules 2.1–2.4) ───────────────────────────────────────────────
            // Rule 2.4 — no unrestricted rest-prop spread onto DOM elements
            // Note: enforced structurally by Rule 2.1 (explicit Props types); no ESLint rule maps
            // cleanly here without excessive false positives. Code review is the gate.
            // ── Accessibility (Rule 16) ─────────────────────────────────────────────
            // Rule 16.1 — no div/span with onClick; use semantic elements
            'jsx-a11y/click-events-have-key-events': 'error',
            'jsx-a11y/no-static-element-interactions': 'error',
            // Rule 16.2 — accessible forms and images
            'jsx-a11y/alt-text': 'error',
            'jsx-a11y/anchor-has-content': 'error',
            'jsx-a11y/label-has-associated-control': 'error',
            // Rule 16 — ARIA correctness
            'jsx-a11y/aria-props': 'error',
            'jsx-a11y/aria-role': 'error',
            // Autofocus is harmful to keyboard navigation (warn to allow deliberate UX decisions)
            'jsx-a11y/no-autofocus': 'warn',
            // ── TanStack Query (Rules 7.1–7.2) ─────────────────────────────────────
            // Rule 7.2 — exhaustive query-key dependencies
            '@tanstack/query/exhaustive-deps': 'error',
            // Discourage rest-destructuring of query results (encourages explicit field selection)
            '@tanstack/query/no-rest-destructuring': 'error',
            // Stable query-client reference (no inline `new QueryClient()` in render)
            '@tanstack/query/stable-query-client': 'error',
            // ── React-specific functional overrides ─────────────────────────────────
            // React refs are mutable by contract; immutable-data would false-positive on ref.current
            // The base config already allowlists `**.current` via ignoreAccessorPattern — no override needed.
        },
    },
    // ── React hooks in plain .ts files (custom hooks outside .tsx) ───────────────
    {
        files: ['**/use*.ts', '**/use*.tsx'],
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error',
        },
    },
];
export default config;
//# sourceMappingURL=react.js.map