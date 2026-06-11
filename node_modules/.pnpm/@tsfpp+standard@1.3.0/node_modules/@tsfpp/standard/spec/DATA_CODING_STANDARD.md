# DATA_CODING_STANDARD.md — Functional Data Access Layer Design

This standard is mandatory for all data access design, implementation, comments, and documentation in the repository. English only.
Codename TSF++/Data (tsfpp-data)


**Version:** 1.1.0
**Date:** 2026-05-15
**Classification:** Normative — repository-wide
**Status:** Profile of TSF++ (`CODING_STANDARD.md`) for data access and persistence code
**Modelled after:** TSF++ base standard, JSF++ AV Rules, OWASP Top 10, Fowler — Patterns of Enterprise Application Architecture

---

## Preamble

### Relationship to TSF++

This document is a profile of TSF++. Every rule in [`CODING_STANDARD.md`](./CODING_STANDARD.md) applies to data access code unchanged. This standard adds rules specific to repository design, query construction, schema governance, transaction management, and data mapping.
Intersections with TSF++ rules and the security profile are explicitly listed in Appendix C to make overlap auditable during review.

Read TSF++ first. Read this second. Where data access code also touches an HTTP boundary, additionally read [`API_CODING_STANDARD.md`](./API_CODING_STANDARD.md).

### Scope

This standard governs all TypeScript code that directly interacts with a persistent data store, including:
- Repository and adapter modules
- Query construction and execution
- Data mapping (row types to domain types)
- Schema definitions and migration files
- Connection lifecycle management
- Transaction orchestration

It does not apply to:
- ORM or driver internals (must be isolated behind a conforming adapter)
- In-memory data structures that are not persisted
- Cache layers (governed by the relevant infrastructure profile when one exists)

### Philosophical axioms (non-negotiable)

1. **The database is an adapter, not the domain.** Persistence is a detail hidden behind a typed interface; domain logic must not know the storage technology.
2. **All data access is effectful.** Every repository operation is modeled as a typed effect returning `Result`. Exceptions never cross the adapter boundary.
3. **Partiality is typed.** Not-found is `Option`, not `null`, `undefined`, or `throw`.
4. **Queries are data.** Dynamic queries are constructed from validated, typed parts — never from interpolated strings.
5. **Schema changes are governed changes.** Migrations are versioned, reviewed, and additive by default.

### Compliance levels

| Level | Meaning |
|-------|---------|
| **MUST** | Mandatory. Violation requires approved deviation per TSF++ deviation procedure. |
| **SHOULD** | Expected in all new code. May be relaxed with a review comment citing rationale. |
| **MAY** | Recommended practice. Encouraged but not enforced by tooling. |

---

## 1 — Repository and adapter design

### Rule 1.1 — MUST: Every data source is accessed through a repository adapter; no direct data store calls from domain or use-case layers

**Rationale.** Domain and use-case code must remain pure and storage-agnostic. Coupling to a query language or ORM inside domain logic violates the pure core / effectful boundary principle of TSF++.

**Do**
```typescript
// domain/user.ts — no knowledge of storage
type UserRepository = {
  readonly findById: (id: UserId) => Promise<Result<Option<User>, DataError>>
  readonly save: (user: User) => Promise<Result<User, DataError>>
}

// infrastructure/user-repository.ts — adapter, knows about DB
const mkUserRepository = (db: Database): UserRepository => ({
  findById: async (id) => { /* query here */ },
  save: async (user) => { /* upsert here */ },
})
```

**Don't**
```typescript
// use-case/create-order.ts
const createOrder = async (db: Database, input: Input): Promise<void> => {
  const user = await db.query('SELECT * FROM users WHERE id = $1', [input.userId])
  // domain logic mixed with SQL
}
```

---

### Rule 1.2 — MUST: Repository interfaces are typed records of functions, not classes

**Rationale.** TSF++ Rule 1.9 forbids classes. Repository interfaces are product types of functions. This makes stubbing trivial and keeps the adapter pattern composable.

**Do**
```typescript
type OrderRepository = {
  readonly findById: (id: OrderId) => Promise<Result<Option<Order>, DataError>>
  readonly findByStatus: (status: OrderStatus, page: CursorPage) => Promise<Result<PagedResult<Order>, DataError>>
  readonly save: (order: Order) => Promise<Result<Order, DataError>>
  readonly delete: (id: OrderId) => Promise<Result<void, DataError>>
}
```

**Don't**
```typescript
class OrderRepository {
  constructor(private db: Database) {}
  async findById(id: OrderId) { /* ... */ }
}
```

---

### Rule 1.3 — MUST: Repository adapters are the sole location for query construction and execution

**Rationale.** Distributing queries across modules makes the data access surface unbounded and unauditable. All queries live inside the adapter that owns the aggregate.

**Do**
```typescript
// infrastructure/order-repository.ts — query lives here
const findRecentByCustomer = (db: Database) => async (customerId: CustomerId, since: Date) =>
  db.query('SELECT ... FROM orders WHERE customer_id = $1 AND created_at >= $2', [customerId, since])

// use-case/list-recent-orders.ts — calls the repository, no SQL
const listRecentOrders = (repos: { orders: OrderRepository }, input: Input) =>
  repos.orders.findRecentByCustomer(input.customerId, input.since)
```

**Don't**
```typescript
// use-case/list-recent-orders.ts — query has leaked into the use-case
const listRecentOrders = async (db: Database, input: Input) =>
  db.query('SELECT ... FROM orders WHERE customer_id = $1 AND created_at >= $2', [input.customerId, input.since])
```

---

### Rule 1.4 — SHOULD: Name repository interfaces after the aggregate root, not the storage technology

**Rationale.** `UserRepository` expresses intent. `PostgresUserRepository` leaks infrastructure into naming conventions. The concrete implementation's module path carries the technology detail.

**Do**
```typescript
// interface
type UserRepository = { /* ... */ }
// implementation module path
// infrastructure/postgres/user-repository.ts
```

**Don't**
```typescript
type PostgresUserRepository = { /* ... */ }
```

---

### Rule 1.5 — MUST: Each repository adapter implements exactly one aggregate root

**Rationale.** One aggregate per adapter bounds responsibility, simplifies testing, and enforces aggregate boundary discipline. Aggregates that need to be modified together belong in a use-case that composes their repositories, not in a single repository that knows both.

**Do**
```typescript
type UserRepository  = { /* user operations only */ }
type OrderRepository = { /* order operations only */ }

// use-case composes them
const placeOrder = (repos: { users: UserRepository; orders: OrderRepository }) => /* ... */
```

**Don't**
```typescript
type UserAndOrderRepository = {
  readonly findUser:   (id: UserId)  => /* ... */
  readonly findOrders: (id: OrderId) => /* ... */
  readonly placeOrder: (userId: UserId, items: ReadonlyArray<Item>) => /* business logic in repo */
}
```

---

## 2 — Query construction and safety

### Rule 2.1 — MUST: All queries use parameterized input; string interpolation of untrusted or dynamic values is forbidden

**Rationale.** Parameterized queries are the sole defense against SQL injection and equivalent injection classes in other query languages. This rule reinforces TSF++/Security Rule 2.4.

**Do**
```typescript
const findByEmail = (db: Database, email: Email): Promise<Result<Option<UserRow>, DataError>> =>
  db.query('SELECT id, email, created_at FROM users WHERE email = $1', [email])
```

**Don't**
```typescript
const findByEmail = (db: Database, email: string) =>
  db.query(`SELECT * FROM users WHERE email = '${email}'`)
```

---

### Rule 2.2 — MUST: Column selection is explicit; `SELECT *` is forbidden in production queries

**Rationale.** `SELECT *` couples queries to schema layout, breaks when columns are added or reordered, and leaks sensitive columns to layers that do not need them.

**Do**
```typescript
'SELECT id, email, created_at FROM users WHERE id = $1'
```

**Don't**
```typescript
'SELECT * FROM users WHERE id = $1'
```

---

### Rule 2.3 — MUST: Dynamic sort and filter fields are validated against an explicit allow-list before query construction

**Rationale.** Dynamic column names cannot be parameterized in most query languages and are a direct injection vector. Allow-listing enforces an explicit contract on queryable fields.

**Do**
```typescript
const SORTABLE_COLUMNS = new Set(['created_at', 'name', 'status'] as const)
type SortableColumn = 'created_at' | 'name' | 'status'

const validateSortColumn = (col: string): Result<SortableColumn, DataError> =>
  SORTABLE_COLUMNS.has(col as SortableColumn)
    ? ok(col as SortableColumn)
    : err({ kind: 'invalid_sort_column', column: col })
```

---

### Rule 2.4 — MUST: Repository methods that return collections must batch-load related data; iterative single-row queries inside a loop are forbidden

**Rationale.** N+1 query patterns are the single most common data layer performance bug. They scale linearly with collection size and degrade silently in development with small fixtures.

**Do**
```typescript
// One query for orders, one batched query for their items
const findOrdersWithItems = async (ids: ReadonlyArray<OrderId>): Promise<Result<ReadonlyArray<OrderWithItems>, DataError>> => {
  const orders = await db.query('SELECT ... FROM orders WHERE id = ANY($1)', [ids])
  const items  = await db.query('SELECT ... FROM order_items WHERE order_id = ANY($1)', [ids])
  return ok(joinByOrderId(orders, items))
}
```

**Don't**
```typescript
const findOrdersWithItems = async (ids: ReadonlyArray<OrderId>) => {
  const orders = await db.query('SELECT ... FROM orders WHERE id = ANY($1)', [ids])
  // N+1: one extra query per order
  return Promise.all(orders.map(async (o) => ({
    ...o,
    items: await db.query('SELECT ... FROM order_items WHERE order_id = $1', [o.id]),
  })))
}
```

---

### Rule 2.5 — SHOULD: Complex queries are named, documented, and co-located with the repository module that owns them

**Rationale.** Anonymous or scattered query strings are unauditable. Named queries can be reviewed, tested, and indexed.

**Do**
```typescript
// infrastructure/order-repository/queries.ts
/**
 * Returns orders for a customer placed within the given window.
 * Index: idx_orders_customer_created (customer_id, created_at DESC).
 */
const SELECT_RECENT_ORDERS_BY_CUSTOMER = `
  SELECT id, customer_id, status, total_cent, created_at, version
  FROM orders
  WHERE customer_id = $1 AND created_at >= $2
  ORDER BY created_at DESC, id DESC
  LIMIT $3
`
```

---

### Rule 2.6 — SHOULD: Document query complexity limits (maximum joins, maximum recursive depth) per repository

**Rationale.** Unbounded join depth or recursive queries can cause uncontrolled load under normal inputs.

---

## 3 — Result handling at data boundaries

### Rule 3.1 — MUST: All repository functions return `Result<T, DataError>`; raw ORM or driver exceptions are caught at the adapter boundary

**Rationale.** Exceptions escaping a repository adapter violate TSF++ Rule 6.2 (no `throw` outside adapter boundary) and force callers to reason about both typed and exception channels simultaneously.

**Do**
```typescript
const findById = async (id: ProductId): Promise<Result<Option<Product>, DataError>> => {
  try {
    const row = await db.queryOne<ProductRow>(/* ... */)
    return ok(row !== null ? some(mapRowToProduct(row)) : none())
  } catch (e) {
    return err(mapDriverError(e))
  }
}
```

**Don't**
```typescript
const findById = async (id: ProductId): Promise<Product | null> => {
  return db.queryOne<Product>(/* ... */) // throws on connection failure
}
```

---

### Rule 3.2 — MUST: Not-found is modeled as `Option<T>`, never as `null` propagation, `undefined` return, or `throw`

**Rationale.** Not-found is a domain-legal outcome, not an error. Callers must handle absence explicitly. `throw` and `null` propagation both obscure this obligation.

**Do**
```typescript
type ProductRepository = {
  readonly findById: (id: ProductId) => Promise<Result<Option<Product>, DataError>>
}
```

**Don't**
```typescript
type ProductRepository = {
  readonly findById: (id: ProductId) => Promise<Product | null> // no error channel
  // or
  readonly findById: (id: ProductId) => Promise<Product> // throws when not found
}
```

---

### Rule 3.3 — MUST: Define a `DataError` discriminated union covering at minimum the following variants

**Rationale.** A typed error taxonomy prevents callers from pattern-matching on exception message strings and enables exhaustive handling.

Required minimum variants:

```typescript
type DataError =
  | { readonly kind: 'connection_failure';   readonly cause: unknown }
  | { readonly kind: 'constraint_violation'; readonly constraint: string }
  | { readonly kind: 'serialization_failure'; readonly cause: unknown }
  | { readonly kind: 'timeout';              readonly duration_ms: number }
  | { readonly kind: 'query_error';          readonly message: string }
  | { readonly kind: 'optimistic_conflict';  readonly entityId: string; readonly expectedVersion: number }
```

Additional project-specific variants are permitted and encouraged. The `kind` discriminant follows the TSF++ domain ADT convention.

---

### Rule 3.4 — MUST: Raw driver or ORM exceptions are never re-thrown across the adapter boundary

**Rationale.** Re-throwing converts a typed boundary into an untyped exception channel and defeats the `Result` contract.

**Do**
```typescript
const save = async (order: Order): Promise<Result<Order, DataError>> => {
  try {
    await db.query(INSERT_ORDER, [/* ... */])
    return ok(order)
  } catch (e) {
    return err(mapDriverError(e)) // mapped to typed DataError
  }
}
```

**Don't**
```typescript
const save = async (order: Order): Promise<Result<Order, DataError>> => {
  try {
    await db.query(INSERT_ORDER, [/* ... */])
    return ok(order)
  } catch (e) {
    throw e // typed contract broken — caller cannot handle this via Result
  }
}
```

---

### Rule 3.5 — MUST: Driver error mapping is implemented as a single, exhaustive function per data store

**Rationale.** Scattered ad hoc error mapping leads to inconsistent `DataError` payloads and missed cases. A central mapper is reviewable and testable.

**Do**
```typescript
// infrastructure/postgres/error-mapping.ts
const mapDriverError = (e: unknown): DataError => {
  if (isPgError(e)) {
    switch (e.code) {
      case '23505': return { kind: 'constraint_violation', constraint: e.constraint ?? 'unique' }
      case '23503': return { kind: 'constraint_violation', constraint: e.constraint ?? 'foreign_key' }
      case '57014': return { kind: 'timeout', duration_ms: 0 }
      // ...
    }
  }
  return { kind: 'query_error', message: String(e) }
}
```

---

## 4 — Transaction management

### Rule 4.1 — MUST: Transaction boundaries are defined at the use-case layer, not inside repository methods

**Rationale.** A repository method cannot know whether it is participating in a larger atomic operation. Transaction scope belongs to the orchestrator (use-case) that understands the full operation semantics.

**Do**
```typescript
// use-case/transfer-funds.ts
const transferFunds = (
  txn: Transaction,
  repos: { accounts: AccountRepository },
  input: TransferInput
): Promise<Result<Transfer, DataError>> =>
  pipe(
    repos.accounts.debit(txn, input.fromId, input.amount),
    chainResultAsync((_) => repos.accounts.credit(txn, input.toId, input.amount)),
  )
```

**Don't**
```typescript
// inside repository method — hidden transaction scope
const debit = async (id: AccountId, amount: Money): Promise<Result<Account, DataError>> => {
  await db.beginTransaction()
  // ...
  await db.commit()
}
```

---

### Rule 4.2 — MUST: Rollback behavior is deterministic and documented for every transactional operation

**Rationale.** Implicit rollback on exception is not a substitute for explicit, documented compensating behavior. The behavior under partial failure must be inspectable from the function signature and docblock.

**Do**
```typescript
/**
 * Transfers funds between two accounts atomically.
 *
 * Rollback behavior:
 *   - If debit fails, no DB state changes; returns Err(debit's DataError).
 *   - If credit fails after debit succeeded, transaction is rolled back;
 *     debit is reversed; returns Err(credit's DataError).
 *   - Idempotent on `Idempotency-Key` header when provided.
 */
const transferFunds = (
  txn: Transaction,
  repos: { accounts: AccountRepository },
  input: TransferInput,
): Promise<Result<Transfer, DataError>> => /* ... */
```

---

### Rule 4.3 — SHOULD: Prefer optimistic concurrency (version field or ETag) over pessimistic locking where throughput allows

**Rationale.** Pessimistic locks create contention, complicate error recovery, and are difficult to reason about under distributed retry. Optimistic concurrency externalizes conflict detection as a typed `DataError` variant.

```typescript
| { readonly kind: 'optimistic_conflict'; readonly entityId: string; readonly expectedVersion: number }

// repository checks version on update
const save = async (order: Order): Promise<Result<Order, DataError>> => {
  const result = await db.query(
    'UPDATE orders SET ..., version = version + 1 WHERE id = $1 AND version = $2',
    [order.id, order.version],
  )
  return result.rowCount === 0
    ? err({ kind: 'optimistic_conflict', entityId: order.id, expectedVersion: order.version })
    : ok({ ...order, version: order.version + 1 })
}
```

---

### Rule 4.4 — SHOULD: Long-running operations are decomposed into saga-style sequences with explicit compensating steps

**Rationale.** Holding a database transaction open across multiple async steps (especially those involving I/O to external systems) is a latency and deadlock risk. Sagas make partial failure explicit and recoverable.

**Do**
```typescript
// use-case/place-order-with-payment.ts
//
// Three steps, each its own short transaction.
// If a step fails, prior steps are explicitly compensated.

const placeOrderWithPayment = async (
  repos: Repos,
  payments: PaymentGateway,
  input: PlaceOrderInput,
): Promise<Result<Order, OrderError>> => {
  // Step 1: reserve inventory
  const reservation = await repos.inventory.reserve(input.items)
  if (isErr(reservation)) return reservation

  // Step 2: charge payment
  const charge = await payments.charge(input.payment, input.total)
  if (isErr(charge)) {
    await repos.inventory.releaseReservation(reservation.value.id) // compensate
    return err({ kind: 'payment_failed', cause: charge.error })
  }

  // Step 3: create order
  const order = await repos.orders.create(input, reservation.value, charge.value)
  if (isErr(order)) {
    await payments.refund(charge.value.id)                          // compensate
    await repos.inventory.releaseReservation(reservation.value.id)  // compensate
    return order
  }

  return order
}
```

**Don't**
```typescript
// One giant transaction held open across a network call to the payment gateway
await db.transaction(async (txn) => {
  await repos.inventory.reserve(txn, input.items)
  await payments.charge(input.payment, input.total) // network I/O inside DB txn
  await repos.orders.create(txn, input)
})
```

---

### Rule 4.5 — MUST: Side effects to external systems (HTTP, queues, email) are never performed inside a database transaction

**Rationale.** A database transaction can be rolled back; an HTTP call or email cannot. Mixing them creates inconsistencies where the side effect succeeds but the DB state is rolled back, or vice versa. Use the outbox pattern: write an event row inside the transaction, dispatch it after commit.

**Do**
```typescript
await db.transaction(async (txn) => {
  await repos.orders.create(txn, order)
  await repos.outbox.append(txn, { kind: 'order_created', orderId: order.id }) // event row, not HTTP call
})
// dispatcher (separate process) reads the outbox table and publishes events
```

**Don't**
```typescript
await db.transaction(async (txn) => {
  await repos.orders.create(txn, order)
  await emailService.send(order.customerEmail, 'Order confirmed') // irrevocable side effect inside txn
})
```

---

## 5 — Schema and migration governance

### Rule 5.1 — MUST: Schema changes are managed via migration files with sequential identifiers

**Rationale.** Ad hoc schema edits are unrepeatable and audit-hostile. Sequential migration files make schema history deterministic and reviewable.

```
migrations/
  0001_initial_schema.sql
  0002_add_users_email_index.sql
  0003_add_orders_table.sql
```

---

### Rule 5.2 — MUST: Migrations are additive by default; destructive changes require an explicit deprecation migration pair

**Rationale.** Destructive changes (column drops, renames, type changes) are irreversible and break backward compatibility across deploys. A deprecation window allows dual-read/write compatibility before removal.

Pattern:
1. Add new column / table.
2. Deploy application to read/write both old and new.
3. Backfill data.
4. Deploy application to use only new column.
5. Drop old column in a subsequent migration.

---

### Rule 5.3 — MUST: Migrations are idempotent where the target migration tool permits; re-running must not corrupt state

**Rationale.** Migration tooling is often retried on failure. Non-idempotent migrations cause data corruption under retry.

**Do**
```sql
-- 0007_add_users_phone.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
```

**Don't**
```sql
-- 0007_add_users_phone.sql
ALTER TABLE users ADD COLUMN phone TEXT;          -- fails on retry: column already exists
CREATE UNIQUE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL; -- same
```

---

### Rule 5.4 — MUST: Migration files are code-reviewed with the same rigor as application source

**Rationale.** Schema changes are high-impact, long-lived, and difficult to revert. They require the same scrutiny as production code.

---

### Rule 5.5 — SHOULD: Schema changes and the application code that depends on them are coupled in the same pull request or in an explicitly sequenced pair

**Rationale.** Schema and application drift causes deployment failures. Coupling them makes review and rollout order explicit.

---

## 6 — Connection lifecycle

### Rule 6.1 — MUST: Connection pools are configured with explicit bounds: minimum size, maximum size, acquisition timeout, and idle timeout

**Rationale.** Unconfigured pools inherit driver defaults, which are rarely appropriate for production workloads and may exhaust database connections silently.

**Do**
```typescript
const pool = createPool({
  connectionString: env.DATABASE_URL,
  min: 2,
  max: 20,
  acquireTimeoutMillis: 3_000,
  idleTimeoutMillis: 30_000,
  statementTimeoutMillis: 10_000,
})
```

**Don't**
```typescript
const pool = createPool({ connectionString: env.DATABASE_URL }) // implicit defaults
```

---

### Rule 6.2 — MUST: Connections are released promptly after use; connections must not be held across unrelated async operations

**Rationale.** Holding connections longer than necessary starves the pool and degrades throughput under concurrency.

**Do**
```typescript
const handler = async (req: Request): Promise<Response> => {
  const user = await pool.withConnection((conn) => repos.users.findById(conn, req.userId)) // released here
  const enriched = await externalEnrichmentService.enrich(user)                              // no DB conn held
  return await pool.withConnection((conn) => repos.users.save(conn, enriched))               // new acquisition
}
```

**Don't**
```typescript
const handler = async (req: Request): Promise<Response> => {
  const conn = await pool.acquire()
  const user = await repos.users.findById(conn, req.userId)
  const enriched = await externalEnrichmentService.enrich(user) // DB conn held across HTTP call
  await repos.users.save(conn, enriched)
  conn.release()
}
```

---

### Rule 6.3 — MUST: Connection acquisition failure is a typed `DataError`, not an unhandled rejection

**Rationale.** Pool exhaustion and connection failures are operationally routine. Callers must handle them through the standard `Result` channel.

---

### Rule 6.4 — SHOULD: Health check endpoints verify data store reachability via a lightweight probe query, not by acquiring a general-purpose connection

**Rationale.** Health checks must not consume pool capacity needed for application queries.

---

## 7 — Data mapping

### Rule 7.1 — MUST: Row types (raw ORM or driver output) are distinct from domain types; mapping is explicit and co-located with the repository

**Rationale.** ORM row shapes are determined by the storage schema. Domain types are determined by domain invariants. Conflating them creates schema-domain coupling and bypasses smart constructor validation.

**Do**
```typescript
// Row type — mirrors DB schema exactly
type UserRow = {
  readonly id:         string
  readonly email:      string
  readonly created_at: Date
  readonly version:    number
}

// Mapping function — co-located with repository
const mapRowToUser = (row: UserRow): Result<User, DataError> =>
  pipe(
    mkUserId(row.id),
    mapResult((id) => mkUser({ id, email: row.email as Email, createdAt: row.created_at })),
  )
```

**Don't**
```typescript
// Row shape used directly as domain type
type User = { id: string; email: string; created_at: Date } // no branding, no validation
```

---

### Rule 7.2 — MUST: Domain objects are constructed via smart constructors from row data; direct field assignment from row to domain type is forbidden

**Rationale.** Smart constructors enforce domain invariants at construction time. Bypassing them via direct field assignment creates unchecked domain objects.

---

### Rule 7.3 — MUST: Row types are `readonly`; mutation of a row object before mapping is forbidden

**Rationale.** Row mutation introduces a mutable intermediate state that is neither a valid DB row nor a valid domain object. Mapping must be a pure transformation from raw row to domain type.

---

### Rule 7.4 — SHOULD: Mapping functions are pure, explicitly typed, and independently unit-testable

**Rationale.** Mapping logic is often complex (date normalization, enum conversion, JSON column deserialization). Pure mapping functions can be tested with fast-check property tests without a database.

---

### Rule 7.5 — SHOULD: DB field names follow the storage naming convention (typically `snake_case`); domain field names follow TSF++ naming convention (`camelCase`); the mapping function bridges both explicitly

**Rationale.** Keeping naming conventions consistent within each layer makes both the schema and the domain model readable in their own context.

---

### Rule 7.6 — MUST: Nullable database columns map to `Option<T>` in the domain type, never to `T | null` or `T | undefined`

**Rationale.** `null` and `undefined` propagation violates TSF++ Rule 6.3 and discards the explicit absence semantics that `Option` provides. The mapping function is the boundary where SQL nullability becomes typed optionality.

**Do**
```typescript
type UserRow = {
  readonly id:         string
  readonly email:      string
  readonly phone:      string | null  // nullable in DB
  readonly created_at: Date
}

type User = {
  readonly id:        UserId
  readonly email:     Email
  readonly phone:     Option<Phone>   // explicit optionality in domain
  readonly createdAt: Date
}

const mapRowToUser = (row: UserRow): Result<User, DataError> => /* ... */
  // phone: row.phone === null ? none() : some(mkPhone(row.phone))
```

**Don't**
```typescript
type User = {
  readonly id:    UserId
  readonly email: Email
  readonly phone: Phone | null // null leaks into the domain
}
```

---

### Rule 7.7 — MUST: JSON columns have a typed schema validated at the mapping boundary; raw `unknown` JSON never crosses into the domain

**Rationale.** JSON columns are a back door around schema typing. Without a runtime schema (Zod or equivalent) at the mapping boundary, malformed or stale JSON corrupts the domain object silently.

**Do**
```typescript
const UserPreferencesSchema = z.object({
  theme:         z.enum(['light', 'dark']),
  notifications: z.boolean(),
})
type UserPreferences = z.infer<typeof UserPreferencesSchema>

const mapRowPreferences = (raw: unknown): Result<UserPreferences, DataError> => {
  const parsed = UserPreferencesSchema.safeParse(raw)
  return parsed.success
    ? ok(parsed.data)
    : err({ kind: 'serialization_failure', cause: parsed.error })
}
```

**Don't**
```typescript
type UserRow = { readonly preferences: any }                  // any forbidden by TSF++ 1.5
const prefs: UserPreferences = row.preferences as UserPreferences // unguarded cast
```

---

### Rule 7.8 — MUST: Timestamp columns store UTC; timezone conversion happens at the presentation layer only

**Rationale.** Storing local time creates ambiguity (DST transitions, multi-region deployments) that is impossible to resolve without a separate timezone column. UTC at rest is the only consistent policy.

**Do**
```sql
-- schema
created_at TIMESTAMPTZ NOT NULL DEFAULT now() -- timezone-aware, stored as UTC
```

```typescript
// domain type carries UTC Date; presentation converts to user's timezone
const formatForUser = (createdAt: Date, tz: TimeZone): string =>
  formatInTimeZone(createdAt, tz, 'yyyy-MM-dd HH:mm')
```

**Don't**
```sql
created_at TIMESTAMP NOT NULL -- no timezone information; ambiguous
```

---

## 8 — Pagination and collection access

### Rule 8.1 — MUST: Collection queries are paginated; unbounded collection returns are forbidden

**Rationale.** Returning an entire table or large collection in a single query is a denial-of-service risk and a performance failure. All collection endpoints impose a page size ceiling.

---

### Rule 8.2 — MUST: Cursor-based pagination is the default for mutable datasets; offset pagination is permitted only for stable or bounded datasets with documented justification

**Rationale.** Offset pagination is inconsistent under concurrent writes (rows shift between pages). Cursor-based pagination is stable and scales to arbitrary dataset sizes.

```typescript
type CursorPage = {
  readonly cursor: string | null
  readonly limit: number
}

type PagedResult<A> = {
  readonly items: ReadonlyArray<A>
  readonly nextCursor: string | null
  readonly total: number | null
}
```

---

### Rule 8.3 — MUST: Maximum page size is enforced at the repository level, not only at the API boundary

**Rationale.** Defense in depth: the repository must protect the database from overload regardless of upstream validation.

---

### Rule 8.4 — SHOULD: Total count queries (`COUNT(*)`) are separated from data queries and are opt-in

**Rationale.** Count queries are expensive on large tables. Many clients do not need an exact total and can use cursor presence to determine whether more results exist.

---

### Rule 8.5 — MUST: Cursor pagination sort keys must be deterministic; sort by a non-unique column requires an explicit tiebreaker (typically the primary key)

**Rationale.** Without a deterministic ordering, a cursor cannot reliably identify "the next row after this point." Rows with the same sort-column value may be skipped or duplicated between pages. The tiebreaker — usually the primary key — guarantees stable ordering.

**Do**
```sql
SELECT id, name, created_at
FROM products
WHERE (created_at, id) < ($cursor_created_at, $cursor_id)
ORDER BY created_at DESC, id DESC          -- created_at not unique → id as tiebreaker
LIMIT $1
```

**Don't**
```sql
SELECT id, name, created_at
FROM products
WHERE created_at < $cursor_created_at
ORDER BY created_at DESC                   -- two rows with identical created_at → undefined order
LIMIT $1
```

---

## 9 — Audit and lifecycle

### Rule 9.1 — SHOULD: Tables containing user-visible records have `created_at` and `updated_at` audit columns populated automatically

**Rationale.** Audit columns are operationally invaluable for debugging, support, and incident response. Populating them automatically (DB default + trigger or ORM hook) prevents inconsistencies.

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- updated_at maintained via trigger or ORM hook on every UPDATE
```

---

### Rule 9.2 — MUST: An aggregate uses either soft delete or hard delete consistently across all its operations; mixing both within one aggregate is forbidden

**Rationale.** Mixed deletion policies produce ambiguous queries (does this view show deleted records?) and correctness bugs (joins against soft-deleted rows). Choose one policy per aggregate and document it.

---

### Rule 9.3 — MUST: When soft delete is used, all default queries filter `deleted_at IS NULL`; access to soft-deleted records requires an explicit method

**Rationale.** Forgetting the `deleted_at IS NULL` clause is the most common soft-delete bug. The default repository methods must apply it implicitly; recovery or audit access uses a separately named method (e.g. `findByIdIncludingDeleted`).

**Do**
```typescript
type OrderRepository = {
  readonly findById:                (id: OrderId) => Promise<Result<Option<Order>, DataError>>  // filters deleted_at IS NULL
  readonly findByIdIncludingDeleted: (id: OrderId) => Promise<Result<Option<Order>, DataError>> // explicit override
}
```

---

### Rule 9.4 — SHOULD: Soft-deleted records have a retention policy with documented purge schedule

**Rationale.** Soft-deleted data accumulates indefinitely without a purge policy. Privacy regulations and storage cost both require eventual hard deletion.

---

## 10 — Testing

### Rule 10.1 — MUST: Repository adapters have integration tests against a real or containerized instance of the target data store

**Rationale.** Only real database integration catches constraint behavior, index semantics, transaction isolation, and ORM edge cases. Mocking the database does not test the adapter.

---

### Rule 10.2 — MUST: Domain and use-case unit tests use in-memory repository stubs, not real connections

**Rationale.** Use-case tests must be fast and deterministic. The repository interface (a record of functions) makes in-memory stubbing trivial without a mocking library.

```typescript
const stubUserRepository = (initial: ReadonlyArray<User> = []): UserRepository => {
  const store = new Map(initial.map((u) => [u.id, u]))
  return {
    findById: async (id) => ok(store.has(id) ? some(store.get(id)!) : none()),
    save:     async (user) => { store.set(user.id, user); return ok(user) },
  }
}
```

---

### Rule 10.3 — MUST: Mapping functions (row → domain) have tests covering valid inputs, boundary cases, and invalid inputs returning `Result` errors

**Rationale.** Mapping functions are the last line of defense before untrusted database data enters the domain. Property-based tests with fast-check are well-suited here.

---

### Rule 10.4 — SHOULD: Migration tests verify that applying and rolling back migrations leaves the schema in the expected state

**Rationale.** Migration correctness cannot be assumed from reading the file. Automated round-trip verification prevents silent destructive migration bugs.

---

### Rule 10.5 — SHOULD: Integration tests cover constraint violation paths (duplicate key, foreign-key violation, optimistic conflict) as typed `DataError` cases

**Rationale.** Constraint violations are not exceptional in a production system — they are operationally routine. The typed error path for each constraint must be verified.

---

## 11 — Forbidden constructs (summary)

| Construct | Rule | Level |
|---|---|---|
| Direct data store access from domain or use-case layer | 1.1 | MUST NOT |
| Class-based repository implementations | 1.2 | MUST NOT |
| Multiple aggregate roots in one repository | 1.5 | MUST NOT |
| String interpolation of dynamic query values | 2.1 | MUST NOT |
| `SELECT *` in production queries | 2.2 | MUST NOT |
| Unvalidated dynamic sort/filter fields | 2.3 | MUST NOT |
| N+1 query patterns in repository collection methods | 2.4 | MUST NOT |
| Repository functions returning `T \| null` or throwing | 3.1, 3.2 | MUST NOT |
| Re-throwing raw driver exceptions across the boundary | 3.4 | MUST NOT |
| Ad hoc driver error mapping scattered across files | 3.5 | MUST NOT |
| Transaction boundaries inside repository methods | 4.1 | MUST NOT |
| External side effects (HTTP, email, queue) inside DB transactions | 4.5 | MUST NOT |
| Non-idempotent migrations | 5.3 | MUST NOT |
| Unreviewed migration files | 5.4 | MUST NOT |
| Unconfigured connection pools | 6.1 | MUST NOT |
| Connections held across unrelated async operations | 6.2 | MUST NOT |
| Direct field assignment from row to domain type | 7.2 | MUST NOT |
| Mutable row types | 7.3 | MUST NOT |
| Nullable columns mapped to `T \| null` instead of `Option<T>` | 7.6 | MUST NOT |
| Untyped JSON columns crossing the mapping boundary | 7.7 | MUST NOT |
| Non-UTC timestamp columns | 7.8 | MUST NOT |
| Unbounded collection queries | 8.1 | MUST NOT |
| Cursor pagination without deterministic tiebreaker | 8.5 | MUST NOT |
| Mixed soft and hard delete within one aggregate | 9.2 | MUST NOT |
| Default queries that include soft-deleted records | 9.3 | MUST NOT |
| Real database connections in use-case unit tests | 10.2 | MUST NOT |

---

## Appendix A — Recommended type patterns

### DataError union

```typescript
type DataError =
  | { readonly kind: 'connection_failure';    readonly cause: unknown }
  | { readonly kind: 'constraint_violation';  readonly constraint: string }
  | { readonly kind: 'serialization_failure'; readonly cause: unknown }
  | { readonly kind: 'timeout';               readonly duration_ms: number }
  | { readonly kind: 'query_error';           readonly message: string }
  | { readonly kind: 'optimistic_conflict';   readonly entityId: string; readonly expectedVersion: number }
```

### Repository interface pattern

```typescript
type ProductRepository = {
  readonly findById:     (id: ProductId) => Promise<Result<Option<Product>, DataError>>
  readonly findByStatus: (status: ProductStatus, page: CursorPage) => Promise<Result<PagedResult<Product>, DataError>>
  readonly save:         (product: Product) => Promise<Result<Product, DataError>>
  readonly delete:       (id: ProductId) => Promise<Result<void, DataError>>
}
```

### Row type vs domain type

```typescript
// Row type — mirrors DB schema; owned by the adapter module
type ProductRow = {
  readonly id:          string
  readonly name:        string
  readonly status:      string
  readonly price_cent:  number
  readonly description: string | null
  readonly preferences: unknown
  readonly created_at:  Date
  readonly version:     number
}

// Mapping — pure function, co-located with repository
const mapRowToProduct = (row: ProductRow): Result<Product, DataError> =>
  pipe(
    sequenceResults({
      id:          mkProductId(row.id),
      name:        mkProductName(row.name),
      status:      mkProductStatus(row.status),
      price:       mkMoney(row.price_cent),
      description: row.description === null ? ok(none()) : mapResult(some)(mkDescription(row.description)),
      preferences: mapRowPreferences(row.preferences),
    }),
    mapResult((fields) => ({ ...fields, createdAt: row.created_at, version: row.version })),
  )
```

---

## Appendix B — Review checklist

- [ ] All data store access goes through a repository adapter
- [ ] Repository interface is a typed record of functions, not a class
- [ ] One aggregate root per repository
- [ ] All repository functions return `Result<T, DataError>` or `Result<Option<T>, DataError>`
- [ ] No raw exceptions escape the adapter boundary
- [ ] Driver error mapping is centralized in one function per data store
- [ ] All queries are parameterized; no string interpolation of values
- [ ] No `SELECT *`
- [ ] Dynamic sort/filter fields are allow-listed before query construction
- [ ] No N+1 patterns in collection methods
- [ ] Transaction boundaries are at the use-case layer
- [ ] No external side effects inside DB transactions (use outbox pattern)
- [ ] Migration files are sequentially numbered, idempotent, and reviewed
- [ ] Connection pools have explicit bounds
- [ ] Connections are not held across unrelated async operations
- [ ] Row types are `readonly` and distinct from domain types
- [ ] Domain objects are constructed via smart constructors from row data
- [ ] Nullable columns map to `Option<T>`
- [ ] JSON columns are validated via schema at the mapping boundary
- [ ] Timestamp columns store UTC
- [ ] Collection queries are paginated with an enforced maximum page size
- [ ] Cursor pagination has a deterministic sort with explicit tiebreaker
- [ ] Soft/hard delete policy is consistent per aggregate
- [ ] Default queries filter out soft-deleted records
- [ ] Repository integration tests run against a real or containerized store
- [ ] Use-case tests use in-memory repository stubs
- [ ] Mapping functions have property-based tests

---

## Appendix C — TSF++ intersection crosswalk

| TSF++/Data area | TSF++ intersection | Why this overlap matters |
|---|---|---|
| Repository as typed record of functions (Rule 1.2) | 1.9 | No classes; repository is a product type of functions, composable and stubbable. |
| Result-wrapping at adapter boundary (Rule 3.1) | 6.2 | `throw` is forbidden outside adapter boundaries; all failures must be typed `Result`. |
| `Option` for not-found (Rule 3.2) | 6.3 | Partiality is typed; `null`/`undefined` propagation without `Option` is forbidden. |
| Nullable columns → `Option` (Rule 7.6) | 6.3 | The mapping boundary is where SQL nullability becomes typed optionality. |
| JSON columns require schema (Rule 7.7) | 1.5 | `unknown` at I/O boundaries must be narrowed before crossing into domain code. |
| Parameterized queries (Rule 2.1) | 1.5, SECURITY 2.4 | Untrusted values must never enter query strings. |
| Row types are `readonly` (Rule 7.3) | 2.2, 2.3 | All record fields are `readonly`; mutation after construction is forbidden. |
| Smart constructor mapping from rows (Rule 7.2) | 1.3 | Domain invariants are enforced only via smart constructors; persistence objects do not bypass this. |
| In-memory stubs for unit tests (Rule 10.2) | 8.1, 8.2 | Repository-as-function-record makes stubbing zero-overhead. |
| Exhaustive `DataError` handling (Rule 3.3) | 1.1, 1.2 | Typed error unions with `kind` discriminant; callers must handle all variants exhaustively via `absurd`. |
| Outbox pattern for side effects (Rule 4.5) | 6.5 | Pure/effect separation: irrevocable effects belong outside the transactional boundary. |

---

## Appendix D — References

1. **TSF++ Coding Standard** — repository `CODING_STANDARD.md`.
2. **TSF++/Security Coding Standard** — repository `SECURITY_CODING_STANDARD.md` (Rules 2.4, 5.1–5.4).
3. **Fowler, M.** — *Patterns of Enterprise Application Architecture*, Addison-Wesley (2002) — Repository pattern, Unit of Work, Outbox.
4. **Wlaschin, S.** — *Domain Modeling Made Functional*, Pragmatic Bookshelf (2018) — Smart constructors, typed errors, persistence separation.
5. **Garcia-Molina, H. & Salem, K.** — *Sagas*, ACM SIGMOD (1987) — Saga pattern for long-running transactions.
6. **Drizzle ORM** — https://orm.drizzle.team/
7. **Kysely** — https://kysely.dev/ — Type-safe SQL query builder.
8. **OWASP SQL Injection Prevention Cheat Sheet** — https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
9. **fast-check** — https://fast-check.dev/ — Property-based testing for mapping function coverage.
10. **Testcontainers (Node.js)** — https://node.testcontainers.org/ — Containerized integration test stores.