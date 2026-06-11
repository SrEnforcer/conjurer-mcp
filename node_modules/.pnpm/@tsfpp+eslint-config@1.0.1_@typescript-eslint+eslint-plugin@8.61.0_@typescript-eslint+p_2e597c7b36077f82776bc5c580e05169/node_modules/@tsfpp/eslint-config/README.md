# @tsfpp/eslint-config

Shared ESLint flat configuration for [TSF++](./spec/CODING_STANDARD.md) projects.

Enforces the machine-checkable subset of TSF++ rules via `@typescript-eslint` and `eslint-plugin-functional`. Every active rule references the spec rule it enforces. Three profiles are available — pick the one that matches your target.

## Requirements

- ESLint ≥ 9 (flat config format)
- TypeScript ≥ 5.3
- A `tsconfig.json` reachable from each linted file

## Profiles

| Import | Target | Extra peer deps required |
|--------|--------|--------------------------|
| `@tsfpp/eslint-config` | Pure TypeScript (Node.js, libraries) | — |
| `@tsfpp/eslint-config/react` | React / TSX projects | See [React installation](#react) |
| `@tsfpp/eslint-config/api` | HTTP API / Node.js servers | — |

The `react` and `api` profiles extend the base — you do not need to compose them manually.

## Installation

### Base

```sh
pnpm add -D @tsfpp/eslint-config \
  eslint \
  typescript \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-functional
```

### React

```sh
pnpm add -D @tsfpp/eslint-config \
  eslint \
  typescript \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-functional \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-jsx-a11y \
  @tanstack/eslint-plugin-query
```

### API

Same as base — no additional peer dependencies.

## Usage

### Standalone (base)

```js
// eslint.config.js
import tsfpp from '@tsfpp/eslint-config'

export default tsfpp
```

### React profile

```js
// eslint.config.js
import tsfppReact from '@tsfpp/eslint-config/react'

export default tsfppReact
```

### API profile

```js
// eslint.config.js
import tsfppApi from '@tsfpp/eslint-config/api'

export default tsfppApi
```

### With project-specific overrides

Spread the profile array and append your overrides:

```js
// eslint.config.js
import tsfppReact from '@tsfpp/eslint-config/react'

export default [
  ...tsfppReact,
  {
    rules: { 'no-console': 'off' },
  },
]
```

### Pointing to a specific tsconfig

```js
// eslint.config.js
import tsfpp from '@tsfpp/eslint-config'

export default [
  ...tsfpp,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
]
```

## Enforced rules

### Base (all profiles)

| ESLint rule | TSF++ rule | Level |
|-------------|------------|-------|
| `@typescript-eslint/consistent-type-definitions: type` | 1.4 | MUST |
| `@typescript-eslint/no-explicit-any` | 1.5 | MUST |
| `@typescript-eslint/no-non-null-assertion` | 1.6 | MUST |
| `@typescript-eslint/consistent-type-assertions: never` | 1.6 | MUST |
| `@typescript-eslint/switch-exhaustiveness-check` | 1.2 / 4.1 | MUST |
| `no-restricted-syntax` → `TSEnumDeclaration` | 1.8 | MUST |
| `no-restricted-syntax` → `TSModuleDeclaration[kind='namespace']` | 1.9 | MUST |
| `no-restricted-syntax` → `BinaryExpression[operator="instanceof"]` | 1.9 | MUST |
| `no-restricted-syntax` → `NewExpression` | 1.9 | MUST |
| `functional/no-classes` | 1.9 | MUST |
| `functional/no-this-expressions` | 1.9 | MUST |
| `functional/no-let` | 2.1 | MUST |
| `functional/prefer-readonly-type` | 2.2 | MUST |
| `@typescript-eslint/prefer-readonly` | 2.2 | MUST |
| `functional/immutable-data` | 2.3 | MUST |
| `no-param-reassign` | 2.3 | MUST |
| `@typescript-eslint/explicit-function-return-type` | 3.1 | MUST |
| `max-params: 3` | 3.2 | MUST |
| `complexity: 10` | 3.4 | MUST |
| `max-depth: 4` | 3.4 | MUST |
| `max-lines-per-function: 40` | 3.4 | MUST |
| `functional/no-loop-statements` | 4.2 | MUST |
| `@typescript-eslint/strict-boolean-expressions` | 4.5 | MUST |
| `eqeqeq: always` | 4.5 | MUST |
| `functional/no-throw-statements` | 6.2 | MUST |
| `@typescript-eslint/no-floating-promises` | 6.4 | MUST |
| `@typescript-eslint/no-misused-promises` | 6.4 | MUST |
| `max-lines: 400` | 11.2 | MUST |

### React profile additions

| ESLint rule | TSF++ React rule | Level |
|-------------|-----------------|-------|
| `react/function-component-definition: arrow-function` | R-1.1 | MUST |
| `react/jsx-no-leaked-render` | R-1.x | MUST |
| `react/no-array-index-key` | R-1.x | MUST |
| `react/no-unstable-nested-components` | R-1.x | MUST |
| `react-hooks/rules-of-hooks` | R-14.1 | MUST |
| `react-hooks/exhaustive-deps` | R-4.6 | MUST |
| `@tanstack/query/exhaustive-deps` | R-7.2 | MUST |
| `@tanstack/query/stable-query-client` | R-7.x | MUST |
| `jsx-a11y/click-events-have-key-events` | R-16.1 | MUST |
| `jsx-a11y/no-static-element-interactions` | R-16.1 | MUST |
| `jsx-a11y/alt-text` | R-16.2 | MUST |
| `jsx-a11y/label-has-associated-control` | R-16.2 | MUST |

### API profile additions

| ESLint rule | TSF++ API rule | Level |
|-------------|---------------|-------|
| `no-console: error` | A-logging | MUST |
| `@typescript-eslint/require-await` | A-6.x | MUST |
| `@typescript-eslint/return-await: always` | A-6.x | MUST |
| `@typescript-eslint/no-unsafe-*` (all five) | A-1.x / A-5.1 | MUST |
| `prefer-promise-reject-errors` | A-4.x | MUST |

## Handling permitted deviations

Some TSF++ rules permit deviations at specific boundaries. Use `eslint-disable-next-line` paired with a `DEVIATION` comment so deviations are explicit and auditable by the TSF++ Audit agent and during code review.

```typescript
// DEVIATION(1.4): structural extension contract requires interface
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface Serializable { serialize(): string }
```

```typescript
// DEVIATION(1.6): `as` permitted inside smart constructor boundary
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
return raw as NodeId
```

```typescript
// DEVIATION(1.9): adapter boundary — third-party SDK requires `new`
// eslint-disable-next-line no-restricted-syntax
const client = new ThirdPartySdkClient(config)
```

```typescript
// DEVIATION(6.2): adapter boundary — wraps third-party throw in Result
// eslint-disable-next-line functional/no-throw-statements
throw new Error('unreachable')
```

## Internal adapter: plugin-compat

Several ESLint plugin packages ship types that lag behind the current `@eslint/core` `Plugin` interface. This package contains a single `coercePlugin` adapter (`plugin-compat.ts`) that isolates the necessary type cast at one auditable boundary per TSF++ DEVIATION(1.6). Consumers are unaffected — this is an internal concern of the config package itself.

## See also

- [spec/standards/TSFPP_CODING_STANDARD.md §9](../../spec/standards/TSFPP_CODING_STANDARD.md#9--compiler-and-tooling-configuration) — normative rule reference
- [spec/rationale/09-tooling.md](../../spec/rationale/09-tooling.md) — extended justification
- [@tsfpp/tsconfig](../tsconfig/README.md) — companion TypeScript config presets