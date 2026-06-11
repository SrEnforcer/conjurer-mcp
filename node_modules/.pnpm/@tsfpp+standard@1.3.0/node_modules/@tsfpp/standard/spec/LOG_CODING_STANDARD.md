# LOG_CODING_STANDARD.md — Structured Logging Standard

This standard is mandatory for all logging code, logger implementations, and log-related configuration in the repository. English only.
Codename TSF++/Log (tsfpp-log)

**Version:** 1.0.0
**Date:** 2026-05-18
**Classification:** Normative — repository-wide
**Status:** Cross-cutting profile of TSF++ (`CODING_STANDARD.md`)
**Applies to:** All layers — core, api, dal, react, cli

---

## Preamble

### Why a logging standard?

Logging is the primary observability mechanism for production systems. A log entry that is hard to find, hard to parse, or hard to trust is worse than no log at all — it costs time without providing information.

TSF++ logging is structured, typed, intentional, and minimal. A log entry answers a specific operational question. It never leaks sensitive data. It is always correlated to a request via `traceId`. It is always written through a typed port, never through a global `console.*` call.

The standard follows the same logic as the rest of TSF++: make the correct thing easy and the incorrect thing a compile-time or lint error.

### The Logger port

A logger is a **port** — an interface defined in the domain, implemented in an adapter. The domain never depends on a logging library. It depends on the `Logger` interface. The adapter wires in `pino`, `winston`, or any other library at startup.

HTTP request logging is handled by `@tsfpp/boundary`'s `withRequestLog` HOF, which uses the `RequestLogger` port. Application-level logging (domain events, use-case outcomes, adapter errors) uses the `Logger` port from `@tsfpp/prelude`.

---

## §1 — The Logger port

### Rule 1.1 — Logger is a port, not a concrete dependency (MUST)

The `Logger`, `LogEntry`, and `LogLevel` types are exported from `@tsfpp/prelude`. Import from there; never import a logger implementation directly in core, use-case, or DAL code.

```ts
import { type Logger, type LogEntry, type LogLevel } from '@tsfpp/prelude'
```

`Logger`, `LogEntry`, and `LogLevel` are defined in `@tsfpp/prelude`. Do not redefine them locally. The pino adapter and `silentLogger` implementations live in the infrastructure layer — see the `@tsfpp/prelude` JSDoc for the canonical implementation examples.

### Rule 1.2 — Logger is injected, never imported (MUST)

Use-cases, repositories, and handlers receive a `Logger` as a dependency. Never import a logger instance from a module.

```ts
// Good — Logger injected as part of Deps
type Deps = {
  readonly users:  UserRepository
  readonly logger: Logger
}

const createUser = (deps: Deps) => async (input: CreateUserInput): Promise<Result<User, CreateUserError>> => {
  const result = await deps.users.save(input)
  pipe(
    result,
    tap(user  => deps.logger.info({ message: 'user.created', traceId: input.traceId, userId: user.id })),
    tapErr(err => deps.logger.error({ message: 'user.create.failed', code: err.code, traceId: input.traceId })),
  )
  return result
}

// Bad — imported logger couples the use-case to an implementation
import { logger } from '../infrastructure/logger'
```

### Rule 1.3 — `console.*` is forbidden in all layers except the startup boundary (MUST)

`console.log`, `console.error`, `console.warn`, and `console.info` are forbidden in all application code. They produce unstructured output, cannot be routed, filtered, or enriched by the logging infrastructure.

Exception: the application entry point (`main.ts`, `server.ts`) may use `console.error` to report fatal startup failures before the logger is initialised.

```ts
// Bad — anywhere in application code
console.log('User created:', user.id)
console.error('Something went wrong:', err)

// Good — use the injected logger
deps.logger.info({ message: 'user.created', userId: user.id, traceId: ctx.traceId })
deps.logger.error({ message: 'user.create.failed', code: err.code, traceId: ctx.traceId })
```

ESLint: configure `no-console` to error everywhere except `src/main.ts` and `src/server.ts`.

---

## §2 — Log levels

### Rule 2.1 — Level semantics (MUST)

| Level | Use when |
|---|---|
| `debug` | Detailed diagnostic information useful during development. Disabled in production by default. Never log PII at any level, including debug. |
| `info` | A significant, expected domain event occurred. A user was created. A payment was processed. An export completed. One info entry per meaningful business event. |
| `warn` | An unexpected but recoverable condition. A retry was triggered. A rate limit was approached. A deprecated API was called. |
| `error` | A failure that requires attention. An operation failed after all retries. A dependency was unreachable. An unhandled `Err` reached a boundary. |

### Rule 2.2 — Do not log intermediate steps at `info` (MUST)

`info` is for business events, not execution steps. Tracing execution flow is the job of `debug` or a distributed tracing system, not `info` logs.

```ts
// Bad — execution trace at info level
deps.logger.info({ message: 'Calling user repository' })
const user = await deps.users.findById(id)
deps.logger.info({ message: 'User repository returned' })

// Good — one info entry for the outcome
const user = await deps.users.findById(id)
if (isNone(user)) deps.logger.warn({ message: 'user.not_found', userId: id, traceId })
```

### Rule 2.3 — Log errors at `error`, not at `warn` (MUST)

If the operation failed and the caller must be notified, log at `error`. If the operation is continuing but something unexpected happened, log at `warn`.

```ts
// Bad — error logged at warn
if (isErr(result)) {
  deps.logger.warn({ message: 'Could not fetch user preferences', code: result.error.code })
}

// Good
if (isErr(result)) {
  deps.logger.error({ message: 'user.preferences.fetch_failed', code: result.error.code, traceId })
}
```

---

## §3 — Structured log fields

### Rule 3.1 — `message` is a dot-separated event name (MUST)

The `message` field is machine-readable. Use dot-separated noun-verb pairs that describe the event:

```
<domain>.<entity>.<event>
```

```ts
// Good — machine-readable event names
{ message: 'user.created' }
{ message: 'payment.authorisation.failed' }
{ message: 'session.expired' }
{ message: 'export.csv.completed' }

// Bad — human-readable prose
{ message: 'User was successfully created' }
{ message: 'Something went wrong with the payment' }
```

### Rule 3.2 — Always include `traceId` in request-scoped logs (MUST)

Every log entry produced within a request context must include the `traceId` from `extractContext`. This is the primary correlation handle across logs, APM tools, and error trackers.

```ts
deps.logger.info({
  message:  'user.created',
  traceId:  ctx.traceId,   // always
  userId:   user.id,
})
```

### Rule 3.3 — Include `code` on every error log (MUST)

Every `error`-level log must include a `code` field — the machine-readable error code. Never log only a human-readable message for an error.

```ts
// Good
deps.logger.error({ message: 'payment.charge.failed', code: 'card_declined', traceId })

// Bad — no machine-readable code
deps.logger.error({ message: 'The card was declined' })
```

### Rule 3.4 — Log `cause` before discarding it (MUST)

When a `dependency` or `internal` `ApiError` is passed to `apiErrorToResponse`, the `cause` field is stripped from the response. It must be logged at `error` level before the call:

```ts
if (isErr(result) && result.error.kind === 'dependency') {
  deps.logger.error({
    message:  'payment.gateway.unreachable',
    code:     'dependency_error',
    error:    String(result.error.cause),
    traceId:  ctx.traceId,
  })
  return apiErrorToResponse(result.error, ctx)  // cause is stripped here
}
```

### Rule 3.5 — `duration` for operations with performance budgets (SHOULD)

Log the duration in milliseconds for any operation with a known performance budget: external API calls, database queries, file operations.

```ts
const start = Date.now()
const result = await deps.payments.charge(input)
deps.logger.info({
  message:  'payment.charge.completed',
  duration: Date.now() - start,
  traceId:  ctx.traceId,
})
```

### Rule 3.6 — Additional fields are allowed; follow the type (MUST)

The `LogEntry` index signature (`[key: string]: unknown`) allows arbitrary additional fields. Use typed, camelCase field names. Never use nested objects — flat structure is easier to query in log aggregators.

```ts
// Good — flat, typed fields
{
  message:     'order.fulfilled',
  traceId:     ctx.traceId,
  orderId:     order.id,
  itemCount:   order.items.length,
  totalAmount: order.total,
}

// Bad — nested object
{
  message: 'order.fulfilled',
  order:   { id: order.id, items: order.items, total: order.total },
}
```

---

## §4 — What never to log

### Rule 4.1 — Never log PII (MUST)

Personally identifiable information must never appear in log output at any level, including `debug`:

- Full names, email addresses, phone numbers
- Physical addresses, IP addresses (unless specifically required for security audit logs and explicitly documented)
- National identification numbers, passport numbers
- Payment card numbers, bank account details
- Passwords, secrets, API keys, tokens, session IDs
- Any combination of fields that uniquely identifies a person

Log the system's identifier for the user (`userId`, `principalId`) — never the user's personal data.

```ts
// Bad — logs PII
deps.logger.info({ message: 'user.registered', email: input.email, name: input.name })

// Good — logs only the system identifier
deps.logger.info({ message: 'user.registered', userId: user.id, traceId })
```

### Rule 4.2 — Never log credentials or secrets (MUST)

Tokens, passwords, API keys, connection strings, and private keys must never appear in log output. Never log the full `Authorization` header. Never log request bodies that may contain credentials.

### Rule 4.3 — Never log full request or response bodies at `info` (MUST)

Full request and response bodies may contain PII or sensitive data. Do not log them at `info` or above. Structured field logging of safe, known fields is acceptable.

### Rule 4.4 — Never log stack traces in production (SHOULD)

Stack traces are verbose, contain file paths and line numbers that aid attackers, and are not queryable in log aggregators. Log the error `message` and `code`. Stack traces are available in development via `debug` level and in error tracking tools.

```ts
// Bad — stack trace in production log
deps.logger.error({ message: 'db.query.failed', error: err.stack })

// Good — message and code only
deps.logger.error({ message: 'db.query.failed', error: err.message, code: 'db_error', traceId })
```

---

## §5 — HTTP request logging

### Rule 5.1 — Use `withRequestLog` for all HTTP request logging (MUST)

HTTP request logging is handled exclusively by the `withRequestLog` HOF from `@tsfpp/boundary`. Never add manual request/response logging to handler code.

```ts
const handler = pipe(
  createUserHandler(deps),
  withIdempotency(idempotencyStore),
  withRequestLog(logger, '/v1/users'),  // handles all request logging
)
```

### Rule 5.2 — `routeTemplate` must be the parameterised path (MUST)

Pass the parameterised route template (`/v1/users/:id`), never the resolved URL (`/v1/users/usr-00123`). Resolved URLs create unbounded log-index cardinality.

```ts
// Good
withRequestLog(logger, '/v1/users/:id')

// Bad — resolved URL blows up log index cardinality
withRequestLog(logger, `/v1/users/${userId}`)
```

### Rule 5.3 — Do not duplicate request logging in the handler body (MUST)

`withRequestLog` already emits one structured log entry per request. Never add additional `info` entries that describe the request or response inside the handler body.

---

## §6 — Logger implementation

### Rule 6.1 — Use structured JSON output in production (MUST)

The production logger implementation must emit newline-delimited JSON. Human-readable pretty-printed output is permitted in development only.

```ts
// src/infrastructure/logger.ts — pino implementation example

import pino from 'pino'
import { type Logger } from '@tsfpp/prelude'

const pinoInstance = pino({
  level:      process.env.LOG_LEVEL ?? 'info',
  transport:  process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
})

export const logger: Logger = {
  debug: (entry) => pinoInstance.debug(entry, entry.message),
  info:  (entry) => pinoInstance.info(entry, entry.message),
  warn:  (entry) => pinoInstance.warn(entry, entry.message),
  error: (entry) => pinoInstance.error(entry, entry.message),
}
```

### Rule 6.2 — Log level is configurable via environment (MUST)

The active log level must be configurable without a code change. Read from an environment variable at startup, validated via the config standard.

```ts
const LOG_LEVEL = z.enum(['debug', 'info', 'warn', 'error']).default('info')
const level = LOG_LEVEL.parse(process.env.LOG_LEVEL)
```

### Rule 6.3 — Provide a silent logger for tests (MUST)

Tests that instantiate use-cases or repositories must receive a no-op logger — not the production logger. This prevents test output pollution.

```ts
// tests/helpers/silent-logger.ts
import { type Logger } from '@tsfpp/prelude'

export const silentLogger: Logger = {
  debug: () => undefined,
  info:  () => undefined,
  warn:  () => undefined,
  error: () => undefined,
}
```

---

## §7 — Log entry per layer

### Rule 7.1 — Core and use-case layer

Log business events at `info` and error outcomes at `error`. Use `tap` / `tapErr` inside pipelines; never break the pipeline to log.

```ts
const result = await pipe(
  validateInput(input),
  flatMap(createUser(deps.users)),
  tap(user  => deps.logger.info({ message: 'user.created', userId: user.id, traceId })),
  tapErr(err => deps.logger.error({ message: 'user.create.failed', code: err.code, traceId })),
)
```

### Rule 7.2 — DAL / adapter layer

Log all third-party failures at `error` with the raw error message (not the stack) and the operation name. Log slow queries at `warn` when duration exceeds the performance budget.

```ts
const result = await tryCatchAsync(
  () => db.query(sql, params),
  (e) => {
    deps.logger.error({ message: 'db.query.failed', error: String(e), traceId })
    return mkDbError(e)
  },
)

if (isOk(result) && duration > QUERY_BUDGET_MS) {
  deps.logger.warn({ message: 'db.query.slow', duration, traceId })
}
```

### Rule 7.3 — API / handler layer

Do not log in handler bodies. `withRequestLog` handles all HTTP-level logging. Log `cause` before calling `apiErrorToResponse` on `dependency` and `internal` errors.

### Rule 7.4 — React / CLI layer

React components and CLI commands must not log directly. Side effects are isolated at the adapter boundary. Use the injected `Logger` only in adapter code (API clients, CLI output formatters).

---

## Appendix A — Audit checklist

- [ ] No `console.*` calls outside `src/main.ts` / `src/server.ts`
- [ ] `Logger` injected as a dependency; never imported directly
- [ ] All `message` fields use dot-separated event-name format
- [ ] Every request-scoped log includes `traceId`
- [ ] Every `error`-level log includes `code`
- [ ] `cause` logged before `apiErrorToResponse` on `dependency` / `internal` errors
- [ ] No PII in any log field at any level
- [ ] No credentials, tokens, or secrets in any log field
- [ ] No full request or response bodies at `info` or above
- [ ] No stack traces in production log output
- [ ] `withRequestLog` used for HTTP request logging; no manual request/response logging in handlers
- [ ] `routeTemplate` is parameterised, not resolved
- [ ] Pipelines use `tap` / `tapErr` for logging; pipeline not broken for a log call
- [ ] Test dependencies receive `silentLogger`, not the production logger
- [ ] Production logger emits newline-delimited JSON
- [ ] Log level configurable via environment variable