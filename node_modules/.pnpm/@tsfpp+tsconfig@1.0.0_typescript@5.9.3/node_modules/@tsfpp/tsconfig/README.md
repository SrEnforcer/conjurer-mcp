# @tsfpp/tsconfig

Shared TypeScript compiler configuration presets for [TSF++](https://github.com/tsfpp/standard) projects.

All mandatory compiler flags from [Rule 9.1](https://github.com/tsfpp/standard/blob/main/spec/rationale/09-tooling.md) are enforced in every preset. Projects extend one of the three presets and add only path, include, and project-specific options on top.

## Presets

| Preset | File | Use for |
|--------|------|---------|
| `base` | `tsconfig.base.json` | Foundation for other presets; never extend directly in projects |
| `lib`  | `tsconfig.lib.json`  | Publishable npm packages (`declaration: true`, `composite: true`) |
| `app`  | `tsconfig.app.json`  | Applications and tools (`noEmit: true`) |

## Installation

```sh
pnpm add -D @tsfpp/tsconfig typescript
```

## Usage

### Library package (`tsconfig.json`)

```jsonc
{
  "extends": "@tsfpp/tsconfig/lib",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### Application (`tsconfig.json`)

```jsonc
{
  "extends": "@tsfpp/tsconfig/app",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "tests"]
}
```

> **Note:** The `app` preset sets `"types": ["node"]` for ambient type explicitness. Add `@types/node` as a dev dependency:
>
> ```sh
> pnpm add -D @types/node
> ```
>
> Remove or override `types` if your runtime is not Node.js (e.g. a browser-only app with no Node globals).

## Mandatory flags (Rule 9.1)

Every preset enforces the full set of flags required by the TSF++ specification. Flags marked **Rule 9.1** are explicitly mandated; the remaining flags are enforced as quality-of-life corollaries that follow directly from the standard's strictness principles.

| Flag | Rule | Why it is mandatory |
|------|------|---------------------|
| `strict` | 9.1 | Enables all strict sub-checks |
| `noUncheckedIndexedAccess` | 9.1 | Index access returns `T \| undefined`, preventing `!` violations (Rule 1.6) |
| `exactOptionalPropertyTypes` | 9.1 | Distinguishes absent from `undefined` (Rule 3.7) |
| `noImplicitOverride` | 9.1 | Requires explicit `override` keyword |
| `noFallthroughCasesInSwitch` | 9.1 | Enforces exhaustive `switch` (Rule 4.1) |
| `useUnknownInCatchVariables` | 9.1 | Catch variables are `unknown`, not `any` (Rule 1.5) |
| `verbatimModuleSyntax` | 9.1 | Prevents runtime impact from type-only imports |
| `isolatedModules` | 9.1 | Each file must be independently compilable (implied by `verbatimModuleSyntax`; kept explicit) |
| `noPropertyAccessFromIndexSignature` | 9.1 | Forces bracket notation for dynamic key access |
| `forceConsistentCasingInFileNames` | 9.1 | Prevents cross-platform import casing bugs |
| `noImplicitReturns` | corollary | All code paths must return a value |
| `noUnusedLocals` | corollary | Dead local bindings are a compile error |
| `noUnusedParameters` | corollary | Dead parameters are a compile error; prefix with `_` to opt out |

See [spec/rationale/09-tooling.md](https://github.com/tsfpp/standard/blob/main/spec/rationale/09-tooling.md) for the extended justification of each flag.

## Notes on the `lib` preset

`tsconfig.lib.json` emits declarations into `dist/types/` and JavaScript into `dist/`. This separation accommodates toolchains that generate JS via a bundler and use `tsc` only for type output. If your toolchain expects `.d.ts` files co-located with `.js` files, override `declarationDir` in your local config:

```jsonc
{
  "extends": "@tsfpp/tsconfig/lib",
  "compilerOptions": {
    "rootDir": "src",
    "declarationDir": "dist"
  },
  "include": ["src"]
}
```

## TypeScript version requirement

Requires **TypeScript ≥ 5.0**. The `exports`-based `extends` resolution (`"extends": "@tsfpp/tsconfig/lib"`) was introduced in TypeScript 5.0.