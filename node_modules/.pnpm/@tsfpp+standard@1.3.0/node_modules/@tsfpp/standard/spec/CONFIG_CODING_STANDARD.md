# CONFIG_CODING_STANDARD.md — Configuration Management Standard

This standard is mandatory for all configuration loading, environment variable access, and runtime configuration management in the repository. English only.
Codename TSF++/Config (tsfpp-config)

**Version:** 1.0.0
**Date:** 2026-05-18
**Classification:** Normative — repository-wide
**Status:** Cross-cutting profile of TSF++ (`CODING_STANDARD.md`)
**Applies to:** All layers — server-side primarily; CLI and React where applicable

---

## Preamble

### The problem with `process.env`

`process.env` is a stringly-typed global side channel. Any module in the codebase can read any environment variable at any time without declaring a dependency on it. There is no compile-time check that a required variable is present. A missing variable surfaces as `undefined` at the first call site that uses it — which may be deep inside a request handler, long after startup, and only for certain code paths.

The consequences:

- **Late failure.** A misconfigured deployment fails at the first request that exercises the missing config, not at startup where it can be caught immediately.
- **Invisible coupling.** A module that reads `process.env.DATABASE_URL` has an undeclared dependency on the environment. There is no way to know from the module's signature what environment variables it requires.
- **No type safety.** Every value from `process.env` is `string | undefined`. Booleans, numbers, URLs, and enums must be parsed manually — inconsistently, at every call site.
- **Untestable in isolation.** A function that reads `process.env` cannot be tested without mutating the process environment, which affects all concurrent tests.

TSF++ configuration management solves all four problems: fail at startup, declare dependencies explicitly, parse and type at the boundary, and inject as a value.

---

## §1 — The Config port

### Rule 1.1 — Configuration is a typed readonly record (MUST)

All application configuration is represented as a typed, readonly record. Never access `process.env` outside the config loader.

```ts
// src/shared/config.ts

/**
 * @module config
 *
 * Typed application configuration. Parsed and validated once at startup from
 * the process environment. All application code receives a `Config` value;
 * none reads `process.env` directly.
 *
 * @packageDocumentation
 */

/**
 * Complete typed configuration for the application.
 *
 * All fields are required. Optional configuration uses `Option<T>` rather
 * than `T | undefined`. Fields are grouped by concern for readability.
 */
export type Config = {
  readonly server: {
    readonly port:     number
    readonly host:     string
    readonly logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
  readonly database: {
    readonly url:            string
    readonly poolMin:        number
    readonly poolMax:        number
    readonly queryTimeoutMs: number
  }
  readonly auth: {
    readonly jwtSecret:      string
    readonly tokenTtlSeconds: number
  }
  readonly features: {
    readonly maintenanceMode: boolean
  }
}
```

### Rule 1.2 — Config is loaded and validated once at the startup boundary (MUST)

Configuration is parsed from the environment exactly once — at the application entry point, before any server or handler is initialised. If validation fails, the process exits with a descriptive error before accepting any traffic.

```ts
// src/main.ts (or src/server.ts)

import { parseConfig } from './infrastructure/config-loader'

const configResult = parseConfig(process.env)

if (isErr(configResult)) {
  console.error('Configuration error:', configResult.error)
  process.exit(1)
}

const config = configResult.value
// config is now available to wire up the application
```

### Rule 1.3 — Config is injected, never imported (MUST)

`Config` (or the relevant sub-section) is passed as a dependency to every module that needs it. No module reads `process.env` directly. No module imports a config singleton.

```ts
// Good — config injected as part of Deps
type Deps = {
  readonly db:     Database
  readonly logger: Logger
  readonly config: Pick<Config, 'auth'>
}

const createSession = (deps: Deps) => async (input: CreateSessionInput) => {
  const expiresAt = addSeconds(new Date(), deps.config.auth.tokenTtlSeconds)
  // ...
}

// Bad — reads process.env inside a module
const createSession = async (input: CreateSessionInput) => {
  const ttl = parseInt(process.env.TOKEN_TTL_SECONDS ?? '3600', 10)
  // ...
}

// Bad — imports a config singleton
import { config } from '../config'
```

---

## §2 — The config loader

### Rule 2.1 — Zod is the validation layer for config (MUST)

All environment variables are parsed and validated with Zod via `loadConfig` from `@tsfpp/boundary`. The loader returns `Result<Config, ConfigError>`. It never throws. `ConfigError` is also exported from `@tsfpp/boundary`.

```ts
// src/infrastructure/config-loader.ts

import { z } from 'zod'
import { loadConfig, type ConfigError } from '@tsfpp/boundary'
import { type Config } from '../shared/config'

const schema = z.object({
  PORT:                  z.coerce.number().int().min(1).max(65535).default(3000),
  HOST:                  z.string().default('0.0.0.0'),
  LOG_LEVEL:             z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL:          z.string().url(),
  DATABASE_POOL_MIN:     z.coerce.number().int().min(1).default(2),
  DATABASE_POOL_MAX:     z.coerce.number().int().min(1).default(10),
  DATABASE_TIMEOUT_MS:   z.coerce.number().int().min(100).default(5000),

  JWT_SECRET:            z.string().min(32),
  TOKEN_TTL_SECONDS:     z.coerce.number().int().min(60).default(3600),

  MAINTENANCE_MODE:      z.coerce.boolean().default(false),
})

/**
 * Parses and validates the process environment into a typed `Config`.
 *
 * `loadConfig` from `@tsfpp/boundary` handles the parse/validate cycle.
 * All validation failures are collected in a single pass and returned as
 * `Err(ConfigError)`. Never throws.
 *
 * @param env - The raw environment object. Pass `process.env` at the entry
 *   point; pass a plain record in tests.
 * @returns `Ok(Config)` on success; `Err(ConfigError)` on validation failure.
 */
export const parseConfig = (env: Record<string, string | undefined>): Result<Config, ConfigError> => {
  const raw = loadConfig(schema, env)
  if (isErr(raw)) return raw

  const e = raw.value
  return ok({
    server: {
      port:     e.PORT,
      host:     e.HOST,
      logLevel: e.LOG_LEVEL,
    },
    database: {
      url:            e.DATABASE_URL,
      poolMin:        e.DATABASE_POOL_MIN,
      poolMax:        e.DATABASE_POOL_MAX,
      queryTimeoutMs: e.DATABASE_TIMEOUT_MS,
    },
    auth: {
      jwtSecret:       e.JWT_SECRET,
      tokenTtlSeconds: e.TOKEN_TTL_SECONDS,
    },
    features: {
      maintenanceMode: e.MAINTENANCE_MODE,
    },
  })
}
```

### Rule 2.2 — All required variables fail together, not one at a time (MUST)

Zod's `safeParse` collects all validation errors in a single pass. Never validate variables one at a time with early returns — the operator needs to see all missing variables at once, not discover them sequentially across deployments.

### Rule 2.3 — Coerce scalar types at the loader boundary (MUST)

All type coercion (`string → number`, `string → boolean`, `string → URL`) happens in the Zod schema at the loader boundary. Never parse integers or booleans inside application code.

```ts
// Good — coercion at boundary
DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10)

// Bad — coercion in application code
const poolMax = parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10)
```

### Rule 2.4 — Provide sensible defaults for non-critical variables (SHOULD)

Use `.default(value)` in the Zod schema for variables that have sensible defaults (ports, timeouts, log levels, feature flags). Reserve hard requirements (no `.default()`) for secrets and URLs that cannot be guessed.

```ts
// Required — no default
DATABASE_URL: z.string().url()
JWT_SECRET:   z.string().min(32)

// Defaulted — operational but not critical
PORT:      z.coerce.number().int().default(3000)
LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
```

### Rule 2.5 — Secrets must meet minimum entropy requirements (MUST)

Secret values (JWT signing keys, encryption keys, HMAC secrets) must be validated for minimum length in the schema. The minimum is 32 characters for symmetric secrets; 64 recommended.

```ts
JWT_SECRET: z.string().min(32),  // enforce minimum entropy
```

---

## §3 — Environment variable naming

### Rule 3.1 — SCREAMING_SNAKE_CASE for all environment variables (MUST)

```
PORT
DATABASE_URL
JWT_SECRET
FEATURE_MAINTENANCE_MODE
```

### Rule 3.2 — Prefix by concern for non-trivial configs (SHOULD)

Group related variables with a common prefix to make `.env` files self-documenting and to make the Zod schema intent clear.

```
DATABASE_URL
DATABASE_POOL_MIN
DATABASE_POOL_MAX
DATABASE_TIMEOUT_MS

AUTH_JWT_SECRET
AUTH_TOKEN_TTL_SECONDS

FEATURE_MAINTENANCE_MODE
FEATURE_NEW_ONBOARDING
```

### Rule 3.3 — Boolean variables use `true` / `false` literally (MUST)

Never use `1` / `0`, `yes` / `no`, or `on` / `off` for boolean environment variables. Use `z.coerce.boolean()` which accepts `'true'` and `'false'` only.

```ts
// Good
MAINTENANCE_MODE=true

// Bad
MAINTENANCE_MODE=1
MAINTENANCE_MODE=yes
```

---

## §4 — `.env` files

### Rule 4.1 — `.env.example` is committed; `.env` is not (MUST)

`.env.example` contains every variable the application requires, with placeholder values and a one-line comment explaining each. `.env` (containing real values) is always in `.gitignore`.

```sh
# .env.example

# Server
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Database
DATABASE_URL=postgres://user:password@localhost:5432/myapp
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_TIMEOUT_MS=5000

# Auth — minimum 32 characters; generate with: openssl rand -hex 32
JWT_SECRET=change-me-generate-with-openssl-rand-hex-32
TOKEN_TTL_SECONDS=3600

# Feature flags
MAINTENANCE_MODE=false
```

### Rule 4.2 — `.env.example` comments explain the variable, not just its name (MUST)

Every variable in `.env.example` has a comment that explains what it controls and, for secrets, how to generate a valid value.

```sh
# Bad — restates the name
# JWT_SECRET=

# Good — explains what it is and how to generate it
# JWT signing secret. Minimum 32 characters.
# Generate with: openssl rand -hex 32
JWT_SECRET=
```

### Rule 4.3 — Never log environment variables or derived config values (MUST)

Config values may contain secrets. Never log the `Config` record, its fields, or the raw `process.env` at any log level — including `debug`.

---

## §5 — Testing

### Rule 5.1 — Tests never mutate `process.env` (MUST)

`process.env` mutation is global state — it affects all concurrent tests and creates order-dependent failures. Pass a plain record to `loadConfig` instead.

```ts
// Good — pass a typed record; no process.env mutation
const config = parseConfig({
  PORT:         '3000',
  DATABASE_URL: 'postgres://localhost:5432/test',
  JWT_SECRET:   'a'.repeat(32),
  // ...
})

// Bad — mutates global state
process.env.DATABASE_URL = 'postgres://localhost:5432/test'
```

### Rule 5.2 — Provide a test config factory (MUST)

A typed factory function in `tests/helpers/` produces valid `Config` values for tests. Tests use overrides to test specific config variations.

```ts
// tests/helpers/config.factory.ts

import { type Config } from '../../src/shared/config'
import { type ConfigError } from '@tsfpp/boundary'

export const makeConfig = (overrides: Partial<Config> = {}): Config => ({
  server: {
    port:     3000,
    host:     '127.0.0.1',
    logLevel: 'error',  // silent in tests
    ...overrides.server,
  },
  database: {
    url:            'postgres://localhost:5432/test',
    poolMin:        1,
    poolMax:        2,
    queryTimeoutMs: 1000,
    ...overrides.database,
  },
  auth: {
    jwtSecret:       'a'.repeat(32),
    tokenTtlSeconds: 3600,
    ...overrides.auth,
  },
  features: {
    maintenanceMode: false,
    ...overrides.features,
  },
  ...overrides,
})
```

### Rule 5.3 — Test the loader itself (MUST)

`loadConfig` must have tests covering: all required variables present (success), each required variable missing (error with that variable named), invalid type (error), and boundary values for numeric constraints.

```ts
describe('loadConfig', () => {
  describe('when all required variables are present and valid', () => {
    it('returns Ok containing the typed Config', () => {
      const env = makeRawEnv()

      const result = loadConfig(env)

      expect(isOk(result)).toBe(true)
    })
  })

  describe('when DATABASE_URL is missing', () => {
    it('returns Err naming the missing variable', () => {
      const env = makeRawEnv({ DATABASE_URL: undefined })

      const result = loadConfig(env)

      expect(isErr(result)).toBe(true)
      expect(result.error).toContain('DATABASE_URL')
    })
  })
})
```

---

## §6 — React and CLI

### Rule 6.1 — React: build-time config via Vite/Next env injection (MUST)

React applications receive configuration at build time through the bundler's environment injection (`import.meta.env` in Vite, `process.env.NEXT_PUBLIC_*` in Next.js). The same principle applies: define a typed `ClientConfig` record, validate it once at module load, and export the validated value.

```ts
// src/shared/client-config.ts

import { z } from 'zod'

const schema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_ENV:          z.enum(['development', 'staging', 'production']),
})

const parsed = schema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Client configuration error:\n${parsed.error.message}`)
}

export const clientConfig = {
  apiBaseUrl: parsed.data.VITE_API_BASE_URL,
  env:        parsed.data.VITE_ENV,
} as const
```

Public client config (visible to the browser) must never contain secrets. The Vite `VITE_` / Next.js `NEXT_PUBLIC_` prefix conventions enforce this by convention; the Zod schema enforces it by declaration.

### Rule 6.2 — CLI: same loader pattern as server (MUST)

CLI tools follow the same pattern as the server: load and validate at the entry point (`cli.ts`), exit with a descriptive error on failure, pass the typed `Config` to all commands.

---

## Appendix A — Audit checklist

- [ ] No `process.env` access outside the config loader
- [ ] No config singleton imported by application modules
- [ ] Config loader uses `loadConfig` from `@tsfpp/boundary`; returns `Result<Config, ConfigError>`; never throws
- [ ] All type coercion (string → number, string → boolean) in Zod schema
- [ ] All validation failures reported together, not sequentially
- [ ] Required secrets validated for minimum length (`min(32)` for symmetric keys)
- [ ] `.env.example` committed; `.env` in `.gitignore`
- [ ] Every variable in `.env.example` has an explanatory comment
- [ ] No config values or `process.env` logged at any level
- [ ] Tests pass plain records to `loadConfig`; never mutate `process.env`
- [ ] Test config factory in `tests/helpers/`
- [ ] Config loader has tests for: valid, each missing required var, invalid type
- [ ] React: `clientConfig` validated at module load; no secrets in client config