# Rationale: §7 — Naming

Covers Rules 7.1–7.7 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 7.7 — Name effectful wrappers with `with`

Wrapper functions have a characteristic shape: they accept a handler/effectful function and return another function with the same interface but extra behavior (logging, timing, retries, idempotency, tracing).

The `with` prefix makes this shape obvious at call sites:

```typescript
const wrapped = withRetry(3, withLogging('sync-users', handler))
```

This reads as layered behavior in execution order. Names like `decorate`, `apply`, or `add` are less specific and hide wrapper intent.

The convention also improves review quality. A reviewer can scan for `withX` wrappers and reason quickly about cross-cutting concerns and composition order.
