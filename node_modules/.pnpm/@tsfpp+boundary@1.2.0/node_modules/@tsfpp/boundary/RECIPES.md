# Boundary recipes

Practical patterns for composing `@tsfpp/boundary` in Fetch API–compatible handlers. Each recipe includes working code, the reasoning behind the pattern, and the trade-offs of alternatives.

All examples assume `@tsfpp/boundary` and `@tsfpp/prelude` are installed. Zod is used for runtime schema validation in recipes that involve parsing; it is a peer dependency, never a hard requirement of `@tsfpp/boundary` itself.

Update note: examples use the current API forms `mkProblem({ ... })` and `verifyWebhook({ secret, headers, body, maxAgeSeconds })`.

---

## Foundations

### 1. Canonical handler anatomy — `HandlerFactory<Deps>`

The standard shape for every non-trivial handler. A factory function closes over injected dependencies (ports) and returns a `RawHandler`. Middleware is composed afterwards with `pipe`.

```ts
import {
  createJsonHandler,
  type HandlerFactory,
  type RawHandler,
  apiErrorToResponse,
  createdResponse,
  extractContext,
  withIdempotency,
  withRequestLog,
  type IdempotencyStore,
  type RequestLogger,
} from '@tsfpp/boundary';
import { err, isErr, ok, pipe } from '@tsfpp/prelude';
import { z } from 'zod';

// ── Domain port (interface, not implementation) ──────────────────────────────

type OrderRepository = {
  readonly create: (input: CreateOrderInput) => Promise<import('@tsfpp/prelude').Result<Order, import('@tsfpp/boundary').ApiError>>;
};

type CreateOrderInput = {
  readonly customerId: string;
  readonly amountCents: number;
  readonly currency: string;
};

type Order = {
  readonly id: string;
  readonly customerId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly status: 'pending' | 'confirmed';
};

// ── Schema ────────────────────────────────────────────────────────────────────

const createOrderBody = z.object({
  customerId:  z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency:    z.string().length(3),
});

// ── Deps record ───────────────────────────────────────────────────────────────

type Deps = {
  readonly orders: OrderRepository;
};

// ── Handler factory ───────────────────────────────────────────────────────────

export const createOrderHandler: HandlerFactory<Deps> = (deps) =>
  createJsonHandler({
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

// ── Compose middleware ────────────────────────────────────────────────────────

// Downstream to upstream: idempotency runs first, logging wraps everything.
export const makeHandler = (
  deps: Deps,
  idempotencyStore: IdempotencyStore,
  logger: RequestLogger,
): RawHandler =>
  pipe(
    createOrderHandler(deps),
    withIdempotency(idempotencyStore),
    withRequestLog(logger, '/v1/orders'),
  );
```

**Why `HandlerFactory<Deps>` and not a module-level `async` function?**

A bare `export const handler = async (req) => { ... }` forces dependencies to be resolved at module import time via top-level imports. That couples the handler to specific adapter implementations, makes the dependency graph implicit, and requires module-level mocks in tests. A factory is explicit: the caller wires dependencies, the factory is a pure function of them.

**Why `pipe` for middleware composition?**

`pipe(handler, withIdempotency(store), withRequestLog(logger, template))` reads left-to-right in execution order: the handler runs, then idempotency wraps it, then logging wraps that. Manual nesting (`withRequestLog(logger)(withIdempotency(store)(handler))`) is equivalent but reads inside-out, which inverts the mental model.

**Middleware order matters.** Place `withRequestLog` outermost so that replayed idempotency responses are also logged with their correct status and duration. `withIdempotency` placed inside `withRequestLog` means the log entry reflects the final response whether it was a fresh execution or a replay.

---

### 2. Minimal handler with typed context

For handlers without external dependencies — health, version, static data.

```ts
import { extractContext, okResponse } from '@tsfpp/boundary';

export const healthHandler = async (req: Request): Promise<Response> => {
  const ctx = extractContext(req, '/healthz');

  return okResponse(
    { status: 'ok', traceId: ctx.traceId },
    { 'X-Request-Id': ctx.traceId },
  );
};
```

Always call `extractContext` before any logic — even before potential early exits. If the handler returns an error response, that response still needs a `traceId` for the `ProblemDetails.traceId` field and the `X-Request-Id` echo header. Calling it conditionally means your error paths produce untraced responses.

### Environment config boundary with `loadConfig`

Parse and validate environment variables once at startup, fail fast, and pass a typed config object through dependency wiring.

```ts
import { isErr } from '@tsfpp/prelude';
import { loadConfig } from '@tsfpp/boundary';
import { z } from 'zod';

const configSchema = z.object({
  PORT:         z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET:   z.string().min(32),
  LOG_LEVEL:    z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type AppConfig = z.infer<typeof configSchema>;

const configResult = loadConfig(configSchema, process.env);
if (isErr(configResult)) {
  console.error(configResult.error.summary);
  process.exit(1);
}

export const config: AppConfig = configResult.value;
```

This pattern defines one boundary for untyped process state. Handlers and services receive `AppConfig` via dependencies and do not read `process.env` directly.

---

## Request parsing

### 3. Validation, smart constructors, and `fromZodError`

Zod validates the raw shape; smart constructors enforce domain invariants; `fromZodError` bridges the two into a single typed error path.

```ts
import {
  apiErrorToResponse,
  createdResponse,
  extractContext,
  fromZodError,
  mkValidationError,
} from '@tsfpp/boundary';
import { isErr, ok, err, tryCatchAsync, type Result } from '@tsfpp/prelude';
import { z } from 'zod';

// ── Schema layer (transport) ──────────────────────────────────────────────────

const createCustomerBody = z.object({
  legalName:    z.string().min(1).max(200),
  billingEmail: z.string().email(),
  taxId:        z.string().min(8).max(32),
}).strict();

type CreateCustomerBody = z.infer<typeof createCustomerBody>;

// ── Domain layer (invariants beyond what Zod can express) ─────────────────────

type CustomerName  = string & { readonly __brand: 'CustomerName' };

const mkCustomerName = (raw: string): Result<CustomerName, import('@tsfpp/boundary').ValidationError> => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return err(mkValidationError([{ field: 'legalName', issue: 'Must not be blank after trimming' }]));
  if (/^\d/.test(trimmed))  return err(mkValidationError([{ field: 'legalName', issue: 'Must not start with a digit' }]));
  return ok(trimmed as CustomerName);
};

// ── Handler ───────────────────────────────────────────────────────────────────

export const createCustomerHandler = async (req: Request): Promise<Response> => {
  const ctx = extractContext(req, '/v1/customers');

  // 1. Parse raw input — catches structural/type errors
  const rawResult = await tryCatchAsync(
    () => req.json(),
    () => mkValidationError([{ field: 'body', issue: 'Body must be valid JSON' }]),
  );
  if (isErr(rawResult)) return apiErrorToResponse(rawResult.error, ctx);

  const parsed = createCustomerBody.safeParse(rawResult.value);
  if (!parsed.success) return apiErrorToResponse(fromZodError(parsed.error), ctx);

  // 2. Apply smart constructors — catches domain invariant violations
  const name = mkCustomerName(parsed.data.legalName);
  if (isErr(name)) return apiErrorToResponse(name.error, ctx);

  const customer = {
    id: crypto.randomUUID(),
    legalName: name.value,
    billingEmail: parsed.data.billingEmail,
    taxId: parsed.data.taxId,
  };
  return createdResponse(customer, `/v1/customers/${customer.id}`, { 'X-Request-Id': ctx.traceId });
};
```

**Why two layers of validation?**

Zod is fast and expressive for type-shape assertions but knows nothing about your domain. "A legal name must not start with a digit" is not a schema rule — it is a domain invariant. Putting it in the Zod schema couples your domain rules to your transport library and makes them invisible to the domain model. Smart constructors keep domain invariants in the domain, and `fromZodError` provides a clean bridge from Zod's error type to `ValidationError` without requiring any direct Zod import inside `@tsfpp/boundary`.

**Why `.strict()` on the Zod schema?**

`.strict()` rejects unknown fields, returning an error for any key not declared in the schema (Rule 3.3). This prevents silent acceptance of mistyped fields — a client sending `{ titel: 'Acme Corp' }` instead of `{ title: '...' }` gets a 422 validation error rather than a silently-ignored typo.

---

### 4. Conditional requests — ETag, `If-None-Match`, `If-Match`

Conditional requests are the HTTP-native solution for cache freshness and optimistic concurrency control. Two patterns: reads use `If-None-Match` (cache freshness); mutations use `If-Match` (lost-update prevention).

```ts
import {
  apiErrorToResponse,
  cacheHeaders,
  extractLastPathSegment,
  extractContext,
  mkValidationError,
  mkProblem,
  noContentResponse,
  okResponse,
  preconditionError,
  problemResponse,
} from '@tsfpp/boundary';
import { fromNullable, getOrElse, isErr, isNone, isSome, tryCatchAsync } from '@tsfpp/prelude';

type Order = { readonly id: string; readonly title: string; readonly version: number };

// Simulate a data layer
const findOrder = (_id: string): Order | null =>
  ({ id: 'abc', title: 'Invoice Reconciliation', version: 7 });

const updateOrder = (_id: string, _patch: Partial<Order>): Order =>
  ({ id: 'abc', title: 'Invoice Reconciliation (Edit)', version: 8 });

// ── GET — conditional read ────────────────────────────────────────────────────

export const getOrderHandler = async (req: Request): Promise<Response> => {
  const ctx = extractContext(req, '/v1/orders/:id');
  const id = extractLastPathSegment(req.url);
  const orderOption = fromNullable(findOrder(id));

  if (isNone(orderOption)) {
    return apiErrorToResponse({ kind: 'not_found', resource: 'order', id }, ctx);
  }

  const order = orderOption.value;

  const etag = `"${order.id}-${order.version}"`;

  // Honour If-None-Match: return 304 if client already has current version.
  if (req.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: cacheHeaders('private-revalidate', etag) });
  }

  return okResponse(order, {
    ...cacheHeaders('private-revalidate', etag),
    'X-Request-Id': ctx.traceId,
  });
};

// ── PATCH — conditional mutation ──────────────────────────────────────────────

export const patchOrderHandler = async (req: Request): Promise<Response> => {
  const ctx     = extractContext(req, '/v1/orders/:id');
  const id = extractLastPathSegment(req.url);
  const ifMatchOption = fromNullable(req.headers.get('if-match'));

  // 428 Precondition Required — mutation without a conditional header.
  if (isNone(ifMatchOption)) {
    return problemResponse(
      mkProblem({
        status: 428,
        code: 'precondition_required',
        title: 'Mutations on this resource require an If-Match header',
        traceId: ctx.traceId,
        opts: {
          detail: 'Read the resource first and include its ETag as the If-Match value.',
          instance: ctx.url,
        },
      }),
    );
  }

  const orderOption = fromNullable(findOrder(id));
  if (isNone(orderOption)) return apiErrorToResponse({ kind: 'not_found', resource: 'order', id }, ctx);

  const order = orderOption.value;

  const currentEtag = `"${order.id}-${order.version}"`;

  // 412 Precondition Failed — client's version is stale.
  if (ifMatchOption.value !== currentEtag) {
    return apiErrorToResponse(preconditionError('ETag does not match the current resource version'), ctx);
  }

  const patchResult = await tryCatchAsync(
    () => req.json(),
    () => mkValidationError([{ field: 'body', issue: 'Body must be valid JSON' }]),
  );
  if (isErr(patchResult)) return apiErrorToResponse(patchResult.error, ctx);

  const patch = patchResult.value;
  const updated = updateOrder(id, patch);
  const newEtag = `"${updated.id}-${updated.version}"`;

  return okResponse(updated, {
    ...cacheHeaders('private-revalidate', newEtag),
    'X-Request-Id': ctx.traceId,
  });
};
```

**Why 428, not 412, when `If-Match` is absent?**

`412 Precondition Failed` means the condition was evaluated and failed. `428 Precondition Required` means no condition was supplied at all — a different problem. Some clients special-case 428 to add the missing header and retry; they cannot do that on a 412. Use the right status to enable the right client behaviour.

**Why include ETag on the 304 response?**

RFC 9110 §15.4.5 requires it. Clients use the 304 ETag to update their cache entry — omitting it means their cache becomes stale without knowing it.

**Trade-off: `version` integer vs content hash as ETag.**

A version counter is deterministic and O(1) to compute. A SHA-256 of the serialised body is self-validating (content-addressed) but costs serialisation on every read. For most APIs, the version counter is the better choice. Use a content hash only when the ETag must survive schema-neutral representation changes (e.g., the same underlying record serialised differently for different clients).

---

## Response patterns

### 5. Cursor pagination with `decodeCursor` on the receive side

```ts
import {
  apiErrorToResponse,
  decodeCursor,
  encodeCursor,
  mkNextCursor,
  parsePaginationFromRequest,
  extractContext,
  mkPaginated,
  mkValidationError,
  okResponse,
  type Cursor,
} from '@tsfpp/boundary';
import {
  fromNullable,
  getOrElse,
  getStringField,
  isErr,
  isSome,
  mapO,
  pipe,
} from '@tsfpp/prelude';

type Order = { readonly id: string; readonly title: string };

// Simulate a data layer that supports keyset pagination
const queryOrders = (afterId: string | null, limit: number): ReadonlyArray<Order> => {
  const allOrders: ReadonlyArray<Order> = [
    { id: 't1', title: 'Quarterly Renewal' },
    { id: 't2', title: 'Invoice Reconciliation' },
    { id: 't3', title: 'Year-End True-Up' },
  ];
  const startIndex = isSome(fromNullable(afterId)) ? allOrders.findIndex((t) => t.id === afterId) + 1 : 0;
  return allOrders.slice(startIndex, startIndex + limit);
};

export const listOrdersHandler = async (req: Request): Promise<Response> => {
  const ctx = extractContext(req, '/v1/orders');

  // Parse and validate limit + cursor query params
  const page = parsePaginationFromRequest(req, 100);
  if (isErr(page)) return apiErrorToResponse(page.error, ctx);

  const { limit, cursor } = page.value;
  const cursorOption = fromNullable(cursor);

  // Decode the opaque cursor to retrieve the continuation key
  let afterId: string | null = null;
  if (isSome(cursorOption)) {
    const decodedOption = decodeCursor(cursorOption.value);
    if (!isSome(decodedOption)) {
      return apiErrorToResponse(
        mkValidationError([{ field: 'cursor', issue: 'Cursor is invalid or has been tampered with' }]),
        ctx,
      );
    }
    afterId = getOrElse<string | null>(() => null)(getStringField(decodedOption.value, 'afterId'));
  }

  const rows       = queryOrders(afterId, limit);
  const nextCursor = mkNextCursor({
    items: rows,
    page: page.value,
    toPayload: (row) => ({ afterId: row.id }),
  });

  return okResponse(
    mkPaginated(rows, nextCursor, null),
    { 'X-Request-Id': ctx.traceId },
  );
};
```

**Why cursor over offset?**

Offset pagination — `LIMIT n OFFSET k` — has two fundamental problems. First, it is O(n) in most databases: even though only `n` rows are returned, the engine scans `k + n` rows to find the right starting point. Second, if rows are inserted or deleted between pages, the client gets duplicates or skips records. Cursor pagination avoids both: it keys on a stable column (typically a unique ID or `(timestamp, id)` pair) that the database can seek to in O(log n) via an index.

**Why validate the decoded cursor rather than trust it?**

Cursors are opaque to clients but not cryptographically protected in this recipe — they are base64url-encoded plain JSON. A client that modifies a cursor could send arbitrary `afterId` values. Validate the decoded payload just as you would any untrusted input. For cursors that encode sensitive sort fields, sign the encoded value with HMAC-SHA256 using a server-side secret before returning it, and verify the signature on decode.

**Why `null` for `totalCount`?**

A total-count query on a mutable table is not free. Running `COUNT(*)` alongside every page request can double database load and undermines the O(log n) complexity guarantee of keyset pagination. Return `null` unless the count is either precomputed (a materialized view, a counter table) or cheaply derivable. Document the field as nullable in your OpenAPI schema so consumers know not to rely on it.

---

### 6. Long-running operation — full cycle

The 202 pattern involves two handlers: the trigger (returns `202 Accepted`) and the polling endpoint (returns the current operation state). The operation progresses through a closed discriminated union: `running → succeeded | failed | cancelled`.

```ts
import {
  acceptedResponse,
  apiErrorToResponse,
  extractLastPathSegment,
  extractContext,
  mkCancelledOp,
  mkFailedOp,
  mkProblem,
  mkRunningOp,
  mkSucceededOp,
  okResponse,
  type Operation,
} from '@tsfpp/boundary';
import { fromNullable, getOrElse, isNone } from '@tsfpp/prelude';

type ExportResult = { readonly downloadUrl: string };
type OperationRecord = {
  readonly operationId: string;
  readonly createdAt: string;
  readonly status: 'running' | 'succeeded' | 'failed' | 'cancelled';
  readonly downloadUrl: string | null;
};

// Simulate an operations store
const operations = new Map<string, OperationRecord>();

// ── POST /v1/exports — trigger ────────────────────────────────────────────────

export const startExportHandler = async (req: Request): Promise<Response> => {
  const ctx         = extractContext(req, '/v1/exports');
  const operationId = crypto.randomUUID();
  const createdAt   = new Date().toISOString();

  // Persist the operation record so the polling handler can read it
  operations.set(operationId, { operationId, createdAt, status: 'running', downloadUrl: null });

  // Kick off the actual work asynchronously (fire-and-forget)
  void runExport(operationId, createdAt);

  const op = mkRunningOp<ExportResult>(operationId, 0);
  return acceptedResponse(op, `/v1/operations/${operationId}`, { 'X-Request-Id': ctx.traceId });
};

// ── GET /v1/operations/:id — polling ─────────────────────────────────────────

export const getOperationHandler = async (req: Request): Promise<Response> => {
  const ctx         = extractContext(req, '/v1/operations/:id');
  const operationId = extractLastPathSegment(req.url);
  const recordOption = fromNullable(operations.get(operationId));

  if (isNone(recordOption)) {
    return apiErrorToResponse({ kind: 'not_found', resource: 'operation', id: operationId }, ctx);
  }

  const record = recordOption.value;

  let op: Operation<ExportResult>;

  switch (record.status) {
    case 'running':
      op = mkRunningOp<ExportResult>(record.operationId, 50);
      break;
    case 'succeeded':
      op = mkSucceededOp<ExportResult>(
        record.operationId,
        { downloadUrl: getOrElse(() => '')(fromNullable(record.downloadUrl)) },
        record.createdAt,
      );
      break;
    case 'failed':
      op = mkFailedOp(
        record.operationId,
        mkProblem({
          status: 500,
          code: 'export_failed',
          title: 'Export processing failed',
          traceId: ctx.traceId,
          opts: { instance: ctx.url },
        }),
        record.createdAt,
      );
      break;
    case 'cancelled':
      op = mkCancelledOp(record.operationId, record.createdAt);
      break;
  }

  return okResponse(op, { 'X-Request-Id': ctx.traceId });
};

// ── Background work ───────────────────────────────────────────────────────────

const runExport = async (operationId: string, createdAt: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  const recordOption = fromNullable(operations.get(operationId));
  if (isNone(recordOption)) return;
  const record = recordOption.value;
  operations.set(operationId, {
    ...record,
    status: 'succeeded',
    downloadUrl: `https://cdn.example.com/exports/${operationId}.zip`,
  });
};
```

**Why `202 Accepted` instead of blocking?**

HTTP connections are finite resources. Any operation that could take longer than a few seconds risks hitting load balancer timeouts (typically 30–60 s), client read timeouts, and connection resets on mobile networks. `202 Accepted` returns immediately with a `Location` header pointing to an operation resource. The client polls — or subscribes to a webhook — at its own pace.

**Why a discriminated union for operation status?**

The `Operation<T>` type makes it impossible to access `result` on a running operation or `error` on a succeeded one — the TypeScript compiler enforces it. An untyped `{ status: string; result?: T; error?: ProblemDetails }` shape requires runtime null-checks that the type system cannot verify.

**Polling interval guidance.**

Do not specify a poll interval in the API standard — specify it in the contract via a `Retry-After` header on the `202` response or as a field in the operation body. This lets the server tune the interval per operation type without a client-side change.

---

### 7. Bulk 207 Multi-Status — partial-success vs all-or-nothing

Two atomicity models. Choose one per endpoint and document it explicitly in the contract.

```ts
import {
  apiErrorToResponse,
  bulkResponse,
  extractContext,
  fromZodError,
  mkBulkErrorItem,
  mkBulkOkItem,
  mkProblem,
  mkValidationError,
  type BulkItem,
} from '@tsfpp/boundary';
import {
  fromNullable,
  getTypedField,
  isErr,
  isNone,
  isRecord,
  isSome,
  tryCatchAsync,
} from '@tsfpp/prelude';
import { z } from 'zod';

const orderInput = z.object({ title: z.string().min(1), durationSeconds: z.number().int().positive() });
type OrderInput   = z.infer<typeof orderInput>;
type CreatedOrder = { readonly id: string; readonly title: string };

const persistOrder = (input: OrderInput): CreatedOrder =>
  ({ id: crypto.randomUUID(), title: input.title });

// ── Partial-success (207) ─────────────────────────────────────────────────────

export const bulkCreateOrdersHandler = async (req: Request): Promise<Response> => {
  const ctx  = extractContext(req, '/v1/orders:batch');
  const bodyResult = await tryCatchAsync(
    () => req.json(),
    () => mkValidationError([{ field: 'body', issue: 'Body must be valid JSON' }]),
  );
  if (isErr(bodyResult)) return apiErrorToResponse(bodyResult.error, ctx);

  if (!isRecord(bodyResult.value)) {
    return apiErrorToResponse(mkValidationError([{ field: 'body', issue: 'Body must be an object' }]), ctx);
  }

  const itemsOption = getTypedField<ReadonlyArray<unknown>>(
    bodyResult.value,
    'items',
    (value): value is ReadonlyArray<unknown> => Array.isArray(value),
  );

  if (isNone(itemsOption)) {
    return apiErrorToResponse(mkValidationError([{ field: 'items', issue: 'Items must be an array' }]), ctx);
  }

  const items: Array<BulkItem<CreatedOrder>> = itemsOption.value.map((raw) => {
    const parsed = orderInput.safeParse(raw);
    if (!parsed.success) return mkBulkErrorItem<CreatedOrder>(
      mkProblem({
        status: 422,
        code: 'validation_failed',
        title: 'Item validation failed',
        traceId: ctx.traceId,
        opts: {
          errors: fromZodError(parsed.error).issues,
          instance: ctx.url,
        },
      }),
    );
    return mkBulkOkItem<CreatedOrder>(persistOrder(parsed.data), 201);
  });

  return bulkResponse(items);
};

// ── All-or-nothing ────────────────────────────────────────────────────────────

export const bulkCreateOrdersAtomicHandler = async (req: Request): Promise<Response> => {
  const ctx  = extractContext(req, '/v1/orders:batch-atomic');
  const bodyResult = await tryCatchAsync(
    () => req.json(),
    () => mkValidationError([{ field: 'body', issue: 'Body must be valid JSON' }]),
  );
  if (isErr(bodyResult)) return apiErrorToResponse(bodyResult.error, ctx);

  if (!isRecord(bodyResult.value)) {
    return apiErrorToResponse(mkValidationError([{ field: 'body', issue: 'Body must be an object' }]), ctx);
  }

  const itemsOption = getTypedField<ReadonlyArray<unknown>>(
    bodyResult.value,
    'items',
    (value): value is ReadonlyArray<unknown> => Array.isArray(value),
  );

  if (isNone(itemsOption)) {
    return apiErrorToResponse(mkValidationError([{ field: 'items', issue: 'Items must be an array' }]), ctx);
  }

  // Validate every item before persisting any
  const parsed = itemsOption.value.map((raw) => orderInput.safeParse(raw));
  const firstErrorOption = fromNullable(parsed.find((r) => !r.success));

  if (isSome(firstErrorOption) && !firstErrorOption.value.success) {
    return apiErrorToResponse(fromZodError(firstErrorOption.value.error), ctx);
  }

  const created = parsed
    .filter((r): r is ReturnType<typeof orderInput.safeParse> & { success: true } => r.success)
    .map((r) => persistOrder(r.data));

  return bulkResponse(created.map((t) => mkBulkOkItem<CreatedOrder>(t, 201)));
};
```

**When to use 207 partial-success vs all-or-nothing.**

| Scenario | Model |
|---|---|
| Import pipeline — user wants as many records as possible to succeed | 207 partial-success |
| Financial transactions — partial writes are worse than no writes | All-or-nothing |
| Creating independent resources in one round-trip for efficiency | 207 partial-success |
| Creating resources that reference each other (foreign-key constraint) | All-or-nothing |

The atomicity model is a **contract decision**, not an implementation detail. Document it in OpenAPI so clients know what to expect on partial failures. Mixing both models on the same endpoint — sometimes partial, sometimes atomic depending on the data — is the worst outcome.

**Why validate all items before persisting any (all-or-nothing)?**

Validating lazily and rolling back on error is possible with database transactions, but returning a 422 with the first-item validation error means the client cannot know how many items passed without trying again. Eager up-front validation of the whole batch gives the client a complete error picture in one round-trip.

---

## Error handling

### 8. Rate limit headers on all responses, `Retry-After` on 429

Rate limit state should be visible to clients on every response so they can self-throttle before hitting the limit.

```ts
import {
  apiErrorToResponse,
  extractContext,
  okResponse,
  rateLimitHeaders,
  retryAfterHeader,
  type RateLimitState,
} from '@tsfpp/boundary';

// Simulate a rate limiter that returns the current state
const checkRateLimit = (_principalId: string): { readonly exceeded: boolean; readonly state: RateLimitState } => ({
  exceeded: false,
  state: { limit: 100, remaining: 73, resetAt: new Date(Date.now() + 47_000) },
});

export const searchOrdersHandler = async (req: Request): Promise<Response> => {
  const ctx = extractContext(req, '/v1/orders/search');
  const principalId = 'anon'; // derive from ctx.principalId in production

  const { exceeded, state } = checkRateLimit(principalId);

  if (exceeded) {
    const retryAfterSeconds = Math.ceil((state.resetAt.getTime() - Date.now()) / 1_000);
    return apiErrorToResponse(
      { kind: 'rate_limit', retryAfterSeconds },
      ctx,
    );
    // Note: apiErrorToResponse automatically adds Retry-After on rate_limit errors.
    // Add rateLimitHeaders manually if you also want RateLimit-* on the 429:
  }

  const results = [{ id: 't1', title: 'Invoice Reconciliation' }];
  return okResponse(results, {
    ...rateLimitHeaders(state),
    'X-Request-Id': ctx.traceId,
  });
};
```

**Why attach `RateLimit-*` on successful responses, not just 429?**

A client that can only observe rate limit state on 429 must exceed the limit to discover it. Embedding `RateLimit-Remaining` on every response lets well-behaved clients back off proactively — useful for batch importers and CLI tools. This is the model standardised in the IETF `RateLimit` header fields draft.

**Why `apiErrorToResponse` instead of `problemResponse(mkProblem(...))` for the 429?**

`apiErrorToResponse` adds `Retry-After` automatically on `rate_limit` errors (matching `error.retryAfterSeconds`), and `WWW-Authenticate` on `unauthenticated` errors. Constructing the Problem Details manually risks forgetting these required headers. Use `apiErrorToResponse` for canonical `ApiError` variants; use `mkProblem` + `problemResponse` only for non-standard error codes outside the taxonomy.

---

### 9. Custom `ErrorMapper<E>` for application-specific errors

When your domain produces errors outside the canonical `ApiError` taxonomy, extend with a typed mapper rather than adding `kind` variants to `ApiError`.

```ts
import {
  type ApiError,
  apiErrorToResponse,
  type ErrorMapper,
  extractContext,
  mkProblem,
  problemResponse,
} from '@tsfpp/boundary';
import { fromNullable, isSome } from '@tsfpp/prelude';

// ── Application-specific error variants ───────────────────────────────────────

type QuotaExceededError = {
  readonly kind: 'quota_exceeded';
  readonly quotaName: string;
  readonly currentLimit: number;
};

type FeatureDisabledError = {
  readonly kind: 'feature_disabled';
  readonly feature: string;
};

type AppError = ApiError | QuotaExceededError | FeatureDisabledError;

// ── Application-level ErrorMapper ─────────────────────────────────────────────

const appErrorToResponse: ErrorMapper<AppError> = (error, ctx) => {
  switch (error.kind) {
    case 'quota_exceeded':
      return problemResponse(
        mkProblem({
          status: 429,
          code: 'quota_exceeded',
          title: `${error.quotaName} quota exceeded`,
          traceId: ctx.traceId,
          opts: {
            detail:   `Current limit is ${error.currentLimit}. Contact support to increase your quota.`,
            instance: ctx.url,
          },
        }),
      );

    case 'feature_disabled':
      return problemResponse(
        mkProblem({
          status: 403,
          code: 'feature_disabled',
          title: `${error.feature} is not enabled on this account`,
          traceId: ctx.traceId,
          opts: { instance: ctx.url },
        }),
      );

    default:
      // Delegate all canonical ApiError variants to the standard mapper.
      return apiErrorToResponse(error, ctx);
  }
};

// ── Usage in a handler ────────────────────────────────────────────────────────

const checkFeature = (_feature: string): AppError | null =>
  ({ kind: 'feature_disabled', feature: 'bulk-export' });

export const exportHandler = async (req: Request): Promise<Response> => {
  const ctx   = extractContext(req, '/v1/exports');
  const guardOption = fromNullable(checkFeature('bulk-export'));

  if (isSome(guardOption)) return appErrorToResponse(guardOption.value, ctx);

  return problemResponse(mkProblem({
    status: 500,
    code: 'internal_error',
    title: 'Not implemented',
    traceId: ctx.traceId,
    opts: { instance: ctx.url },
  }));
};
```

**Why extend rather than modify `ApiError`?**

`ApiError` is the canonical, exhaustive union in `@tsfpp/boundary`. Its error mapper is exhaustive over it — witnessed by `absurd`. Adding variants to `ApiError` would require updating the mapper in `@tsfpp/boundary` for every application. Extension via a union type (`AppError = ApiError | ...`) keeps the base taxonomy stable and delegates canonical variants to `apiErrorToResponse`, while giving each application its own error space.

**Why a `switch` rather than `if/else if`?**

A `switch` on `error.kind` with a `default` branch that calls `apiErrorToResponse(error, ctx)` is structurally sound: TypeScript narrows the type in each case, and the `default` branch receives only `ApiError` variants (not app-specific ones), which `apiErrorToResponse` handles exhaustively with `absurd`. An `if/else if` chain without a final `else` would silently drop unmapped error kinds.

---

## HOF middleware composition

### 10. Composing middleware with `pipe`

`withIdempotency` and `withRequestLog` are both `(RawHandler) => RawHandler` — exactly the shape `pipe` expects.

```ts
import {
  okResponse,
  type IdempotencyLookup,
  type IdempotencyStore,
  type RawHandler,
  type RequestLogger,
  withIdempotency,
  withRequestLog,
} from '@tsfpp/boundary';
import { isOk, pipe, tryCatchAsync } from '@tsfpp/prelude';

// ── Stub implementations (replace with real adapters in production) ────────────

const idempotencyStore: IdempotencyStore = {
  check:        async () => ({ kind: 'first_request' } satisfies IdempotencyLookup),
  markInFlight: async () => undefined,
  store:        async () => undefined,
};

const logger: RequestLogger = {
  info:  (entry) => { console.info(JSON.stringify(entry)); },
  error: (entry) => { console.error(JSON.stringify(entry)); },
};

// ── Base handler ──────────────────────────────────────────────────────────────

const baseHandler: RawHandler = async (req) => {
  const bodyResult = await tryCatchAsync(
    () => req.json(),
    () => ({}),
  );
  const body = isOk(bodyResult) ? bodyResult.value : {};
  return okResponse({ accepted: true, received: body });
};

// ── Composed handler ──────────────────────────────────────────────────────────

export const handler: RawHandler = pipe(
  baseHandler,
  withIdempotency(idempotencyStore),
  withRequestLog(logger, '/v1/commands'),
);
```

**Composition order and what each position means.**

Reading the `pipe` call left to right: `baseHandler` is the innermost function. `withIdempotency(idempotencyStore)` wraps it — so when a request arrives, idempotency is checked before `baseHandler` runs, and the response is stored afterwards. `withRequestLog` wraps the whole thing — so even replayed idempotency responses produce a log entry.

Reversing `withRequestLog` and `withIdempotency` means that on replay, `withRequestLog` would see the raw request before `withIdempotency` short-circuits — the log entry would be emitted but the handler would still not run, producing a confusing `null` duration.

**Adding more middleware.**

Each additional HOF extends the `pipe` call:

```ts
pipe(
  baseHandler,
  withRateLimit(rateLimiter),      // innermost check
  withIdempotency(idempotencyStore),
  withAuth(authProvider),
  withRequestLog(logger, '/v1/commands'),  // outermost, sees everything
)
```

The pipe type-checks each step: if you add a HOF that takes something other than `RawHandler`, TypeScript catches it at compile time.

---

## Security

### 11. CORS allow-list and baseline security headers

```ts
import {
  baselineSecurityHeaders,
  corsHeaders,
  okResponse,
  extractContext,
} from '@tsfpp/boundary';

// Load from environment — never hardcode in source
const ALLOWED_ORIGINS: ReadonlyArray<string> = [
  'https://app.example.com',
  'https://staging.example.com',
];

export const profileHandler = async (req: Request): Promise<Response> => {
  const ctx    = extractContext(req, '/v1/profile');
  const origin = req.headers.get('origin');

  const cors = corsHeaders(ALLOWED_ORIGINS, origin, {
    allowedMethods:  ['GET', 'PATCH', 'OPTIONS'],
    allowedHeaders:  ['content-type', 'authorization'],
    allowCredentials: true,
    maxAgeSeconds:   600,
  });

  return okResponse(
    { name: 'Ada Lovelace', role: 'admin' },
    {
      ...baselineSecurityHeaders,
      ...cors,
      'X-Request-Id': ctx.traceId,
    },
  );
};
```

**Why `corsHeaders` returns an empty object for disallowed origins.**

When `origin` is absent or not on the allow-list, `corsHeaders` returns `{}` — no `Access-Control-Allow-Origin` header. The browser enforces the CORS block; the server does not need to return an error response. Returning a `403` for unlisted origins is technically superfluous for browsers (they check CORS before acting on the response), and it exposes information about your allow-list policy to non-browser clients.

**Why always merge `baselineSecurityHeaders` rather than relying on the gateway.**

Edge configuration drifts. A header set at the application layer travels with every response regardless of which gateway, proxy, or CDN happens to be in front at that moment. If you rely solely on the gateway, a mis-routed request, a direct internal call, or a change in infrastructure silently drops the headers.

**Why `Vary: Origin`?**

When the `Access-Control-Allow-Origin` value varies by request (which it does, because it mirrors the allowed origin), any CDN or reverse proxy that caches the response must vary its cache key on the `Origin` header. Without `Vary: Origin`, a cached response for `https://app.example.com` could be served to a request from `https://attacker.example.com` with the wrong `Access-Control-Allow-Origin` value — a cache poisoning vulnerability. `corsHeaders` adds `Vary: Origin` automatically.

---

### 12. CORS preflight `OPTIONS` handler

Browsers send an `OPTIONS` preflight before any cross-origin request with a non-simple method or non-simple headers. The preflight handler must respond quickly with the allowed methods and headers.

```ts
import {
  baselineSecurityHeaders,
  corsHeaders,
  type RawHandler,
} from '@tsfpp/boundary';

const ALLOWED_ORIGINS: ReadonlyArray<string> = ['https://app.example.com'];

/**
 * Factory that produces a preflight handler for a specific route.
 * Register it on the OPTIONS method for every path that serves cross-origin requests.
 */
export const makePreflightHandler = (
  allowedMethods: ReadonlyArray<string>,
  allowedHeaders: ReadonlyArray<string>,
): RawHandler =>
  async (req) => {
    const origin = req.headers.get('origin');
    const cors   = corsHeaders(ALLOWED_ORIGINS, origin, {
      allowedMethods,
      allowedHeaders,
      allowCredentials: true,
      maxAgeSeconds: 600,
    });

    // 204 No Content — no body needed for preflight
    return new Response(null, {
      status: 204,
      headers: {
        ...baselineSecurityHeaders,
        ...cors,
      },
    });
  };

// Usage — register per route in your router:
// router.options('/v1/orders',      makePreflightHandler(['GET', 'POST'], ['content-type', 'authorization']));
// router.options('/v1/orders/:id',  makePreflightHandler(['GET', 'PATCH', 'DELETE'], ['content-type', 'authorization', 'if-match']));
```

**Why a factory, not a single shared handler?**

The `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` in the preflight response should reflect what the specific route actually accepts — not a union of everything the API supports. A preflight that claims `DELETE` is allowed on a read-only endpoint gives a false positive that the browser then acts on, only to hit a `405 Method Not Allowed` on the actual request.

**`maxAgeSeconds: 600` — why not longer?**

The preflight response is cached by the browser for `Access-Control-Max-Age` seconds. A longer value reduces preflight traffic but delays the propagation of policy changes. 600 seconds (10 minutes) is the recommended maximum for most APIs: it significantly reduces preflight overhead while keeping the policy update window tolerable. Chrome caps this at 7200 s; Firefox at 86400 s regardless of what you send.

---

## Webhooks

### 13. Webhook signing (sender) and verification (receiver)

```ts
import {
  mkWebhookEventId,
  signWebhook,
  verifyWebhook,
  type WebhookSignatureHeaders,
} from '@tsfpp/boundary';
import {
  fromNullable,
  getOrElse,
  isNone,
  isSome,
  sequenceArrayO,
} from '@tsfpp/prelude';

// ── Sender ────────────────────────────────────────────────────────────────────

type WebhookPayload = {
  readonly event: 'order.created' | 'order.deleted';
  readonly data: unknown;
  readonly timestamp: string;
};

export const deliverWebhook = async (
  endpointUrl: string,
  payload: WebhookPayload,
  secret: string,
): Promise<boolean> => {
  const eventIdOption = mkWebhookEventId(crypto.randomUUID());
  if (!isSome(eventIdOption)) return false;

  const body    = JSON.stringify(payload);
  const sigHeaders = await signWebhook(secret, eventIdOption.value, body);

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      ...sigHeaders,
      'Content-Type': 'application/json',
    },
    body,
  }).catch(() => null);

  return isSome(fromNullable(response)) && response.ok;
};

// ── Receiver ──────────────────────────────────────────────────────────────────

// The receiver's deduplication store (replace with Redis or database in production)
const processedIds = new Set<string>();

export const receiveWebhookHandler = async (req: Request): Promise<Response> => {
  // Read the full body as text first — it must be signed in its original serialized form.
  const body = await req.text();

  const requiredHeadersOption = sequenceArrayO([
    fromNullable(req.headers.get('x-webhook-id')),
    fromNullable(req.headers.get('x-webhook-timestamp')),
    fromNullable(req.headers.get('x-webhook-signature')),
  ]);

  if (isNone(requiredHeadersOption)) {
    return new Response(null, { status: 400 });
  }

  const [webhookId, webhookTimestamp, webhookSignature] = requiredHeadersOption.value;

  const headers: WebhookSignatureHeaders = {
    'x-webhook-id': webhookId,
    'x-webhook-timestamp': webhookTimestamp,
    'x-webhook-signature': webhookSignature,
  };

  // Verify signature and timestamp recency (default: 5-minute window)
  const secret = getOrElse(() => '')(fromNullable(process.env['WEBHOOK_SECRET']));
  const valid  = await verifyWebhook({ secret, headers, body });
  if (!valid) return new Response(null, { status: 401 });

  // Deduplicate by webhook ID before processing
  const webhookId = headers['x-webhook-id'];
  if (processedIds.has(webhookId)) {
    return new Response(null, { status: 204 }); // idempotent — already processed
  }
  processedIds.add(webhookId);

  const payload: unknown = JSON.parse(body);
  // process(payload) ...

  return new Response(null, { status: 204 });
};
```

**Why sign `{timestamp}.{body}` rather than just `{body}`?**

A signature over the body alone is replayable: an attacker who intercepts a legitimate delivery can replay it days or months later with a valid signature. Including the timestamp in the signed payload means an old signature is invalid once `maxAgeSeconds` has elapsed. `verifyWebhook` checks both: signature validity and timestamp recency.

**Why use `req.text()` rather than `req.json()` on the receiver?**

The HMAC is computed over the **raw byte string** as sent. If you call `req.json()` and re-serialize the parsed object, whitespace, key order, and Unicode normalisation can differ — producing a hash mismatch even for a legitimate delivery. Always read the raw body string, verify the signature, then parse JSON separately.

**Why deduplicate by `x-webhook-id`?**

The sender delivers at-least-once. Network failures, timeouts, or a non-2xx response cause the sender to retry. The receiver must be idempotent — processing the same event twice should produce the same outcome. `x-webhook-id` is the stable identity for a delivery attempt. Store processed IDs in a durable store (Redis with TTL, database with a unique constraint) rather than an in-memory `Set` as shown here.

**Why return `204` on duplicate, not `200`?**

Returning a `2xx` on duplicate tells the sender "delivery accepted" — which is correct, since the event was processed on the first attempt. Returning `4xx` on a duplicate would trigger unnecessary retries.

---

## Caching and lifecycle

### 14. Cache headers and ETag shape per resource type

`cacheHeaders` encodes the five most common cache policies as a closed `CachePolicy` type. Pair the right policy with the right resource shape.

```ts
import {
  cacheHeaders,
  okResponse,
  extractContext,
  type CachePolicy,
} from '@tsfpp/boundary';

// ── Public, immutable — versioned asset URL ───────────────────────────────────

export const getInvoicePdfHandler = async (req: Request): Promise<Response> => {
  const ctx     = extractContext(req, '/v1/orders/:id/invoice-pdf/:version');
  const invoicePdf = { url: 'https://cdn.example.com/invoices/inv-2026-q2-v3.pdf', pageCount: 12, sizeBytes: 802144 };

  // Versioned URL: content will never change at this path — cache forever.
  return okResponse(invoicePdf, {
    ...cacheHeaders('immutable'),
    'X-Request-Id': ctx.traceId,
  });
};

// ── Public, short-lived — order listing ───────────────────────────────────────

export const getPublicOrdersHandler = async (req: Request): Promise<Response> => {
  const ctx    = extractContext(req, '/v1/public/orders');
  const orders = [{ id: 't1', title: 'Invoice Reconciliation' }];
  const etag   = `"public-orders-${Date.now()}"`;

  return okResponse(orders, {
    ...cacheHeaders('public-short', etag),
    'X-Request-Id': ctx.traceId,
  });
};

// ── Private, user-specific — authenticated profile ────────────────────────────

export const getUserProfileHandler = async (req: Request): Promise<Response> => {
  const ctx     = extractContext(req, '/v1/users/:id/profile');
  const profile = { name: 'Ada Lovelace', role: 'admin' };
  const etag    = `"profile-${ctx.traceId}"`;

  return okResponse(profile, {
    ...cacheHeaders('private-revalidate', etag),
    'X-Request-Id': ctx.traceId,
  });
};
```

**Policy selection guide.**

| Policy | `Cache-Control` value | When to use |
|---|---|---|
| `no-store` | `no-store` | Sensitive data, authenticated endpoints where caching is never correct |
| `private-revalidate` | `private, no-cache` | User-specific, authenticated resources — browser-only cache, always revalidate |
| `public-short` | `public, max-age=60, stale-while-revalidate=300` | Public listings that change but not every second |
| `public-long` | `public, max-age=86400, stale-while-revalidate=3600` | Rarely-changing public data (customer profiles, pricing tiers) |
| `immutable` | `public, max-age=31536000, immutable` | Content-addressed or versioned-URL resources that never change |

**`stale-while-revalidate` — why include it?**

`stale-while-revalidate` lets the cache serve a stale response immediately while revalidating in the background. The client sees no latency, the cache stays fresh. Without it, every cache miss triggers a synchronous origin fetch. The trade-off: clients might see data up to `max-age + stale-while-revalidate` seconds old. Acceptable for listings; unacceptable for financial balances or security-sensitive data.

**`no-store` is the correct default for authenticated responses, not `no-cache`.**

`no-cache` allows caching but requires revalidation before every use — the response can still be stored in an intermediate proxy. `no-store` prohibits storage entirely. For user-specific authenticated data, you want `no-store`: even a revalidated shared-cache entry could be served to the wrong user if the proxy does not correctly vary on session tokens.

---

### 15. Deprecation and Sunset headers for endpoint lifecycle

When a route is deprecated, announce it with HTTP-native headers so that every active integration sees the signal, not just those who read documentation.

```ts
import {
  extractContext,
  okResponse,
  type RawHandler,
} from '@tsfpp/boundary';
import { fromNullable, isSome } from '@tsfpp/prelude';

/**
 * Wraps a `RawHandler` and adds `Deprecation` and `Sunset` headers to every response.
 * Place this as the outermost wrapper in the `pipe` chain so all responses are annotated.
 * (@tsfpp/standard Rule 14.3, RFC 8594, RFC 9745)
 *
 * @param deprecatedAt - Unix timestamp (seconds) when the deprecation took effect.
 * @param sunsetAt     - RFC 1123 date string for when the endpoint will be removed.
 * @param successorUrl - URL of the replacement resource or endpoint.
 */
export const withDeprecation =
  (deprecatedAt: number, sunsetAt: string, successorUrl?: string) =>
  (handler: RawHandler): RawHandler =>
  async (req) => {
    const response = await handler(req);
    const headers  = new Headers(response.headers);

    headers.set('Deprecation', `@${deprecatedAt}`);
    headers.set('Sunset', sunsetAt);
    const successorUrlOption = fromNullable(successorUrl);
    if (isSome(successorUrlOption)) {
      headers.set('Link', `<${successorUrlOption.value}>; rel="successor-version"`);
    }

    return new Response(response.body, {
      status:  response.status,
      headers,
    });
  };

// ── Usage ─────────────────────────────────────────────────────────────────────

const legacyOrderHandler: RawHandler = async (req) => {
  const ctx   = extractContext(req, '/v1/legacy/orders');
  const order = { id: 'abc', title: 'Invoice Reconciliation' };
  return okResponse(order, { 'X-Request-Id': ctx.traceId });
};

// Deprecated 2026-05-14 00:00:00 UTC; removed 2026-11-14 00:00:00 UTC
export const handler = withDeprecation(
  1747180800,                              // Unix timestamp: 2026-05-14T00:00:00Z
  'Fri, 14 Nov 2026 00:00:00 GMT',
  '/v2/orders',
)(legacyOrderHandler);
```

**Why HTTP headers and not just documentation?**

Documentation reaches engineers who read it. HTTP headers reach every active integration automatically — monitoring tools, API clients, developer consoles, and SDK generators can all act on them. `Deprecation` and `Sunset` are standardised (RFC 9745 and RFC 8594 respectively); some API clients and gateways already surface them automatically.

**`Deprecation: @{unix_seconds}` — why Unix seconds and not an ISO date?**

RFC 9745 specifies the `@{unix_seconds}` format for a specific deprecation timestamp. `Sunset` uses RFC 1123 date format (the same format as HTTP `Date`, `Expires`, etc.). The two formats exist because they were standardised separately, but they are complementary: `Deprecation` records when the deprecation decision was made; `Sunset` records when the endpoint will stop responding.

**Minimum notice period.**

Six months for external or contracted APIs; three months for internal APIs. Shorter than this and consumers cannot realistically complete migration in time, particularly if they have their own release cycles. The `withDeprecation` HOF has no opinion on the notice period — that is a governance decision documented in the API standard.

**Adding to the middleware chain.**

`withDeprecation` is a `(RawHandler) => RawHandler` HOF — it composes with `pipe` just like `withIdempotency` and `withRequestLog`:

```ts
pipe(
  legacyOrderHandler,
  withDeprecation(1747180800, 'Fri, 14 Nov 2026 00:00:00 GMT', '/v2/orders'),
  withRequestLog(logger, '/v1/legacy/orders'),
)
```