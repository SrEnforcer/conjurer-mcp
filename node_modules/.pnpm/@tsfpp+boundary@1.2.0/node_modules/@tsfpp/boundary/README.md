# @tsfpp/boundary

Functional HTTP API primitives for services.

`@tsfpp/boundary` is the canonical runtime companion to [`@tsfpp/standard`](https://github.com/tsfpp/standard). It encodes the patterns described in that standard — typed request context, RFC 9457 error responses, cursor pagination, idempotency, webhook signing, cache semantics, and composable middleware — as a small, dependency-light package of ADTs, smart constructors, and higher-order functions.

It provides:

- **Branded primitives** — `TraceId`, `PrincipalId`, `IdempotencyKey`, `Cursor`, `WebhookEventId`
- **Request context** — `extractContext`, `extractTraceId`, `RequestContext`
- **Validation** — `ValidationError`, `FieldIssue`, `fromZodError`, `mkValidationError`
- **Configuration** — `loadConfig`, `EnvSchema<T>`, `ConfigError`
- **API error taxonomy** — `ApiError` discriminated union, smart constructors, exhaustive mapper
- **Problem Details (RFC 9457)** — `ProblemDetails`, `mkProblem`, `problemResponse`
- **Response builders** — `okResponse`, `createdResponse`, `acceptedResponse`, `noContentResponse`, `redirectResponse`
- **Handler helpers** — `createHandler`, `createJsonHandler`, `parseJsonBody`, `parseJsonWithSchema`, `parsePaginationFromRequest`, `mkNextCursor`
- **Pagination** — `Paginated<T>`, `parsePaginationQuery`, `encodeCursor`, `decodeCursor`, `mkPaginated`
- **Long-running operations** — `Operation<T>`, `mkRunningOp`, `mkSucceededOp`, `mkFailedOp`, `mkCancelledOp`
- **Bulk operations** — `BulkItem<T>`, `BulkResponse<T>`, `mkBulkOkItem`, `mkBulkErrorItem`, `bulkResponse`
- **Rate limiting** — `rateLimitHeaders`, `retryAfterHeader`
- **Security and CORS** — `baselineSecurityHeaders`, `corsHeaders`
- **Idempotency** — `IdempotencyStore` port, `withIdempotency` HOF
- **Observability** — `RequestLog`, `RequestLogger` port, `withRequestLog` HOF
- **Webhooks** — `signWebhook`, `verifyWebhook`, `WebhookSignatureHeaders`
- **Cache headers** — `CachePolicy`, `cacheHeaders`
- **Handler types** — `RawHandler`, `HandlerFactory<Deps>`

One peer dependency (`@tsfpp/prelude`). Zero others. Framework-agnostic — works with any Fetch API–compatible runtime.

## What Is New

- Internal boundary implementation is now split into focused modules (`boundary-types`, `boundary-response`, `boundary-operations`, `boundary-idempotency`, `boundary-webhook`, `boundary-node`) with the same public barrel surface.
- Problem-details construction now uses the object form:
  - `mkProblem({ status, code, title, traceId, opts })`
- Recipes and examples in this package follow the current API shape and middleware composition order.

---

## Installation

```sh
pnpm add @tsfpp/boundary @tsfpp/prelude
```

Zod is the recommended schema validator at the transport boundary and is used in all examples, but it is not a hard dependency of this package:

```sh
pnpm add zod
```

**Runtime requirements.** Requires `globalThis.crypto.subtle` (Web Crypto API). Available natively in Node ≥ 20, Bun, Deno, and all major edge runtimes. For Node 18 add:

```ts
import { webcrypto } from 'node:crypto';
(globalThis as { crypto?: unknown }).crypto = webcrypto;
```

---

## Quick start

A complete, production-shaped handler in one file. Parse → validate → use case → respond, with middleware composed via `pipe`.

```ts
import {
  createJsonHandler,
  type HandlerFactory,
  type IdempotencyStore,
  type RawHandler,
  type RequestLogger,
  createdResponse,
  withIdempotency,
  withRequestLog,
} from '@tsfpp/boundary';
import { err, isErr, ok, pipe } from '@tsfpp/prelude';
import { z } from 'zod';

// ── Schema ────────────────────────────────────────────────────────────────────

const createOrderBody = z.object({
  customerId:  z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency:    z.string().length(3),
}).strict();

// ── Domain port ───────────────────────────────────────────────────────────────

type Order = {
  readonly id: string;
  readonly customerId: string;
  readonly amountCents: number;
  readonly currency: string;
};

type OrderRepository = {
  readonly create: (input: z.infer<typeof createOrderBody>) => Promise<import('@tsfpp/prelude').Result<Order, import('@tsfpp/boundary').ApiError>>;
};

// ── Handler factory ───────────────────────────────────────────────────────────

export const createOrderHandler: HandlerFactory<{ readonly orders: OrderRepository }> =
  (deps) => createJsonHandler({
    deps,
    routeTemplate: '/v1/orders',
    schema: createOrderBody,
    handle: async ({ deps: resolvedDeps, ctx, body }) => {
      const result = await resolvedDeps.orders.create(body);
      if (isErr(result)) return err(result.error);

      const order = result.value;
      return ok(createdResponse(order, `/v1/orders/${order.id}`, { 'X-Request-Id': ctx.traceId }));
    },
  });

// ── Compose middleware with pipe ──────────────────────────────────────────────

export const makeCreateOrderRoute = (
  deps: { readonly orders: OrderRepository },
  store: IdempotencyStore,
  logger: RequestLogger,
): RawHandler =>
  pipe(
    createOrderHandler(deps),          // innermost: business logic
    withIdempotency(store),            // wraps: idempotency check and replay
    withRequestLog(logger, '/v1/orders'), // outermost: structured request log
  );
```

---

## Core exports

### Context and tracing

| Export | Description |
|---|---|
| `RequestContext` | Type — trace ID, principal, idempotency key, method, URL, route template |
| `extractContext(req, routeTemplate)` | Builds a `RequestContext` from a `Request`. Call at the top of every handler. |
| `extractTraceId(req)` | Reads `traceparent` / `x-request-id` / `x-trace-id`; generates a UUID fallback. |
| `TraceId` | Branded `string` — opaque correlation identifier |
| `PrincipalId` | Branded `string` — validated authenticated actor |
| `IdempotencyKey` | Branded `string` — validated client-generated idempotency key |
| `Cursor` | Branded `string` — opaque pagination cursor |
| `WebhookEventId` | Branded `string` — unique webhook delivery identifier |
| `mkTraceId(raw)` | `string → Option<TraceId>` |
| `mkPrincipalId(raw)` | `string → Option<PrincipalId>` |
| `mkIdempotencyKey(raw)` | `string → Option<IdempotencyKey>` — validates `[A-Za-z0-9_-]{1,255}` |
| `mkWebhookEventId(raw)` | `string → Option<WebhookEventId>` |

### Validation

| Export | Description |
|---|---|
| `FieldIssue` | Type — `{ field: string; issue: string }` |
| `ValidationError` | Type — `{ kind: 'validation'; issues: ReadonlyArray<FieldIssue>; message: string }` |
| `fromZodError(zodError)` | Converts a `ZodError` to `ValidationError`. Accepts any structurally compatible error — no hard Zod import. |
| `mkValidationError(issues, message?)` | Constructs a `ValidationError` from field issues directly. |

### Configuration

| Export | Description |
|---|---|
| `EnvSchema<T>` | Structural type for Zod-style schemas that support `safeParse`. |
| `ConfigError` | Type — `{ kind: 'config_invalid'; issues; summary }` returned when env parsing fails. |
| `loadConfig(schema, env)` | Validates and coerces environment values once at app startup. Returns `Result<T, ConfigError>` and never throws. |

Use `loadConfig` at process entry (for example `main.ts` or `server.ts`) and pass typed config records into adapters and handlers. This keeps raw `process.env` out of application code.

### API error taxonomy

`ApiError` is a closed discriminated union. Every variant maps to a specific HTTP status code and a stable Problem Details `code`. The exhaustive mapper `apiErrorToResponse` witnesses every variant with `absurd` — adding a new variant produces a compile error at the mapper.

```ts
type ApiError =
  | ValidationError                                                           // → 422
  | { kind: 'not_found';       resource: string;  id: string }               // → 404
  | { kind: 'conflict';        detail: string }                               // → 409
  | { kind: 'permission';      required: string }                             // → 403
  | { kind: 'unauthenticated'; scheme: string }                               // → 401
  | { kind: 'rate_limit';      retryAfterSeconds: number }                    // → 429
  | { kind: 'precondition';    detail: string }                               // → 412
  | { kind: 'gone';            resource: string }                             // → 410
  | { kind: 'dependency';      dependency: string; cause: unknown }           // → 502
  | { kind: 'internal';        cause: unknown };                              // → 500
```

Smart constructors: `validationError`, `notFoundError`, `conflictError`, `permissionError`, `unauthenticatedError`, `rateLimitError`, `preconditionError`, `goneError`, `dependencyError`, `internalError`.

Extend with application-specific variants without modifying `ApiError` — see [Usage idioms](#usage-idioms).

### Problem Details (RFC 9457)

| Export | Description |
|---|---|
| `ProblemDetails` | Type — RFC 9457 body shape with `type`, `title`, `status`, `code`, `detail`, `instance`, `traceId`, `errors` |
| `mkProblem({ status, code, title, traceId, opts? })` | Constructs a `ProblemDetails` object. `type` defaults to `'about:blank'`. |
| `problemResponse(problem, headers?)` | Wraps `ProblemDetails` in a `Response` with `Content-Type: application/problem+json`. |

### Response builders

| Export | Description |
|---|---|
| `okResponse(body, headers?)` | `200 OK` with JSON body |
| `createdResponse(body, location, headers?)` | `201 Created` with JSON body and `Location` header |
| `acceptedResponse(operation, location, headers?)` | `202 Accepted` with `Operation<T>` body and `Location` header |
| `noContentResponse(headers?)` | `204 No Content` — no body |
| `redirectResponse(status, location, headers?)` | `301 \| 302 \| 307 \| 308` with `Location` header |
| `jsonResponse(status, body, headers?)` | Generic JSON response — use when none of the above fit |

### Error mapping

| Export | Description |
|---|---|
| `apiErrorToProblem(error, ctx)` | Maps `ApiError` → `ProblemDetails`. Exhaustive; never leaks `cause`. |
| `apiErrorToResponse(error, ctx)` | Maps `ApiError` → `Response`. Adds `WWW-Authenticate` on `unauthenticated`, `Retry-After` on `rate_limit`. |
| `ErrorMapper<E>` | Type — `(error: E, ctx) => Response`. Use when extending `ApiError`. |

### Pagination

| Export | Description |
|---|---|
| `Paginated<T>` | Type — `{ items, nextCursor, totalCount }` |
| `PageQuery` | Type — `{ limit: number; cursor: Cursor \| null }` |
| `mkPaginated(items, nextCursor, totalCount?)` | Constructs a `Paginated<T>` response body |
| `parsePaginationQuery(url, maxLimit?)` | Validates `limit` and `cursor` from a URL's query string → `Result<PageQuery, ValidationError>` |
| `encodeCursor(payload)` | Encodes a record as an opaque base64url `Cursor` |
| `decodeCursor(cursor)` | Decodes a `Cursor` back to its payload → `Option<Record<string, unknown>>` |

### Long-running operations

| Export | Description |
|---|---|
| `Operation<T>` | Discriminated union — `running \| succeeded \| failed \| cancelled` |
| `mkRunningOp(operationId, progress?)` | Constructs a `running` operation |
| `mkSucceededOp(operationId, result, createdAt)` | Constructs a `succeeded` operation |
| `mkFailedOp(operationId, error, createdAt)` | Constructs a `failed` operation |
| `mkCancelledOp(operationId, createdAt)` | Constructs a `cancelled` operation |

### Bulk operations

| Export | Description |
|---|---|
| `BulkItem<T>` | Discriminated union — `ok` (200/201) or `error` (4xx/5xx) |
| `BulkResponse<T>` | Type — `{ items: ReadonlyArray<BulkItem<T>> }` |
| `mkBulkOkItem(body, status?)` | Constructs a successful `BulkItem` |
| `mkBulkErrorItem(problem)` | Constructs a failed `BulkItem` from a `ProblemDetails` |
| `bulkResponse(items)` | `207 Multi-Status` response |

### Rate limiting

| Export | Description |
|---|---|
| `RateLimitState` | Type — `{ limit, remaining, resetAt }` |
| `rateLimitHeaders(state)` | Builds `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers |
| `retryAfterHeader(seconds)` | Builds `Retry-After` header — combine with `rateLimitHeaders` on 429 |

### Security and CORS

| Export | Description |
|---|---|
| `baselineSecurityHeaders` | `Readonly<Record<string, string>>` — `HSTS`, `CSP`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Cache-Control: no-store` |
| `corsHeaders(allowedOrigins, requestOrigin, opts?)` | Builds `Access-Control-*` headers from a static allow-list. Returns `{}` for unlisted origins. Never reflects `Origin` blindly. Always sets `Vary: Origin`. |

### Idempotency

| Export | Description |
|---|---|
| `IdempotencyLookup` | Discriminated union — `first_request \| replay \| in_flight \| key_conflict` |
| `StoredResponse` | Type — serialisable response snapshot for replay |
| `IdempotencyStore` | Port (interface) — `check`, `markInFlight`, `store`. Implement with Redis, Postgres, or any durable store. |
| `withIdempotency(store)` | `(RawHandler) → RawHandler` HOF — full idempotency lifecycle |

### Observability

| Export | Description |
|---|---|
| `RequestLog` | Type — structured log entry with `traceId`, `routeTemplate`, `status`, `durationMs`, and more |
| `RequestLogger` | Port (interface) — `info` and `error` methods. Implement with pino, winston, or any structured logger. |
| `withRequestLog(logger, routeTemplate)` | `(RawHandler) → RawHandler` HOF — emits one structured log entry per request |

### Webhooks

| Export | Description |
|---|---|
| `WebhookSignatureHeaders` | Type — `x-webhook-id`, `x-webhook-timestamp`, `x-webhook-signature` |
| `signWebhook(secret, id, body)` | HMAC-SHA256 over `{timestamp}.{body}`. Returns `WebhookSignatureHeaders`. |
| `verifyWebhook(secret, headers, body, maxAge?)` | Verifies signature and timestamp recency (default 5-minute window). Constant-time comparison. |

### Cache headers

| Export | Description |
|---|---|
| `CachePolicy` | Union — `'no-store' \| 'private-revalidate' \| 'public-short' \| 'public-long' \| 'immutable'` |
| `cacheHeaders(policy, etag?)` | Returns `Cache-Control` and (optionally) `ETag` headers for the given policy |

### Handler types

| Export | Description |
|---|---|
| `RawHandler` | `(req: Request) => Promise<Response>` |
| `HandlerFactory<Deps>` | `(deps: Deps) => RawHandler` — the canonical handler export shape |

---

## Why `@tsfpp/boundary`?

Every HTTP API project that skips a purpose-built boundary layer ends up building one anyway — scattered across utility files, middleware functions, and one-off helpers, with inconsistent error shapes, missing trace IDs on some paths, unguarded `as` casts from `unknown`, and no shared vocabulary for status codes. `@tsfpp/boundary` encodes those conventions once, makes them composable, and makes deviations visible.

### vs hand-rolling per-handler validation and error mapping

Without a shared error taxonomy, each handler author makes independent decisions: which status to return for a missing record, whether to include a `traceId` in the error body, whether to add `WWW-Authenticate` on 401, whether the error payload is `{ message }` or `{ error }` or `{ detail }`. Over ten handlers, ten different answers emerge. `@tsfpp/boundary` provides one answer for each of these questions, derived from RFC 9110, RFC 9457, and the API coding standard, enforced by the type system.

### vs tRPC

tRPC excels when server and client live in the same TypeScript monorepo and the same team controls both. Type safety is derived directly from the router's TypeScript types — no schema, no contract file. That inference breaks the moment a third party, a different language, or a different team becomes the consumer: they cannot import your TypeScript types. `@tsfpp/boundary` targets APIs that are externally consumed or independently versioned. It is contract-first (OpenAPI or equivalent), not inference-first, and produces `application/problem+json` errors that any HTTP client can consume.

### vs ts-rest

ts-rest defines a shared contract object in TypeScript that both the server implementation and the client use to validate requests and responses end-to-end. It is a good fit for TypeScript-to-TypeScript internal APIs where both sides are in your control. `@tsfpp/boundary` operates at a different level: it provides the primitives — ADTs, HOFs, response builders — that you use to implement a handler. The two are complementary: use ts-rest to define the contract shape; use `@tsfpp/boundary` for the implementation-side primitives that enforce it.

### vs NestJS + class-validator

NestJS is a full application framework. Its decorator-based, class-oriented approach couples domain models to framework concerns and requires inheritance hierarchies for request validation and response transformation. `@tsfpp/boundary` is framework-agnostic: it works with Hono, Bun's native `Bun.serve`, Deno's `Deno.serve`, Cloudflare Workers, Next.js Route Handlers, or any other Fetch API–compatible runtime. No decorators. No classes. No framework lock-in.

### vs Zod alone

Zod solves one problem precisely: asserting that a runtime value matches a schema. It has no opinion on how `ZodError` maps to an HTTP status code, what the error response body looks like, how to propagate a trace ID, or how to structure an idempotency check. `@tsfpp/boundary` uses Zod at the boundary via `fromZodError` — which accepts any structurally compatible error, not a hard Zod import — and provides everything from that point onward. They are complementary; both belong in the same codebase.

### What this package uniquely provides

- A **closed, exhaustive error taxonomy** as a discriminated union. Adding a new error variant produces a compile error at the mapper — the system tells you where to make a decision.
- **RFC 9457 Problem Details** as the error response standard — not a bespoke envelope. Machine-readable `code` fields for client branching; stable `type` URIs for contract documentation.
- **Middleware as composable HOFs**, not as framework-specific `app.use()` calls. `withIdempotency` and `withRequestLog` are `(RawHandler) → RawHandler` — they compose with `pipe` from `@tsfpp/prelude` and add no framework coupling.
- **Idempotency as a port** — the `IdempotencyStore` interface decouples the protocol (check / mark-in-flight / store) from any specific store implementation (Redis, Postgres, in-memory).
- **`kind` as the discriminant** for all domain ADTs in this package, consistent with the TSF++ convention for application-level discriminated unions.
- **A complete webhook contract** — sign on send, verify on receive, constant-time comparison, timestamp-in-signature replay protection — in two functions.

---

## Usage idioms

### Always call `extractContext` before any logic

`extractContext` extracts or generates the trace ID, reads the principal and idempotency key, and captures the method and URL. Call it at the very top of every handler — before validation, before early exits, before anything else. If an early exit produces an error response, that response still needs a `traceId` for `ProblemDetails.traceId` and the `X-Request-Id` echo header.

```ts
// Yes — context available for all response paths
export const handler: RawHandler = async (req) => {
  const ctx = extractContext(req, '/v1/orders/:id');
  if (someEarlyCondition) return apiErrorToResponse(notFoundError('order', id), ctx);
  // ...
};

// No — error response has no traceId
export const handler: RawHandler = async (req) => {
  if (someEarlyCondition) return new Response(null, { status: 404 });
  const ctx = extractContext(req, '/v1/orders/:id');
  // ...
};
```

### Parse schema first, map to domain types second

Schema validation (Zod) and domain validation (smart constructors) are separate concerns at separate layers. Schema validation asserts structural correctness — the right fields, the right types. Domain validation enforces invariants that schema cannot express — a legal name must not start with a digit, or a customer account must be active before accepting an order.

```ts
// Layer 1 — schema (transport concern)
const parsed = createCustomerBody.safeParse(raw);
if (!parsed.success) return apiErrorToResponse(fromZodError(parsed.error), ctx);

// Layer 2 — domain invariants
const legalName = mkCustomerName(parsed.data.legalName);
if (isErr(legalName)) return apiErrorToResponse(legalName.error, ctx);
```

Merging them — putting domain rules inside Zod's `.refine()` — couples domain logic to the transport library and makes invariants invisible to the domain model.

### Map errors at exactly one boundary

All errors — validation failures, not-found, conflicts, dependency failures — flow to one function: `apiErrorToResponse`. There is no scattering of `new Response(null, { status: 404 })` across the codebase. One boundary, one shape, one place to change.

```ts
// Yes — one exit point for all errors
const result = await deps.orders.findById(id);
if (isErr(result)) return apiErrorToResponse(result.error, ctx);

// No — ad-hoc response bypasses the taxonomy and RFC 9457 shape
if (isErr(result)) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
```

### Compose middleware with `pipe`, not by nesting calls

`withIdempotency` and `withRequestLog` are both `(RawHandler) → RawHandler`. They compose left-to-right with `pipe`, which reads in execution order. Nesting HOF calls produces the same result but reads inside-out.

```ts
// Yes — left-to-right, reads in execution order
const handler = pipe(
  baseHandler,
  withIdempotency(store),
  withRequestLog(logger, '/v1/orders'),
);

// No — reads inside-out, easy to mis-order
const handler = withRequestLog(logger, '/v1/orders')(withIdempotency(store)(baseHandler));
```

Middleware order matters: place `withRequestLog` outermost so that replayed idempotency responses are also logged.

### Export handlers as `HandlerFactory<Deps>`, never as module-level singletons

```ts
// Yes — deps are explicit, substitutable in tests
export const createOrderHandler: HandlerFactory<{ readonly orders: OrderRepository }> =
  (deps) => async (req) => { /* ... */ };

// No — adapter is coupled at import time, cannot be replaced without module mocking
import { db } from '../db';
export const createOrderHandler: RawHandler = async (req) => {
  const result = await db.orders.create(/* ... */);
  /* ... */
};
```

A `HandlerFactory<Deps>` closes over injected ports (interfaces, not implementations). The router wires dependencies. Tests substitute them. The handler stays pure with respect to its dependencies.

### Echo `traceId` in the `X-Request-Id` response header

Every success response should carry the trace ID so clients can correlate their logs with server logs. `apiErrorToResponse` includes `traceId` in the Problem Details body; success responses need the header added manually.

```ts
return createdResponse(order, `/v1/orders/${order.id}`, { 'X-Request-Id': ctx.traceId });
```

### Extend `ApiError` rather than modifying it

Application-specific error variants live alongside `ApiError` in a union type. Delegate canonical variants to `apiErrorToResponse`; handle app-specific variants before the delegation.

```ts
type AppError = ApiError | { readonly kind: 'quota_exceeded'; readonly quota: string };

const appErrorToResponse: ErrorMapper<AppError> = (error, ctx) => {
  if (error.kind === 'quota_exceeded') {
    return problemResponse(
      mkProblem({
        status: 429,
        code: 'quota_exceeded',
        title: `${error.quota} quota exceeded`,
        traceId: ctx.traceId,
        opts: { instance: ctx.url },
      }),
    );
  }
  return apiErrorToResponse(error, ctx);
};
```

### Use `kind` as the discriminant for application ADTs

`@tsfpp/prelude` uses `_tag` as the discriminant for its internal ADTs (`Option`, `Result`, `List`). Application-level ADTs — including `ApiError` and all domain types — use `kind`. This keeps the namespaces distinct and makes it immediately clear whether a given union is a prelude primitive or a domain concept.

```ts
// Prelude ADT — use the exported type guards (isSome, isOk), not _tag directly
if (isSome(option)) { /* ... */ }
if (isOk(result))   { /* ... */ }

// Domain ADT — switch on kind
switch (error.kind) {
  case 'not_found': return /* ... */;
  case 'conflict':  return /* ... */;
  default:          return absurd(error);
}
```

---

## Architecture

`@tsfpp/boundary` is the **boundary layer** in a hexagonal (ports-and-adapters) architecture. It sits between the HTTP transport and the domain core. It knows about HTTP; it does not know about databases, message queues, or any other infrastructure.

```
  ┌─────────────────────────────────────────────────────────┐
  │  Framework / router                                     │
  │  (Hono, Bun.serve, Deno.serve, Next.js route handler)  │
  ├─────────────────────────────────────────────────────────┤
  │  @tsfpp/boundary                                        │
  │  extractContext · fromZodError · apiErrorToResponse     │
  │  Response builders · withIdempotency · withRequestLog   │
  ├─────────────────────────────────────────────────────────┤
  │  Use-case layer                                         │
  │  (pure orchestration; returns Result<Output, ApiError>) │
  ├─────────────────────────────────────────────────────────┤
  │  Domain core (pure)                                     │
  │  (entities, value objects, smart constructors)          │
  ├─────────────────────────────────────────────────────────┤
  │  Adapters (infrastructure)                              │
  │  (DB, cache, queue — implement ports; use tryCatchAsync)│
  └─────────────────────────────────────────────────────────┘
```

The handler is a thin adapter: parse → map to domain → invoke use case → map back to HTTP. Business logic is not in the handler. `@tsfpp/boundary` provides the vocabulary for the parse and map-back steps; `@tsfpp/prelude` provides `tryCatchAsync` and `flatMapAsync` for the adapter and use-case steps.

---

## Further reading

- [`RECIPES.md`](./RECIPES.md) — 15 worked patterns with rationale and trade-offs
- [`@tsfpp/standard`](https://github.com/tsfpp/standard) — the normative TSF++ coding standard this package is built against.
- [`@tsfpp/prelude`](https://www.npmjs.com/package/@tsfpp/prelude) — the functional core this package builds on

---

## Scripts

```sh
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run test:coverage
```

---

## Release process

Releases are automated with Release Please.

1. Use Conventional Commits in merged PRs.
2. Release Please opens or updates a release PR on each merge to `main`.
3. Merging the release PR publishes to npm, creates a GitHub release, and updates `CHANGELOG.md`.

See `.github/workflows/release-please.yml` and `release-please-config.json`.

---

## License

MIT