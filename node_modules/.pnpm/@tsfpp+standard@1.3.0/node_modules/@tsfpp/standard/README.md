# `@tsfpp/standard`

> The normative coding standards for the TSF++ ecosystem — base specification and domain-specific profiles.

This package contains the TSF++ coding standards as Markdown documents. It ships no runtime code. Installing it makes the full normative surface available in `node_modules/@tsfpp/standard/spec/` for tooling, LLM context loading, Copilot instruction wiring, and cross-package governance declarations.

---

## Standards

All standard documents live in `spec/`.

| Document | Codename | Scope |
|---|---|---|
| [`spec/CODING_STANDARD.md`](./spec/CODING_STANDARD.md) | TSF++ | All TypeScript source code in the ecosystem |
| [`spec/API_CODING_STANDARD.md`](./spec/API_CODING_STANDARD.md) | TSF++/API | HTTP API handlers, contracts, and transport-boundary code |
| [`spec/REACT_CODING_STANDARD.md`](./spec/REACT_CODING_STANDARD.md) | TSF++/React | React components, hooks, stores, and JSX-producing utilities |
| [`spec/DATA_CODING_STANDARD.md`](./spec/DATA_CODING_STANDARD.md) | TSF++/Data | Repository adapters, DAL, query construction, and data mapping |
| [`spec/CONFIG_CODING_STANDARD.md`](./spec/CONFIG_CODING_STANDARD.md) | TSF++/Config | Environment parsing, typed config loading, and configuration injection |
| [`spec/LOG_CODING_STANDARD.md`](./spec/LOG_CODING_STANDARD.md) | TSF++/Log | Structured logging ports, trace correlation, and redaction-safe log events |
| [`spec/TEST_CODING_STANDARD.md`](./spec/TEST_CODING_STANDARD.md) | TSF++/Test | Test files, factories, fixtures, and test utilities |
| [`spec/ANNOTATION_CODING_STANDARD.md`](./spec/ANNOTATION_CODING_STANDARD.md) | TSF++/Annotate | JSDoc blocks, inline comments, code markers, and deviation records |
| [`spec/SECURITY_CODING_STANDARD.md`](./spec/SECURITY_CODING_STANDARD.md) | TSF++/Security | Security-critical code, authentication, authorisation, and input handling |

## Supplementary documents

| Document | Purpose |
|---|---|
| [`spec/PHILOSOPHY.md`](./spec/PHILOSOPHY.md) | Design philosophy and rationale behind TSF++ |
| [`spec/RATIONALE.md`](./spec/RATIONALE.md) | Section-by-section rationale for normative decisions |
| [`spec/DEVIATIONS.md`](./spec/DEVIATIONS.md) | Project-wide deviation registry |

---

## Reading order

The standards form a profile hierarchy. The base standard applies everywhere; profiles apply on top for code in their scope. Multiple profiles may apply to the same file.

```
spec/CODING_STANDARD.md                      ← always required
├── spec/API_CODING_STANDARD.md              ← HTTP API / server-side code
├── spec/REACT_CODING_STANDARD.md            ← React / UI code
├── spec/DATA_CODING_STANDARD.md             ← repository adapters and DAL
├── spec/CONFIG_CODING_STANDARD.md           ← environment and runtime config
├── spec/LOG_CODING_STANDARD.md              ← structured operational logging
├── spec/TEST_CODING_STANDARD.md             ← test files (cross-cutting)
├── spec/ANNOTATION_CODING_STANDARD.md       ← all comments (cross-cutting)
└── spec/SECURITY_CODING_STANDARD.md         ← security-critical paths
```

A profile extends the base with domain-specific rules. Where a profile rule specialises a base rule, the specialisation governs for code in that scope. Where a profile explicitly relaxes a base rule, the relaxation is documented and follows the deviation procedure defined in the base standard.

The two cross-cutting profiles — `TSF++/Test` and `TSF++/Annotate` — apply to every file in the repository regardless of which other profiles are active.

---

## Installation

```sh
pnpm add -D @tsfpp/standard
```

After installation, all standard documents are available under `node_modules/@tsfpp/standard/spec/`.

---

## Declaring governance in a package

Each package governed by TSF++ SHOULD declare which standards apply in its own README:

```markdown
## Governance

This package conforms to the following TSF++ standards:

| Standard | Document | Scope |
|---|---|---|
| TSF++ | `spec/CODING_STANDARD.md` | All TypeScript source |
| TSF++/API | `spec/API_CODING_STANDARD.md` | HTTP boundary code |
| TSF++/Test | `spec/TEST_CODING_STANDARD.md` | Test files |
| TSF++/Annotate | `spec/ANNOTATION_CODING_STANDARD.md` | All comments |

See [`@tsfpp/standard`](https://www.npmjs.com/package/@tsfpp/standard).
```

---

## Versioning policy

`@tsfpp/standard` follows Semantic Versioning. Releases are managed by `release-please` from Conventional Commits history.

| Bump | Trigger |
|---|---|
| **Patch** | Editorial corrections, example fixes, clarifications with no change to normative intent |
| **Minor** | New rules (SHOULD or MAY), new appendix sections, new profiles |
| **Major** | Changes to existing MUST rules, rule removals, breaking redefinitions of compliance levels |

Downstream packages SHOULD pin to a minor range (`^x.y.0`) to receive clarifications and new non-breaking rules automatically while remaining on a known normative surface.

---

## Part of the TSF++ ecosystem

| Package | Role |
|---|---|
| [`@tsfpp/standard`](https://www.npmjs.com/package/@tsfpp/standard) | Normative specification (this package) |
| [`@tsfpp/prelude`](https://www.npmjs.com/package/@tsfpp/prelude) | Reference implementation — ADTs, Option, Result, branded types |
| [`@tsfpp/boundary`](https://www.npmjs.com/package/@tsfpp/boundary) | HTTP boundary primitives — parsing, error taxonomy, response builders |
| [`@tsfpp/eslint-config`](https://www.npmjs.com/package/@tsfpp/eslint-config) | Deterministic rule enforcement via ESLint |
| [`@tsfpp/tsconfig`](https://www.npmjs.com/package/@tsfpp/tsconfig) | Shared TypeScript compiler configuration |
| [`@tsfpp/agents`](https://www.npmjs.com/package/@tsfpp/agents) | Copilot agents, instruction files, and skills that enforce the standard via AI tooling |

---

## License

MIT