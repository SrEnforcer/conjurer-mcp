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
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import functionalPlugin from 'eslint-plugin-functional';
import { coercePlugin } from './plugin-compat.js';
const config = [
    // ── Global ignores ────────────────────────────────────────────────────────────
    {
        ignores: ['dist/**', 'coverage/**', 'node_modules/**', '**/*.d.ts'],
    },
    // ── TypeScript source files ───────────────────────────────────────────────────
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 'latest',
                project: true, // resolves nearest tsconfig.json; override with projectService
            },
        },
        plugins: {
            '@typescript-eslint': coercePlugin(tsPlugin),
            'functional': coercePlugin(functionalPlugin),
        },
        rules: {
            // ── Type-system rules ─────────────────────────────────────────────────────
            // Rule 1.2 / 4.1 — exhaustive switch via never (backed by @tsfpp/prelude absurd)
            '@typescript-eslint/switch-exhaustiveness-check': 'error',
            // Rule 1.4 — prefer `type` over `interface`; `interface` requires DEVIATION(1.4)
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            // Rule 1.5 — no `any`
            '@typescript-eslint/no-explicit-any': 'error',
            // Rule 1.6 — no `!`
            '@typescript-eslint/no-non-null-assertion': 'error',
            // Rule 1.6 — no `as` (DEVIATION(1.6) + eslint-disable required inside smart constructors)
            '@typescript-eslint/consistent-type-assertions': ['error', {
                    assertionStyle: 'never',
                }],
            // Rule 1.8 / 1.9 — forbidden language constructs (no ESLint plugin covers these directly)
            'no-restricted-syntax': [
                'error',
                {
                    // Rule 1.8 — no enum
                    selector: 'TSEnumDeclaration',
                    message: 'TSF++ Rule 1.8: Use string literal unions or `as const` objects instead of enum.',
                },
                {
                    // Rule 1.9 — no namespace
                    selector: "TSModuleDeclaration[kind='namespace']",
                    message: 'TSF++ Rule 1.9: Namespace declarations are forbidden.',
                },
                {
                    // Rule 1.9 — no instanceof (prefer discriminated unions and type-guard predicates)
                    selector: 'BinaryExpression[operator="instanceof"]',
                    message: 'TSF++ Rule 1.9: instanceof is forbidden; use discriminated unions or exported type-guard predicates.',
                },
                {
                    // Rule 1.9 — no new (adapter boundaries require DEVIATION(1.9) comment + eslint-disable)
                    selector: 'NewExpression',
                    message: 'TSF++ Rule 1.9: new is forbidden outside adapter boundaries. Add DEVIATION(1.9) and an eslint-disable comment.',
                },
            ],
            // ── Immutability & functional style ──────────────────────────────────────
            // Rule 2.1 — no `let`
            'functional/no-let': 'error',
            // Rule 2.2 — readonly types (deep)
            'functional/prefer-readonly-type': ['error', {
                    allowLocalMutation: false,
                    allowMutableReturnType: false,
                    ignoreClass: false,
                    ignoreInterface: false,
                }],
            // Rule 2.2 — prefer-readonly on (legacy) class properties (belt-and-suspenders)
            '@typescript-eslint/prefer-readonly': 'error',
            // Rule 2.3 — no mutation (property assignment, array mutation methods)
            'functional/immutable-data': ['error', {
                    ignoreImmediateMutation: true, // allows builder pattern inside same statement
                    ignoreAccessorPattern: ['**.current', 'process.env.*'], // React refs + env edge cases
                }],
            // Rule 1.9 — no classes / no this
            'functional/no-classes': 'error',
            'functional/no-this-expressions': 'error',
            // Rule 4.2 — no imperative loops
            'functional/no-loop-statements': 'error',
            // Rule 6.2 — no throw outside adapter boundaries
            // Disable per-file with `// eslint-disable-next-line functional/no-throw-statements`
            // accompanied by a `// DEVIATION(6.2)` comment at every adapter entry point.
            'functional/no-throw-statements': 'error',
            // ── Function rules ────────────────────────────────────────────────────────
            // Rule 3.1 — explicit return type on every exported function
            '@typescript-eslint/explicit-function-return-type': ['error', {
                    allowExpressions: false,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true,
                    allowDirectConstAssertionInArrowFunctions: true,
                }],
            // Rule 3.2 — arity ≤ 3; use a readonly record for ≥ 3 parameters
            'max-params': ['error', { max: 3 }],
            // Rule 3.4 — cyclomatic complexity ≤ 10
            'complexity': ['error', { max: 10 }],
            // Rule 3.4 — nesting depth ≤ 4
            'max-depth': ['error', { max: 4 }],
            // Rule 3.4 — 40-line function body limit
            'max-lines-per-function': ['error', {
                    max: 40,
                    skipBlankLines: true,
                    skipComments: true,
                }],
            // ── Async / promise safety ────────────────────────────────────────────────
            // Rule 6.4 — no unhandled promise rejections
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            // ── Control-flow hygiene ──────────────────────────────────────────────────
            // Rule 4.5 — no truthiness checks on non-booleans
            '@typescript-eslint/strict-boolean-expressions': ['error', {
                    allowString: false,
                    allowNumber: false,
                    allowNullableObject: false,
                    allowNullableBoolean: false,
                    allowNullableString: false,
                    allowNullableNumber: false,
                    allowAny: false,
                }],
            // ── Module hygiene ────────────────────────────────────────────────────────
            // Prefer `import type` for type-only imports (verbatimModuleSyntax companion)
            '@typescript-eslint/consistent-type-imports': ['error', {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                    disallowTypeAnnotations: false,
                }],
            // ── General hygiene ───────────────────────────────────────────────────────
            // Accidental console.log in production code — warn in base; API profile overrides to error
            'no-console': 'warn',
            // Rule 2.1 — const only
            'prefer-const': 'error',
            'no-var': 'error',
            // Rule 2.3 — no parameter reassignment
            'no-param-reassign': 'error',
            // Rule 4.5 — strict equality
            'eqeqeq': ['error', 'always'],
            // Rule 11.2 — file length ≤ 400 lines (800 absolute maximum via DEVIATION(11.2))
            'max-lines': ['error', {
                    max: 400,
                    skipBlankLines: true,
                    skipComments: true,
                }],
            // Unused vars — `_` prefix exempted (Rule 7.6)
            '@typescript-eslint/no-unused-vars': ['error', {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                }],
        },
    },
];
export default config;
//# sourceMappingURL=base.js.map