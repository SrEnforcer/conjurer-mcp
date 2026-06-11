# API_CODING_STANDARD.md — Functional HTTP API Design and Implementation

This standard is mandatory for all API design, implementation, comments, and documentation in the repository. English only.
Codename TSF++/API (tsfpp-api)


**Version:** 1.0.0
**Date:** 2026-05-14
**Classification:** Normative — repository-wide
**Status:** Profile of TSF++ (`CODING_STANDARD.md`) for API code and contracts
**Modelled after:** TSF++ base standard, JSF++ AV Rules, JPL Power of Ten, HTTP RFCs, OWASP API Security Top 10

---

## Preamble

### Relationship to TSF++

This document is a profile of TSF++. Every rule in `CODING_STANDARD.md` applies to API code unchanged. This standard adds rules specific to API surface design, HTTP semantics, contract governance, and runtime implementation.
Intersections with TSF++ rules are explicitly listed in Appendix C to make overlap auditable during review.

Read TSF++ first. Read this second.

### Scope

This standard governs all HTTP API-related TypeScript code, including:
- Route definitions and handlers
- Request and response schemas
- Serialization and deserialization boundaries
- Error mapping and status code selection
- API authentication and authorization wiring
- API-specific tests and contract verification
- OpenAPI or equivalent API documentation artifacts

It does not apply to:
- Generated OpenAPI clients/servers (must be isolated behind a conforming facade)
- Third-party middleware internals
- Non-HTTP transports (unless explicitly profiled by a separate standard)

### Philosophical axioms (non-negotiable)

1. **Contract first, implementation second.** The API contract is a public product, not a side effect of handler code.
2. **HTTP semantics are type semantics.** Method, status code, and cache behavior are part of correctness.
3. **Errors are data.** Failure modes must be explicit, typed, and machine-readable.
4. **Validation at every boundary.** No unvalidated input crosses into the domain core.
5. **Security and observability are baseline behavior, not optional enhancements.**

### Compliance levels

| Level    | Meaning |
|----------|---------|
| **MUST** | Mandatory. Violation requires approved deviation per TSF++ deviation procedure. |
| **SHOULD** | Expected in all new code. May be relaxed with review rationale. |
| **MAY** | Recommended practice. Encouraged but not enforced by tooling. |

---

## 1 — API Contract Design

### Rule 1.1 — MUST: Every endpoint has an explicit, versioned contract document

**Rationale.** Consumers integrate with contracts, not internal code. Every endpoint must be representable in OpenAPI (or equivalent) with request schema, response schema, status codes, auth requirements, and examples.

---

### Rule 1.2 — MUST: Use resource-oriented URL design with nouns, not verbs

**Rationale.** HTTP methods already express actions. Resource URLs remain stable and composable over time.

**Do**
```http
GET /v1/artists/{artistId}
POST /v1/tracks
PATCH /v1/tracks/{trackId}
```

**Don't**
```http
POST /v1/getArtist
POST /v1/updateTrack
```

---

### Rule 1.3 — MUST: URI paths are lowercase kebab-case; IDs are path parameters; filtering and pagination are query parameters

**Rationale.** A uniform URL grammar prevents consumer confusion and improves cache and log consistency.

---

### Rule 1.4 — MUST: Avoid deep nesting beyond 2 resource levels

**Rationale.** Deeply nested endpoints couple unrelated aggregate boundaries and create path instability.

**Do**
```http
GET /v1/artists/{artistId}/tracks
GET /v1/tracks/{trackId}/ratings
```

**Don't**
```http
GET /v1/labels/{labelId}/artists/{artistId}/albums/{albumId}/tracks/{trackId}
```

---

### Rule 1.5 — MUST: Version APIs at the path root (`/v1`) and maintain backward compatibility within a major version

**Rationale.** Versioning at root is operationally explicit and easy to route, monitor, and deprecate.

---

### Rule 1.6 — SHOULD: Use plural resource names for collections and singular IDs for members

**Rationale.** Consistent naming improves discoverability and avoids one-off exceptions.

---

## 2 — HTTP Methods and Status Semantics

### Rule 2.1 — MUST: HTTP methods preserve standard semantics

**Rationale.** Method misuse breaks infrastructure assumptions and client caching behavior.

- `GET` is safe and idempotent
- `HEAD` mirrors `GET` metadata only
- `POST` creates or triggers non-idempotent operations
- `PUT` replaces a full resource idempotently
- `PATCH` partially updates idempotently where designed
- `DELETE` deletes idempotently

---

### Rule 2.2 — MUST: Return the most specific correct status code; do not collapse to `200`

**Rationale.** Status code precision is part of machine contract.

Common required mappings:
- `200 OK` successful read/update with body
- `201 Created` successful creation (include `Location` when applicable)
- `202 Accepted` accepted async operation
- `204 No Content` successful operation with no body
- `400 Bad Request` invalid syntax or malformed request
- `401 Unauthorized` missing/invalid authentication
- `403 Forbidden` authenticated but not authorized
- `404 Not Found` resource missing
- `409 Conflict` optimistic locking conflict or invariant conflict
- `412 Precondition Failed` failed conditional request
- `415 Unsupported Media Type` unsupported `Content-Type`
- `422 Unprocessable Entity` schema-valid envelope with domain validation failure
- `429 Too Many Requests` rate limit exceeded
- `500 Internal Server Error` unexpected server fault
- `503 Service Unavailable` dependency outage/maintenance

---

### Rule 2.3 — MUST: Idempotency requirements are explicit for write operations

**Rationale.** Retries are unavoidable in distributed systems. Endpoint behavior under retry must be deterministic.

Guidance:
- `PUT` and `DELETE` must be idempotent by design
- `POST` endpoints that create side effects should support `Idempotency-Key` where retries are expected

---

### Rule 2.4 — SHOULD: Support conditional requests (`ETag`, `If-Match`, `If-None-Match`) for mutable and cacheable resources

**Rationale.** Conditional requests reduce race conditions and network cost.

---

## 3 — Request Validation and Parsing

### Rule 3.1 — MUST: Validate all inbound data at the API boundary using a runtime schema

**Rationale.** TypeScript types alone do not validate runtime payloads. Use schema validators (for example, Zod) before mapping into domain types.

Inbound surfaces requiring validation:
- Path params
- Query params
- Headers (including auth and idempotency headers)
- Body payload
- Cookies (if used)

---

### Rule 3.2 — MUST: Convert validated input into domain smart constructors before core logic

**Rationale.** API-level schema validity is necessary but not sufficient for domain invariants.

---

### Rule 3.3 — MUST: Reject unknown fields unless the endpoint contract explicitly permits extensibility

**Rationale.** Silent acceptance of unknown fields causes producer/consumer drift and security ambiguity.

---

### Rule 3.4 — MUST: Use explicit locale and timezone handling for date/time inputs

**Rationale.** Implicit locale parsing creates nondeterministic behavior across environments.

---

### Rule 3.5 — SHOULD: Normalize string inputs (trim, Unicode normalization, case policy) as part of boundary parsing

**Rationale.** Normalization prevents duplicate logical identities and subtle search mismatch.

---

## 4 — Response Contract and Serialization

### Rule 4.1 — MUST: All JSON responses use a consistent envelope shape

**Rationale.** Uniform envelopes simplify client SDK generation, telemetry parsing, and error handling.

Required envelope:
```typescript
type ApiResponse<T, E> = {
  readonly success: boolean
  readonly data: T | null
  readonly error: E | null
  readonly meta: ApiMeta | null
}
```

Where:
- `success = true` implies `data != null` and `error = null`
- `success = false` implies `data = null` and `error != null`

---

### Rule 4.2 — MUST: Error responses include stable machine codes and human-readable messages

**Rationale.** Clients branch on error code, humans diagnose with message.

Minimum error payload:
```typescript
type ApiError = {
  readonly code: string
  readonly message: string
  readonly details: ReadonlyArray<{ readonly field: string; readonly issue: string }> | null
  readonly traceId: string
}
```

---

### Rule 4.3 — MUST: Do not leak internals in error messages (stack traces, SQL, dependency hostnames, secrets)

**Rationale.** Internal detail leakage is both a security and operational risk.

---

### Rule 4.4 — MUST: Serialize dates in RFC 3339/ISO-8601 UTC format

**Rationale.** Avoids locale ambiguity and preserves lexical sortability for timestamps.

---

### Rule 4.5 — SHOULD: Preserve field stability; additive changes are preferred; breaking field changes require major version increment

**Rationale.** Contract stability reduces client churn and rollout risk.

---

## 5 — Pagination, Filtering, Sorting, and Search

### Rule 5.1 — MUST: Collection endpoints are paginated by default

**Rationale.** Unbounded responses are denial-of-service vectors and latency regressions.

Required query shape:
- `limit` with bounded maximum
- `cursor` (preferred) or `offset`

---

### Rule 5.2 — SHOULD: Prefer cursor pagination over offset pagination for mutable datasets

**Rationale.** Cursor pagination is stable under concurrent insertions/deletions.

---

### Rule 5.3 — MUST: Sorting and filtering parameters are explicit and allow-listed

**Rationale.** Unbounded sort/filter fields create injection and performance risk.

---

### Rule 5.4 — MUST: Response `meta` includes pagination state

**Rationale.** Clients require explicit continuation and count semantics.

Minimum pagination metadata:
```typescript
type PaginationMeta = {
  readonly limit: number
  readonly nextCursor: string | null
  readonly total: number | null
}
```

---

### Rule 5.5 — SHOULD: Search endpoints declare ranking semantics and tie-break policy

**Rationale.** Search results without deterministic tie-break create unstable UX and hard-to-reproduce bugs.

---

## 6 — Authentication and Authorization

### Rule 6.1 — MUST: Authentication and authorization are separate concerns in code and contracts

**Rationale.** Authentication answers "who"; authorization answers "may they". Mixing concerns obscures denial reasons and policy maintenance.

---

### Rule 6.2 — MUST: Every protected endpoint defines required auth scheme and scopes/permissions in contract docs

**Rationale.** Authorization behavior is part of public API contract.

---

### Rule 6.3 — MUST: Return `401` for missing/invalid credentials and `403` for insufficient permissions

**Rationale.** This distinction is contractually significant for clients and monitoring.

---

### Rule 6.4 — MUST: Sensitive operations require explicit audit events

**Rationale.** Mutations involving privilege, ownership transfer, deletion, or export must be traceable.

---

### Rule 6.5 — SHOULD: Use short-lived access tokens and rotate refresh credentials per security policy

**Rationale.** Limits blast radius for token compromise.

---

## 7 — Security Baseline

### Rule 7.1 — MUST: Enforce rate limiting on all public endpoints

**Rationale.** Rate limiting is baseline abuse protection and capacity control.

---

### Rule 7.2 — MUST: Enforce payload size limits and request timeout budgets

**Rationale.** Prevents resource exhaustion and slow-loris style degradation.

---

### Rule 7.3 — MUST: Use parameterized queries and safe ORM APIs; never interpolate untrusted input into SQL or command strings

**Rationale.** Injection defense is mandatory regardless of framework.

---

### Rule 7.4 — MUST: Validate and sanitize all URL fetch targets in server-to-server calls to prevent SSRF

**Rationale.** External fetch endpoints are untrusted input.

---

### Rule 7.5 — MUST: No secrets in source, logs, or API payloads

**Rationale.** Secret exposure is an incident, not a minor defect.

---

### Rule 7.6 — SHOULD: Security headers and transport hardening are enforced at gateway and application layers

**Rationale.** Defense in depth.

Minimum expectations:
- TLS everywhere
- HSTS in production edge environments
- Strict content type handling

---

## 8 — Error Taxonomy and Failure Handling

### Rule 8.1 — MUST: Maintain a centralized error taxonomy with stable code names

**Rationale.** Ad hoc error strings fragment client behavior and analytics.

Error code categories SHOULD include:
- `validation_*`
- `auth_*`
- `permission_*`
- `not_found_*`
- `conflict_*`
- `rate_limit_*`
- `dependency_*`
- `internal_*`

---

### Rule 8.2 — MUST: Map domain and adapter failures to HTTP status at one dedicated boundary layer

**Rationale.** Prevents duplicated, inconsistent status mapping logic across handlers.

---

### Rule 8.3 — MUST: Retries are explicit, bounded, and idempotency-aware

**Rationale.** Unbounded retries amplify outages and can duplicate side effects.

---

### Rule 8.4 — SHOULD: Use circuit breaker/backoff patterns for unstable dependencies

**Rationale.** Dependency containment improves overall API availability.

---

## 9 — Concurrency, Consistency, and Idempotency

### Rule 9.1 — MUST: Concurrent write conflicts are handled explicitly (optimistic locking, compare-and-swap, or equivalent)

**Rationale.** Last-write-wins by accident is data loss by design.

---

### Rule 9.2 — MUST: Non-idempotent operations that clients may retry support idempotency keys

**Rationale.** Network retries must not produce duplicate side effects.

---

### Rule 9.3 — SHOULD: Asynchronous workflows return operation resources for polling when completion is delayed

**Rationale.** `202 Accepted` should include a deterministic progress path.

---

## 10 — Observability and Operability

### Rule 10.1 — MUST: Every request carries and returns a trace/correlation ID

**Rationale.** End-to-end tracing is mandatory for production diagnostics.

---

### Rule 10.2 — MUST: Structured logs (JSON) include method, route template, status, latency, principal, and trace ID

**Rationale.** Free-text logs cannot support reliable operational analytics.

---

### Rule 10.3 — MUST: Define and publish API SLO metrics

**Rationale.** Reliability requires explicit budgets, not anecdotal expectations.

Minimum metric set:
- Request rate
- Error rate by status family and endpoint
- Latency percentiles (`p50`, `p95`, `p99`)
- Saturation indicators

---

### Rule 10.4 — SHOULD: Emit domain-relevant business events separately from technical request logs

**Rationale.** Operational debugging and product analytics are different concerns.

---

## 11 — Performance and Caching

### Rule 11.1 — MUST: `GET` responses declare cache policy explicitly (`Cache-Control`, validators)

**Rationale.** Implicit caching behavior causes client inconsistency and avoidable load.

---

### Rule 11.2 — MUST: N+1 query patterns are prohibited in handlers

**Rationale.** N+1 behavior is a predictable latency and cost regression.

---

### Rule 11.3 — SHOULD: Use projection/select fields to avoid over-fetch and over-serialize

**Rationale.** Response size and serialization cost must be bounded intentionally.

---

### Rule 11.4 — SHOULD: Apply backpressure for expensive endpoints (queueing, admission control, or precomputed materialization)

**Rationale.** Protects shared infrastructure under burst traffic.

---

## 12 — Implementation Architecture (TSF++ API Profile)

### Rule 12.1 — MUST: Separate API code into layers with one-way dependency flow

Required flow:
1. Transport layer (HTTP framework adapters)
2. Boundary layer (parse/validate/map)
3. Use-case layer (domain orchestration)
4. Domain core (pure logic)
5. Infrastructure adapters (DB, queue, external APIs)

**Rationale.** Maintains TSF++ pure core and isolates effects.

---

### Rule 12.2 — MUST: Route handlers are thin; business logic lives in use-case/domain modules

**Rationale.** Handlers should orchestrate boundary mapping only, not embed policy.

---

### Rule 12.3 — MUST: Adapter exceptions are caught and converted to typed `Result` before crossing into core

**Rationale.** TSF++ Rule 6.2 applies directly to API adapters.

---

### Rule 12.4 — MUST: API modules enforce immutability and TSF++ constraints (`const`, readonly, no mutation, no class-based service objects)

**Rationale.** API code is not exempt from TSF++ safety guarantees.

---

### Rule 12.5 — SHOULD: Export each endpoint contract as typed request/response aliases from a dedicated contract module

**Rationale.** Encourages compile-time contract reuse across server, tests, and generated clients.

---

## 13 — Testing and Verification

### Rule 13.1 — MUST: Every endpoint has contract tests for success and each documented error path

**Rationale.** Status code and payload shape are part of API correctness.

---

### Rule 13.2 — MUST: Boundary validation tests cover malformed path/query/header/body inputs

**Rationale.** Boundary correctness is the first defense against invalid input and injection.

---

### Rule 13.3 — MUST: Integration tests verify authz behavior (`401`, `403`, scope constraints)

**Rationale.** Security posture cannot rely on unit tests alone.

---

### Rule 13.4 — SHOULD: Property-based tests are used for pure request/response transformers and domain mapping logic

**Rationale.** Extends TSF++ law-driven testing to API mapping boundaries.

---

### Rule 13.5 — SHOULD: API tests include idempotency and retry scenarios for mutation endpoints

**Rationale.** Distributed retry behavior must be validated, not assumed.

---

### Rule 13.6 — SHOULD: Consumer-driven contract tests are adopted for external clients with independent release cycles

**Rationale.** Prevents accidental breaking changes between teams.

---

## 14 — Documentation and Change Governance

### Rule 14.1 — MUST: Every endpoint has examples for request and response payloads in docs

**Rationale.** Schemas describe structure; examples communicate intent.

---

### Rule 14.2 — MUST: Breaking changes require explicit migration notes and major version increment

**Rationale.** Contract breakage without migration guidance is a release failure.

---

### Rule 14.3 — MUST: Deprecations declare sunset date and replacement path

**Rationale.** Open-ended deprecation is ungoverned drift.

---

### Rule 14.4 — SHOULD: Changelog entries reference endpoint IDs or operation IDs, not only generic prose

**Rationale.** Makes automated impact analysis possible.

---

## 15 — Forbidden Constructs (Profile-Specific Summary)

| Construct | Rule | Level |
|-----------|------|-------|
| Verb-based endpoint paths (`/getX`, `/updateY`) | 1.2 | MUST NOT |
| Unversioned public endpoints | 1.5 | MUST NOT |
| Status code flattening to `200` | 2.2 | MUST NOT |
| Unvalidated request input crossing boundary | 3.1 | MUST NOT |
| Unknown-field silent acceptance (unless documented) | 3.3 | MUST NOT |
| Ad hoc response shapes per endpoint | 4.1 | MUST NOT |
| Internal stack traces or secrets in API errors | 4.3 | MUST NOT |
| Unpaginated collection endpoints | 5.1 | MUST NOT |
| Missing auth contract on protected endpoints | 6.2 | MUST NOT |
| No rate limiting on public endpoints | 7.1 | MUST NOT |
| SQL/command interpolation with untrusted input | 7.3 | MUST NOT |
| Unbounded retries | 8.3 | MUST NOT |
| Hidden last-write-wins conflicts | 9.1 | MUST NOT |
| Missing trace/correlation IDs | 10.1 | MUST NOT |
| N+1 query pattern in handlers | 11.2 | MUST NOT |
| Fat handlers with embedded business logic | 12.2 | MUST NOT |
| Missing contract tests for documented errors | 13.1 | MUST NOT |
| Undocumented breaking changes | 14.2 | MUST NOT |

---

## Appendix A — Recommended API Response Shapes

```typescript
export type ApiMeta = {
  readonly requestId: string
  readonly timestamp: string
  readonly pagination: {
    readonly limit: number
    readonly nextCursor: string | null
    readonly total: number | null
  } | null
}

export type ApiError = {
  readonly code: string
  readonly message: string
  readonly details: ReadonlyArray<{
    readonly field: string
    readonly issue: string
  }> | null
  readonly traceId: string
}

export type ApiResponse<T> =
  | {
      readonly success: true
      readonly data: T
      readonly error: null
      readonly meta: ApiMeta | null
    }
  | {
      readonly success: false
      readonly data: null
      readonly error: ApiError
      readonly meta: ApiMeta | null
    }
```

---

## Appendix B — Endpoint Design Checklist

- [ ] URL is resource-oriented and versioned
- [ ] Method semantics are correct and idempotency defined
- [ ] Request schemas validate path/query/header/body
- [ ] Success and all error responses are documented and typed
- [ ] Error payload includes stable `code` and `traceId`
- [ ] Pagination/filter/sort are bounded and allow-listed
- [ ] Authn and authz requirements are declared
- [ ] Rate limiting and payload limits are configured
- [ ] Trace ID is propagated end-to-end
- [ ] Contract tests cover happy path and all documented failure paths
- [ ] OpenAPI examples are present and current
- [ ] Breaking/deprecation policy is documented for the change

---

## Appendix C — TSF++ Intersection Crosswalk

This appendix explicitly maps API-profile rules to their TSF++ baseline intersections.

| API profile area | TSF++ intersection | Why this overlap matters |
|------------------|--------------------|--------------------------|
| Boundary validation and parsing (Section 3) | 1.5, 6.3, 8.1 | Runtime inputs are untrusted and partiality must be typed before entering core logic. |
| Smart-constructor mapping at boundaries (Rule 3.2) | 1.3, 8.1 | Domain invariants are enforced only via smart constructors and total function contracts. |
| Response algebra and error payloads (Section 4) | 1.1, 6.1, 6.3 | Success/failure must be modeled as discriminated data, not implicit exception channels. |
| Adapter exception handling (Rule 12.3) | 6.2 | Exceptions are confined to adapter boundaries and converted to typed `Result`. |
| Pure/effect separation in handlers and use-cases (Rules 12.1-12.2) | 3.3, 6.5, 11.3 | Transport orchestration remains effectful while domain core remains pure and testable. |
| Immutability in API modules (Rule 12.4) | 2.1, 2.2, 2.3 | API code must maintain `const`/readonly discipline and avoid mutation side effects. |
| Error taxonomy and explicit failure mapping (Section 8) | 6.1, 6.3 | Errors are data with stable codes, enabling deterministic client behavior. |
| Contract and mapping property tests (Rule 13.4) | 8.2, 8.3 | Law-like behavior in pure transformers must be verified beyond examples. |
| Module boundaries and public contracts (Rule 12.5, Section 14) | 10.1, 11.4 | Public API surface needs documented, stable, explicitly exported contracts. |

---

## Appendix D — References

1. **TSF++ Coding Standard** — repository `CODING_STANDARD.md`.
2. **RFC 9110** — HTTP Semantics.
3. **RFC 9111** — HTTP Caching.
4. **RFC 9457** — Problem Details for HTTP APIs.
5. **OpenAPI Specification 3.1** — https://spec.openapis.org/oas/latest.html
6. **OWASP API Security Top 10** — https://owasp.org/API-Security/
7. **JSON Schema** — https://json-schema.org/
8. **Zod** — https://zod.dev/
9. **fast-check** — https://fast-check.dev/
10. **OpenTelemetry Specification** — https://opentelemetry.io/docs/specs/