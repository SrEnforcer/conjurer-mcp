# SECURITY_CODING_STANDARD.md — Functional security engineering for TSF++

This standard is mandatory for all security-relevant design, implementation, configuration, comments, and documentation in the repository. English only.
Codename TSF++/Security (tsfpp-security)

**Version:** 1.1.0
**Date:** 2026-05-14
**Classification:** Normative — repository-wide
**Status:** Security profile of TSF++ across core TypeScript, API, and React code
**Modelled after:** TSF++ base standard, OWASP ASVS 4.0, OWASP Top 10 (2021), OWASP API Security Top 10 (2023), NIST SSDF SP 800-218, CWE Top 25

---

## Preamble

### Relationship to TSF++

This document is the security profile of TSF++. Every rule in [`CODING_STANDARD.md`](./CODING_STANDARD.md) applies unchanged. This profile adds mandatory security constraints that cut across all other profiles ([`API_CODING_STANDARD.md`](./API_CODING_STANDARD.md) and [`REACT_CODING_STANDARD.md`](./REACT_CODING_STANDARD.md)).

Intersections with TSF++ rules and with the API and React profiles are explicitly listed in Appendix D to make overlap auditable during review.

Read TSF++ first. Read this second.

### How TSF++ makes security structural

A central thesis of this standard is that functional TypeScript — when applied correctly — eliminates entire vulnerability classes by construction, not by convention. The type system is the first proof; tests and CI gates are the second and third.

| TSF++ pattern | Security guarantee |
|---|---|
| Branded types + smart constructors | Untrusted raw strings cannot flow into domain logic unvalidated (CWE-20) |
| `Result`/`Option` — no `throw` | Error paths are total and explicit; internal topology cannot leak via unhandled exceptions |
| Readonly data, no mutation | Shared state cannot be silently corrupted in concurrent/async contexts |
| Discriminated unions + `absurd` | All authorization states are named; implicit "undecided" states become compile errors |
| Pure/effectful separation | Boundary adapters are the only sites where I/O (including secrets) can enter the system |

This profile operationalises those properties for security-specific concerns.

### Scope

This standard governs all user-authored code and security-relevant artifacts in the repository, including:

- Input validation and boundary parsing
- Authentication and authorization logic
- Secret and key handling
- Error handling and security logging
- Third-party dependency and supply-chain controls
- CI gates for security checks

It does not apply to:

- Third-party library internals outside your control
- Generated artifacts (which must be wrapped by a conforming facade)
- Infrastructure details owned externally (which must still meet contractual controls)

### Philosophical axioms (non-negotiable)

1. **Never trust input.** All external data is untrusted until validated and narrowed at a boundary. The type system must reflect this: `unknown` in, branded type out.
2. **Least privilege by default.** Every actor — user, service, process, token — receives the minimum capability required. Elevation is explicit and auditable.
3. **Secure failure over convenient failure.** When authorization or validation state is ambiguous, the system fails closed. A deny under uncertainty is correct behavior, not a bug.
4. **Secrets are never code.** Secrets are runtime-injected, rotation-ready, and absent from source history, logs, and snapshots.
5. **Security is testable behavior.** Security controls are encoded as types, constructors, and CI gates — not prose policies or comments.

### Compliance levels

| Level | Meaning |
|---|---|
| **MUST** | Mandatory. Violation requires an approved deviation per the TSF++ deviation procedure. |
| **SHOULD** | Expected in all new code. May be relaxed with a review comment citing explicit rationale. |
| **MAY** | Recommended practice. Encouraged but not enforced by tooling. |

### Deviation procedure

Identical to the base standard. Any deviation from a MUST rule requires:

1. An inline `// DEVIATION(SEC-N.M): <one-line justification>` comment.
2. Approval from at least one reviewer.
3. Entry in `DEVIATIONS.md` if the deviation is project-wide.

---

## 1 — Trust boundaries and threat modeling

### Rule 1.1 — MUST: Define trust boundaries for every externally reachable feature

**Rationale.** Security controls are incomplete when entry points are implicit. Every feature that accepts external input must document: (a) where the trust boundary is crossed, (b) what data is accepted and by whom, and (c) what privilege transitions occur.

A boundary crossing is any point where data moves from a lower-trust context (network, browser, environment, file system) into the application's domain core. In TSF++ terms, boundaries are the sites where `unknown` is narrowed to a domain type.

**Do**
```typescript
// src/tracks/boundary.ts — explicit boundary: HTTP request body → domain type
import { z } from 'zod'
import { pipe } from '@tsfpp/prelude'
import { type Result, ok, err } from '@tsfpp/prelude'
import { type TrackId, mkTrackId } from '../tracks/types'

const TrackIdParamSchema = z.string().uuid()

/**
 * @boundary Narrows raw path param to TrackId.
 * Trust transition: HTTP request → domain (untrusted → branded).
 */
export const parseTrackIdParam = (raw: unknown): Result<TrackId, string> =>
  pipe(
    TrackIdParamSchema.safeParse(raw),
    (r) => r.success ? mkTrackId(r.data) : err(`Invalid track id: ${raw}`),
  )
```

**Don't**
```typescript
// No boundary — raw param flows directly into a database call
const getTrack = async (req: Request) => {
  const id = req.params.id  // type: string — unvalidated, unbranded
  return db.query(`SELECT * FROM tracks WHERE id = '${id}'`)  // injection waiting to happen
}
```

---

### Rule 1.2 — MUST: Maintain a threat model for each major surface (UI, API, background jobs)

**Rationale.** Structured threat modeling prevents blind spots and drives test design. A lightweight STRIDE analysis is sufficient, but it must cover: spoofing, tampering, information disclosure, denial of service, and privilege escalation. Record findings where the code lives — not in a separate wiki that drifts.

**Do**
```typescript
/**
 * @threatModel AcquisitionJob
 *
 * Spoofing:        Job is triggered only by internal queue; source is not user-controllable.
 * Tampering:       Job payload is validated against AcquisitionJobPayloadSchema at dequeue.
 * Disclosure:      File paths and checksums are internal; never returned to the caller.
 * Denial of service: Max concurrency = 3; max file size enforced in mkAudioAsset().
 * Privilege:       Job runs under service account with read-only FS access outside /tmp.
 */
export const runAcquisitionJob = (payload: AcquisitionJobPayload): Task<Result<AcquisitionResult, AcquisitionError>> =>
  // ...
```

**Don't**
```
// See confluence/threat-models/acquisition.doc (last updated 2024-01, probably stale)
```

---

### Rule 1.3 — SHOULD: Assign an explicit risk level to every new endpoint or privileged operation

**Rationale.** Risk tagging keeps review depth, testing coverage, and rollout controls proportional to actual exposure. Low-risk CRUD and critical password-reset endpoints should not receive identical scrutiny — but both must have a label so the distinction is explicit.

Use `@risk low | medium | high | critical` in JSDoc. Criteria: data sensitivity, blast radius of abuse, and authentication requirement.

```typescript
/**
 * Initiates a password reset for the given email address.
 *
 * @risk critical — unauthenticated, email enumeration risk, account takeover vector.
 *
 * Controls applied:
 * - Rate limited per IP (Rule 5.4)
 * - Response is always 202 regardless of email existence (timing-safe, non-enumerating)
 * - Token is single-use, expires in 15 min, hashed at rest (Rule 4.4)
 */
export const initiatePasswordReset = ...
```

---

## 2 — Input validation and output safety

### Rule 2.1 — MUST: Validate all external input at the first boundary crossing with schema parsing

**Rationale.** Domain logic must not receive unvalidated data. Validation is not an optional preprocessing step — it is the mechanism that transforms `unknown` into a typed, trusted domain value. Parse and validate request bodies, query parameters, headers, cookies, path parameters, environment variables, and queue payloads before they cross into business logic. (CWE-20, OWASP A03:2021.)

In TSF++ this is the canonical use of `unknown`: data arrives as `unknown`, is parsed by a schema, and either resolves to a branded domain type or produces an `err`. Nothing else enters the domain.

**Do**
```typescript
import { z } from 'zod'
import { type Result, ok, err } from '@tsfpp/prelude'

const CreateArtistSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().length(2),   // ISO 3166-1 alpha-2
  formedYear: z.number().int().min(1950).max(new Date().getFullYear()),
})

type CreateArtistInput = z.infer<typeof CreateArtistSchema>

/**
 * @boundary HTTP request body → CreateArtistInput
 */
export const parseCreateArtistBody = (raw: unknown): Result<CreateArtistInput, string> => {
  const result = CreateArtistSchema.safeParse(raw)
  return result.success
    ? ok(result.data)
    : err(result.error.issues.map((i) => i.message).join('; '))
}
```

**Don't**
```typescript
// No schema — trusts request body shape entirely
const createArtist = async (req: Request) => {
  const body = req.body as CreateArtistInput  // `as` cast from unknown — proof obligation bypassed
  await artistService.create(body)            // invariants may already be violated
}
```

---

### Rule 2.2 — MUST: Use allow-list validation; deny-list filtering is forbidden for security boundaries

**Rationale.** Deny-lists enumerate known-bad patterns. Allow-lists enumerate the complete set of accepted shapes. Novel encodings, Unicode tricks, double-encoding, and future parser changes routinely bypass deny-lists. Allow-lists remain correct as the attack surface evolves. (CWE-184.)

**Do**
```typescript
// Allow-list: exactly the values the system accepts
const AcquisitionSourceSchema = z.enum(['discogs', 'bandcamp', 'local'])
type AcquisitionSource = z.infer<typeof AcquisitionSourceSchema>
```

**Don't**
```typescript
// Deny-list: any string that doesn't contain known-bad characters
const isValidSource = (s: string): boolean =>
  !s.includes('<') && !s.includes('>') && !s.includes(';')
// Bypassed by: 'shell`rm -rf /`', URL-encoded variants, etc.
```

---

### Rule 2.3 — MUST: Encode untrusted output for its target context before rendering

**Rationale.** Each output sink has a distinct encoding requirement. A string safe for HTML body content is not safe inside a JavaScript string, a URL, an SQL parameter, or a shell argument. Confusing sink contexts is the root cause of injection vulnerabilities. (CWE-79, CWE-116, OWASP A03:2021.)

| Sink context | Required mechanism |
|---|---|
| HTML body | Framework auto-escaping (React JSX, framework templates) |
| HTML attribute | Framework auto-escaping — never raw string interpolation |
| URL parameter | `encodeURIComponent` |
| SQL | Parameterized query / prepared statement (Rule 2.4) |
| Shell command | Never construct from user input — use safe APIs with argument arrays |
| JSON response | `JSON.stringify` — never `string template` |

**Do**
```typescript
// React JSX — framework escapes text content automatically
const TrackTitle = ({ title }: { readonly title: string }) => (
  <span>{title}</span>   // safe: JSX textContent is escaped
)

// Never interpolate into dangerouslySetInnerHTML
```

**Don't**
```typescript
// XSS: title may contain <script>alert(1)</script>
element.innerHTML = `<span>${title}</span>`

// SSRF / open redirect: raw URL interpolation
const redirect = `https://cdn.example.com/covers/${userProvidedPath}`
```

---

### Rule 2.4 — MUST: Use parameterized queries and typed ORM methods; string-concatenated query construction is forbidden

**Rationale.** SQL injection (CWE-89) is reliably prevented by parameterized queries and consistently reintroduced by string concatenation. The TSF++ rule against mutation and string-building extends naturally here: treat SQL as a data structure, not a string.

**Do**
```typescript
// Drizzle ORM — typed, parameterized
const track = await db
  .select()
  .from(tracks)
  .where(eq(tracks.id, trackId))
  .limit(1)

// Raw parameterized (when ORM is unavailable)
const result = await db.query(
  'SELECT * FROM tracks WHERE id = $1 AND label_id = $2',
  [trackId, labelId],
)
```

**Don't**
```typescript
// SQL injection: trackId is attacker-controlled
const result = await db.query(
  `SELECT * FROM tracks WHERE id = '${trackId}'`
)
```

---

### Rule 2.5 — SHOULD: Enforce request size limits, pagination bounds, and complexity limits at the edge

**Rationale.** Unbounded requests are a denial-of-service vector (CWE-400, OWASP API4:2023). Limits on body size, array length, query depth, and pagination page size are simple, high-value controls that should be set once at the framework/middleware layer, not repeated per handler.

**Do**
```typescript
// Express middleware — global size limit before routing
app.use(express.json({ limit: '256kb' }))

// Schema-level pagination guard
const PaginationSchema = z.object({
  page: z.number().int().min(1).max(1000),
  pageSize: z.number().int().min(1).max(100),
})
```

**Don't**
```typescript
// No size guard — attacker can POST a 500MB JSON body to exhaust memory
app.use(express.json())

// No upper bound — pageSize=100000 becomes a full table scan
const PaginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
})
```

---

## 3 — Authentication, authorization, and session security

### Rule 3.1 — MUST: Separate authentication from authorization decisions

**Rationale.** Identity proof (authentication) does not imply capability (authorization). Collapsing the two produces IDOR vulnerabilities (CWE-639, OWASP API1:2023) where an authenticated actor can access resources that belong to another actor simply by guessing an ID.

Model them as distinct typed steps:

```typescript
// Authentication: who are you?
type AuthenticatedContext = {
  readonly kind: 'authenticated'
  readonly userId: UserId
  readonly sessionId: SessionId
}

// Authorization: what are you allowed to do to this resource?
type AuthorizationResult =
  | { readonly kind: 'authorized'; readonly permission: Permission }
  | { readonly kind: 'denied'; readonly reason: string }

const authorizeTrackAccess = (
  ctx: AuthenticatedContext,
  track: Track,
  action: 'read' | 'edit' | 'delete',
): AuthorizationResult =>
  track.ownerId === ctx.userId || ctx.permission === 'admin'
    ? { kind: 'authorized', permission: action }
    : { kind: 'denied', reason: 'You do not own this resource' }
```

---

### Rule 3.2 — MUST: Deny by default when authorization state is missing or undecidable

**Rationale.** Ambiguous authorization is a security failure, not an exceptional case to handle later. The default branch in any authorization decision is `denied`. This maps directly to TSF++ Rule 1.2: unhandled union variants must produce a compile error, and authorization outcomes must be exhaustive.

**Do**
```typescript
const resolvePermission = (role: UserRole, action: Action): AuthorizationResult => {
  switch (role) {
    case 'admin':      return { kind: 'authorized', permission: action }
    case 'moderator':  return action === 'delete' ? deny('Moderators cannot delete') : { kind: 'authorized', permission: action }
    case 'member':     return readActions.has(action) ? { kind: 'authorized', permission: action } : deny('Members have read-only access')
    default:           return absurd(role)  // new roles must be explicitly handled
  }
}
```

**Don't**
```typescript
const resolvePermission = (role: string, action: string): boolean => {
  if (role === 'admin') return true
  // Falls through for unknown roles — implicitly returns undefined/falsy
  // A new role is silently denied AND there is no compile-time signal
}
```

---

### Rule 3.3 — MUST: Enforce authorization server-side for every protected action; client restrictions are advisory only

**Rationale.** UI gatekeeping (hiding buttons, disabling forms) improves user experience. It provides zero security. Every request to a protected endpoint must carry an independent server-side authorization check, regardless of what the client rendered. (OWASP A01:2021, API5:2023.)

**Do**
```typescript
// Server handler — always checks authorization, regardless of what the UI showed
const handleDeleteTrack = async (
  ctx: AuthenticatedContext,
  trackId: TrackId,
): Promise<Result<void, ApiError>> => {
  const track = await trackRepo.findById(trackId)
  if (track.kind === 'none') return err(notFound('Track not found'))

  const authz = authorizeTrackAccess(ctx, track.value, 'delete')
  if (authz.kind === 'denied') return err(forbidden(authz.reason))

  return trackRepo.delete(trackId)
}
```

**Don't**
```typescript
// Trusts client-supplied role — trivially bypassed with a crafted request
const handleDeleteTrack = async (req: Request) => {
  if (req.body.isAdmin) {   // ← attacker sends { "isAdmin": true }
    await db.delete(req.body.trackId)
  }
}
```

---

### Rule 3.4 — MUST: Session and token material must use secure transport and storage controls

**Rationale.** Session identifiers and access tokens are equivalent to credentials. Transmission without TLS (CWE-319) or storage in accessible JavaScript contexts (CWE-315) trivially enables session hijacking.

Minimum baseline:

| Control | Requirement |
|---|---|
| Transport | TLS 1.2+ on all endpoints carrying credentials or session material |
| Cookie flags | `HttpOnly` (no JS access), `Secure` (HTTPS only), `SameSite=Strict` or `Lax` |
| Token expiration | Every token carries an explicit `exp` claim; no infinite tokens |
| Revocation | At minimum, short-lived tokens with rotation; ideally a revocation list for critical operations |
| Storage (SPA) | Prefer `HttpOnly` cookies over `localStorage`; `localStorage` is readable by any JS on the origin |

**Do**
```typescript
// Cookie-based session — secure defaults
res.cookie('session', sessionToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,   // 15 minutes
  path: '/',
})
```

**Don't**
```typescript
// XSS-readable — any script on the page can steal this token
localStorage.setItem('access_token', jwt)

// Missing HttpOnly — token readable by JS
res.cookie('session', sessionToken, { secure: true })
```

---

### Rule 3.5 — SHOULD: Use step-up authentication for sensitive or destructive operations

**Rationale.** A session valid for reading a dashboard should not automatically authorize destructive or privileged operations. Requiring re-authentication (or MFA confirmation) for high-risk actions limits the blast radius of a compromised ambient session. (OWASP ASVS 3.7.)

Operations that warrant step-up: account deletion, email/password change, payment initiation, bulk export, administrative privilege elevation.

---

## 4 — Secrets, keys, and cryptography

### Rule 4.1 — MUST: Never hardcode secrets, keys, or tokens in source code, configuration files, test fixtures, or snapshots

**Rationale.** Source history is durable. Even a secret committed for one second and then force-pushed is likely captured by CI runners, mirrors, and scanning tools. (CWE-798, OWASP A02:2021.) There are no exceptions to this rule — including test environments, local development values, and "placeholder" strings that look like real secrets.

**Do**
```typescript
// Loaded at startup; type ensures it was validated (Rule 4.2)
import { getEnv } from './config/env'

const jwtSecret: JwtSecret = getEnv('JWT_SECRET')
```

**Don't**
```typescript
// Any of the following — all constitute hardcoded secrets
const JWT_SECRET = 'my-super-secret-key-do-not-share'
const API_KEY = process.env.API_KEY ?? 'fallback-key-for-dev'  // fallback IS a hardcoded secret
const config = { db: { password: 'postgres' } }                 // fixture leaking production pattern
```

---

### Rule 4.2 — MUST: Load secrets from environment or a secret manager; validate completeness and format at startup

**Rationale.** Secrets missing at startup must fail fast — not silently default to empty strings that produce cryptographic failures at runtime. An `undefined` secret used as an HMAC key produces a trivially forgeable signature. (CWE-321.) Validate during application initialization and surface a typed `Result` or crash explicitly.

**Do**
```typescript
import { z } from 'zod'
import { type Result, ok, err } from '@tsfpp/prelude'

const EnvSchema = z.object({
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().length(64),  // 32-byte hex
})

/**
 * @boundary process.env → validated config
 * @risk critical — failure must abort startup
 */
export const loadEnv = (): Result<AppConfig, string> => {
  const result = EnvSchema.safeParse(process.env)
  return result.success
    ? ok(result.data as AppConfig)
    : err(`Missing or invalid environment variables:\n${result.error.message}`)
}

// In main entry point:
const env = loadEnv()
if (env.kind === 'err') {
  console.error('[STARTUP FAILURE]', env.error)
  process.exit(1)
}
```

**Don't**
```typescript
// Silent fallback — undefined becomes '' — HMAC key is the empty string
const jwtSecret = process.env.JWT_SECRET || ''

// Validation deferred until first request — startup looks healthy, runtime fails
const signToken = (payload: object) =>
  jwt.sign(payload, process.env.JWT_SECRET!)  // non-null assertion on undefined
```

---

### Rule 4.3 — MUST: Use vetted cryptographic primitives from established libraries; custom cryptographic implementations are forbidden

**Rationale.** Cryptography is adversarially reviewed by a small number of experts over decades. Custom implementations are nearly always subtly broken. (CWE-327.) Even correct custom implementations fail the auditability standard: a reviewer cannot verify a novel cipher without domain-specific expertise.

Approved primitives and their use cases:

| Use case | Approved mechanism |
|---|---|
| Symmetric encryption | AES-256-GCM (authenticated encryption) |
| Asymmetric signing | Ed25519 or RSA-PSS with SHA-256 |
| Hashing (non-password) | SHA-256 or SHA-3 |
| Password hashing | Argon2id, bcrypt, or scrypt (Rule 4.4) |
| Key derivation | HKDF, PBKDF2 |
| HMAC | HMAC-SHA256 |
| Secure random | `crypto.getRandomValues()` (browser), `crypto.randomBytes()` (Node.js) |

**Do**
```typescript
import { createHmac, randomBytes } from 'node:crypto'

// Timing-safe comparison — prevents timing oracle attacks on HMAC verification
import { timingSafeEqual } from 'node:crypto'

const verifyHmac = (message: string, mac: string, secret: string): boolean => {
  const expected = createHmac('sha256', secret).update(message).digest('hex')
  const a = Buffer.from(mac, 'hex')
  const b = Buffer.from(expected, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
```

**Don't**
```typescript
// MD5/SHA1 are broken for security purposes (CWE-327)
import { createHash } from 'node:crypto'
const hash = createHash('md5').update(password).digest('hex')

// String equality — timing oracle (CWE-208)
const isValid = providedMac === expectedMac

// Custom XOR "encryption" — not encryption
const obfuscate = (s: string, key: string) =>
  s.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('')
```

---

### Rule 4.4 — MUST: Hash passwords with an adaptive, memory-hard algorithm; never store plaintext or reversibly encoded passwords

**Rationale.** Password storage requires resistance to GPU-accelerated offline attacks after a database breach. Fast hashes (MD5, SHA-1, SHA-256, bcrypt with low cost) are inadequate because they can be brute-forced at scale. (CWE-916, OWASP A02:2021.)

**Do**
```typescript
import * as argon2 from 'argon2'

// Hash at registration
const hash = await argon2.hash(plaintextPassword, {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MB
  timeCost: 3,
  parallelism: 4,
})

// Verify at login — argon2.verify handles timing safety internally
const isValid = await argon2.verify(storedHash, plaintextPassword)

// Never log, return, or store plaintextPassword beyond this boundary
```

**Don't**
```typescript
// SHA-256 is not a password hash — cracked in seconds with a GPU
const hash = crypto.createHash('sha256').update(password).digest('hex')

// bcrypt with cost 4 is below OWASP minimum (cost ≥ 10 recommended)
const hash = await bcrypt.hash(password, 4)

// Plaintext storage — no defense after breach
await db.users.create({ email, password })
```

---

### Rule 4.5 — SHOULD: Define key rotation intervals and maintain emergency rotation runbooks

**Rationale.** The value of cryptographic material decays over time and expires absolutely after a breach. Without documented rotation procedures, an emergency becomes a multi-hour outage. Rotation readiness reduces breach dwell time. Target rotation intervals: signing keys ≤ 90 days, encryption keys ≤ 1 year, API keys ≤ 90 days.

---

## 5 — Data protection and privacy

### Rule 5.1 — MUST: Classify all data assets by sensitivity and apply controls proportional to classification

**Rationale.** Uniform, undifferentiated controls are either over-engineered for low-sensitivity data or inadequate for high-sensitivity data. Classification produces proportional, auditable controls. (NIST SSDF PW.7.)

| Class | Examples | Minimum controls |
|---|---|---|
| Public | Published track metadata, artist bios | No special controls |
| Internal | Operational logs, queue contents | Access control, no public exposure |
| Confidential | User email addresses, purchase history | Encryption at rest and in transit, redacted in logs |
| Restricted | Passwords, API keys, payment data | Adaptive hashing or encryption, never in logs, audited access |

**Do**
```typescript
// Domain type carries its classification through branding
type UserEmail = Brand<string, 'UserEmail'>   // Confidential: never log raw
type PasswordHash = Brand<string, 'PasswordHash'>  // Restricted: never return to client

type User = {
  readonly id: UserId
  readonly email: UserEmail         // Confidential
  readonly passwordHash: PasswordHash  // Restricted — absent from API response types
}

// API response type explicitly omits restricted fields
type UserResponse = Omit<User, 'passwordHash'>
```

---

### Rule 5.2 — MUST: Minimize sensitive data collection and retention; do not collect data your system does not need to function

**Rationale.** Uncollected data cannot be breached. Every additional sensitive field is a new liability. Review new data collection against the minimum necessary principle before schema changes.

**Don't**
```typescript
// Full date of birth collected "for future personalization"
// Only the year is needed for age verification
type UserProfile = {
  readonly dateOfBirth: Date     // ← over-collection; prefer birthYear: number
  readonly phoneNumber: string   // ← not used anywhere in the system
  readonly ipHistory: ReadonlyArray<string>  // ← passive surveillance, high breach value
}
```

---

### Rule 5.3 — MUST: Encrypt sensitive data in transit and at rest using approved mechanisms

**Rationale.** Encryption in transit (TLS) and at rest (field-level or disk-level encryption) protects against network interception and storage compromise respectively. Neither alone is sufficient for restricted data. (CWE-311, CWE-319.)

**In transit:** TLS 1.2+ is the minimum; TLS 1.3 is preferred. No plaintext HTTP for any endpoint carrying authentication material, session tokens, or confidential data. HSTS is mandatory for production endpoints.

**At rest:** Database-level encryption (e.g. encrypted RDS volumes) protects against physical storage theft. Field-level encryption for restricted data (e.g. API keys, payment tokens) provides defense-in-depth when the database credential is compromised.

---

### Rule 5.4 — MUST: Redact secrets and personal data from logs, traces, error responses, and diagnostic output

**Rationale.** Observability pipelines are high-value exfiltration targets. A single `console.log(req.body)` in a handler that processes login requests leaks credentials to every log consumer. (CWE-532, OWASP A09:2021.)

**Do**
```typescript
// Use a redacting logger wrapper — never log raw request bodies on auth endpoints
import { logger } from '@/lib/logger'

const handleLogin = async (ctx: RequestContext, body: LoginBody): Promise<Result<Session, ApiError>> => {
  logger.info('Login attempt', {
    email: redact(body.email),  // e.g. "u***@example.com"
    ip: ctx.remoteIp,
    // password is NEVER logged, even as [REDACTED]
  })
  // ...
}
```

**Don't**
```typescript
// Logs plaintext password and full email
console.log('Login attempt:', JSON.stringify(req.body))

// Error response leaks internal database path and query
res.status(500).json({ error: err.message })
// e.g. → { "error": "relation \"users\" does not exist in /var/db/prod.sqlite" }
```

---

### Rule 5.5 — SHOULD: Enforce data retention and deletion policies with auditable, automated execution

**Rationale.** Data retention policy without automated enforcement drifts silently into non-compliance. GDPR "right to erasure" and similar regulatory obligations require that deletion is mechanical and verifiable, not manual.

---

## 6 — Dependency and supply-chain security

### Rule 6.1 — MUST: Pin all dependency versions; commit lockfiles to version control

**Rationale.** Unpinned dependencies resolve to the latest available version at install time. A compromised or malicious package published between your CI runs and production deploys silently enters the build. Lockfile commits make dependency resolution reproducible and auditable. (OWASP A06:2021, NIST SSDF PS.3.)

**Do**
```
# pnpm-lock.yaml committed in full
# .gitignore must NOT exclude pnpm-lock.yaml
```

**Don't**
```jsonc
// package.json
{
  "dependencies": {
    "some-crypto-lib": "^2.0.0"   // Resolved at install time — any 2.x can enter the build
  }
}
// pnpm-lock.yaml in .gitignore  ← audit trail destroyed
```

---

### Rule 6.2 — MUST: Run dependency vulnerability scanning in CI; critical and high findings block merge

**Rationale.** Vulnerability databases (NVD, GitHub Advisory) continuously receive new entries for packages already in your lockfile. Scanning at install time is insufficient — CI gates ensure the build reflects the current advisory state. (OWASP A06:2021.)

**Do**
```yaml
# .github/workflows/security.yml
- name: Audit dependencies
  run: pnpm audit --audit-level=high
  # Fails with exit code 1 on high or critical findings → blocks merge
```

---

### Rule 6.3 — MUST: Every new runtime dependency requires a documented rationale in the PR that introduces it

**Rationale.** Each dependency extends the attack surface, increases the transitive dependency tree, and creates a maintenance obligation. The question "why does this need a new dependency?" must be answered in the PR diff, not in a comment months later. If the functionality can be implemented in ≤ 20 lines of TSF++-conformant code, prefer the inline implementation.

**Checklist for new dependency introduction:**

- [ ] Actively maintained (commits in the last 6 months, or LTS status documented)
- [ ] Security contact or SECURITY.md present
- [ ] No critical CVEs in current version
- [ ] Transitive dependency count is proportionate to the value added
- [ ] License is compatible with the repository license

---

### Rule 6.4 — SHOULD: Prefer packages with transparent release processes and a published security disclosure policy

**Rationale.** Package maintenance quality materially affects long-term supply-chain risk. A package that publishes signed releases from a pinned CI runner and has a documented CVE disclosure process is substantially less risky than one maintained by a single anonymous author with no security contact.

---

## 7 — Error handling, logging, and observability

### Rule 7.1 — MUST: Return user-safe error messages; never expose stack traces, internal paths, query details, or infrastructure topology in API responses

**Rationale.** Detailed error messages are a primary source of reconnaissance for attackers. (CWE-209, OWASP A05:2021.) Internal error details — database driver names, file paths, query strings, library versions — aid in fingerprinting and exploitation.

In TSF++ the `Result` type makes the separation natural: the internal `err` payload is full-fidelity for logging; the external response carries only a safe, reference-coded message.

**Do**
```typescript
type ApiError =
  | { readonly kind: 'not_found'; readonly message: string }
  | { readonly kind: 'forbidden'; readonly message: string }
  | { readonly kind: 'internal'; readonly correlationId: string }  // no internal detail

const toHttpError = (err: DomainError): ApiError => {
  switch (err.kind) {
    case 'track_not_found': return { kind: 'not_found', message: 'Track not found.' }
    case 'unauthorized':    return { kind: 'forbidden', message: 'Access denied.' }
    default:
      // Log full error internally; return only correlation id externally
      logger.error('Unhandled domain error', { err, correlationId: err.correlationId })
      return { kind: 'internal', correlationId: err.correlationId }
  }
}
```

**Don't**
```typescript
// Leaks stack trace, file path, and database error to the client
app.use((err: Error, req: Request, res: Response) => {
  res.status(500).json({
    message: err.message,
    stack: err.stack,
    query: (err as any).query,
  })
})
```

---

### Rule 7.2 — MUST: Log security-relevant events with stable, structured schemas; include correlation identifiers

**Rationale.** Incident response depends on searchable, consistent security telemetry. Free-form log strings become unsearchable at volume. Correlation identifiers tie all log entries for a single request into a reconstructable trace without exposing sensitive payloads. (OWASP A09:2021.)

**Minimum required event families:**

| Event family | Required fields |
|---|---|
| Authentication success | `userId`, `sessionId`, `ip`, `correlationId`, `timestamp` |
| Authentication failure | `reason`, `ip`, `attemptedEmail (redacted)`, `correlationId`, `timestamp` |
| Authorization denial | `userId`, `resource`, `action`, `reason`, `correlationId`, `timestamp` |
| Privileged action | `userId`, `action`, `resourceId`, `correlationId`, `timestamp` |
| Rate limit rejection | `ip`, `endpoint`, `correlationId`, `timestamp` |
| Startup config failure | `missingKeys`, `timestamp` |

**Do**
```typescript
logger.warn('auth.login.failed', {
  reason: 'invalid_credentials',
  email: redactEmail(attempt.email),
  ip: ctx.remoteIp,
  correlationId: ctx.correlationId,
  timestamp: new Date().toISOString(),
})
```

**Don't**
```typescript
// Unsearchable, no correlation, leaks plaintext credential
console.log(`Login failed for ${email} with password ${password}`)
```

---

### Rule 7.3 — SHOULD: Alert on anomalous authentication and privilege patterns

**Rationale.** Log entries that are never examined provide no security value. Anomaly detection — even rule-based thresholds — shortens the window between compromise and containment. Minimum recommended thresholds: N failed logins per IP per minute, M privilege escalation events per hour, new admin account creation outside business hours.

---

## 8 — Security testing and release gates

### Rule 8.1 — MUST: Security controls must be verified by tests; policy-only controls regress silently

**Rationale.** A rule that says "always deny unauthorized access" is indistinguishable from no rule at all unless a test asserts that unauthorized access is denied. (OWASP ASVS 4.0 V1.1.6, NIST SSDF PW.8.) Security tests are not optional coverage; they are the machine-checkable proof of the security claim.

Required coverage:

| Control type | Required tests |
|---|---|
| Boundary validation | Tests for valid input (accepted) and invalid variants (rejected with correct error) |
| Authorization | Tests for authorized path (permitted) and unauthorized variants (403/denied with no data leak) |
| Sensitive data redaction | Tests asserting that log output and API responses do not contain secret values |
| Crypto correctness | Tests for known-vector correctness and timing-safe comparison |

**Do**
```typescript
describe('parseTrackIdParam', () => {
  it('accepts a valid UUID', () => {
    const result = parseTrackIdParam('123e4567-e89b-12d3-a456-426614174000')
    expect(result.kind).toBe('ok')
  })

  it('rejects SQL injection string', () => {
    const result = parseTrackIdParam("1' OR '1'='1")
    expect(result.kind).toBe('err')
  })

  it('rejects empty string', () => {
    const result = parseTrackIdParam('')
    expect(result.kind).toBe('err')
  })
})

describe('handleDeleteTrack — authorization', () => {
  it('returns 403 when caller does not own the track', async () => {
    const response = await deleteTrack(otherUsersContext, trackId)
    expect(response.status).toBe(403)
    expect(response.body).not.toHaveProperty('trackId')  // no data leaked in denial
  })
})
```

---

### Rule 8.2 — MUST: CI enforces at minimum static analysis, dependency audit, and secret scanning on every PR

**Rationale.** Automated gates prevent known-weak changes from merging. Manual review cannot reliably catch hardcoded secrets, new critical CVEs, or missing security rules across every PR. Gates are not optional; their absence means the control does not exist.

Required gate categories:

| Gate | Tooling (examples) | Fail condition |
|---|---|---|
| Static analysis with security rules | ESLint with `@typescript-eslint` security rules | Any error |
| Dependency audit | `pnpm audit` | High or critical CVE |
| Secret scanning | `gitleaks`, `truffleHog`, GitHub secret scanning | Any secret pattern detected |
| Test suite (security tests included) | Vitest | Any failure |

**Do**
```yaml
# .github/workflows/ci.yml
jobs:
  security:
    steps:
      - run: pnpm audit --audit-level=high
      - run: pnpm exec gitleaks detect --source . --exit-code 1
      - run: pnpm lint          # includes security ESLint rules
      - run: pnpm test          # includes auth and boundary tests
```

---

### Rule 8.3 — SHOULD: Write abuse-case tests for high-risk endpoints alongside happy-path tests

**Rationale.** Happy-path tests verify that correct inputs produce correct outputs. Abuse-case tests verify that crafted, malformed, or adversarial inputs are handled safely. Both are required for endpoints with `@risk high` or `@risk critical`.

Examples of abuse cases to test:

- Submitting another user's resource ID in a mutation
- Sending a JWT with a manipulated `userId` claim
- Submitting boundary values (max length, empty, null bytes)
- Replaying a single-use token after it has been consumed
- Submitting an oversized payload

---

### Rule 8.4 — SHOULD: Record security debt with an owner, a due date, and a tracking reference

**Rationale.** Security debt without ownership and deadlines accumulates into latent, unquantified risk. Each accepted shortfall must be visible and attributed.

**Do**
```typescript
// SECURITY-DEBT(#142): Rate limiting not yet applied to /v1/search.
// Owner: @alice. Due: 2026-07-01. Risk: medium (read-only, no auth required).
// Interim mitigation: Cloudflare WAF rate limit at 300 req/min/IP.
```

---

## 9 — Operational readiness and incident response

### Rule 9.1 — MUST: Maintain a documented vulnerability intake and triage path

**Rationale.** An undocumented intake path means reported vulnerabilities land in random inboxes and may never be triaged. Researchers, users, and automated scanners must have a published, reliable channel. (NIST SSDF RV.1.)

Minimum requirements:

- A `SECURITY.md` at repository root with: scope, reporting contact, expected response time
- An intake channel that reaches the security owner within 24 hours
- A triage checklist applied to every incoming report

---

### Rule 9.2 — MUST: Define severity-based remediation SLAs and honor them

**Rationale.** Severity classification without enforced timelines does not produce predictable mitigation. SLAs make the commitment to remediation machine-traceable.

| Severity | Definition | Target remediation |
|---|---|---|
| Critical | Active exploitation or trivially exploitable RCE/auth bypass | 24 hours |
| High | Significant impact, not actively exploited | 7 days |
| Medium | Limited impact or requires chaining | 30 days |
| Low | Minimal impact, defense-in-depth improvement | 90 days |

---

### Rule 9.3 — SHOULD: Conduct post-incident reviews and fold findings back into the standard and test suite

**Rationale.** Incidents must improve the system, not just close tickets. A post-incident review that produces no new test, no updated rule, and no new CI gate has not prevented recurrence — it has documented a failure for historical record only.

Post-incident checklist:
- [ ] Root cause identified and categorized (input validation, auth gap, dependency, config)
- [ ] New test(s) added that would have caught the issue
- [ ] Relevant rule in this standard updated or referenced
- [ ] CI gate added or strengthened if applicable
- [ ] `DEVIATIONS.md` updated if a deviation contributed to the incident

---

## Appendix A — Security checklist for code review

Apply to every PR that touches security-relevant code. For PRs touching high- or critical-risk surfaces, all items are mandatory.

**Boundary and validation**
- [ ] All external inputs validated at the first boundary with schema parsing (`unknown` → branded type or `err`)
- [ ] Allow-lists used, not deny-lists
- [ ] Request size and pagination limits enforced

**Authorization**
- [ ] Authentication and authorization are distinct typed steps
- [ ] Authorization enforced server-side for every protected action
- [ ] Deny-by-default when authorization state is missing or ambiguous
- [ ] New variants in authorization unions handled exhaustively (`absurd` in default branch)

**Secrets and cryptography**
- [ ] No secrets, keys, or tokens in code, fixtures, snapshots, or `.env.example` files with real values
- [ ] Startup validation fails fast if secrets are missing or malformed
- [ ] Approved cryptographic primitives only (see Rule 4.3 table)
- [ ] Passwords hashed with Argon2id (or bcrypt ≥ cost 10 with documented justification)

**Data protection**
- [ ] Error responses are safe — no stack traces, query text, or internal paths
- [ ] Logs redact secrets and personal data; correlation ID is present
- [ ] Sensitive fields absent from API response types

**Dependencies**
- [ ] No new runtime dependency without documented rationale in PR
- [ ] Dependency audit and secret scan gates pass

**Testing**
- [ ] Boundary validation rejection paths are tested
- [ ] Authorization deny paths are tested (and confirm no data leaks in denial response)
- [ ] High-risk endpoints include at least one abuse-case test

---

## Appendix B — CI security gate configuration (reference)

```yaml
# .github/workflows/security.yml
name: Security gates

on:
  pull_request:
  push:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # Full history needed for secret scanning

      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Dependency audit (high + critical fail build)
        run: pnpm audit --audit-level=high

      - name: Secret scanning
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Static analysis (security rules included)
        run: pnpm lint

      - name: Type check
        run: pnpm tsc --noEmit

      - name: Test suite
        run: pnpm test --coverage
```

**ESLint security rule additions** (complement `CODING_STANDARD.md` Appendix B):

```javascript
// Additional security-focused rules for eslint.config.js
{
  rules: {
    // Prevent eval and equivalent dynamic execution
    'no-eval': 'error',
    'no-new-func': 'error',
    'no-implied-eval': 'error',

    // Prevent insecure random (Math.random is not cryptographically secure)
    // Use crypto.randomBytes() / crypto.getRandomValues() instead
    'no-restricted-globals': ['error', {
      name: 'Math',
      message: 'Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive random values.',
    }],

    // Prevent dangerouslySetInnerHTML in React code
    'react/no-danger': 'error',

    // Catch common regex DoS patterns (ReDoS)
    'security/detect-unsafe-regex': 'error',

    // Flag SQL string concatenation patterns
    'security/detect-possible-timing-attacks': 'error',
  }
}
// Requires: pnpm add -D eslint-plugin-security
```

---

## Appendix C — Forbidden security anti-patterns (summary)

| Anti-pattern | Rule | Consequence |
|---|---|---|
| Hardcoded secret, key, or token | 4.1 | MUST NOT — no exceptions, including tests |
| String-concatenated SQL query | 2.4 | MUST NOT — use parameterized queries |
| `any` cast at trust boundary | 2.1 + CODING Rule 1.5 | MUST NOT — use schema parsing with `unknown` |
| Authorization enforced only in UI | 3.3 | MUST NOT — server-side check is mandatory |
| `Math.random()` for security purposes | 4.3 | MUST NOT — use `crypto.randomBytes()` |
| MD5 or SHA-1 for hashing | 4.3 | MUST NOT — use SHA-256+ or Argon2id for passwords |
| `==` comparison for token or MAC verification | 4.3 | MUST NOT — use `timingSafeEqual` |
| Raw `err.message` or `err.stack` in API response | 7.1 | MUST NOT — return only correlation ID for unhandled errors |
| `process.env.SECRET ?? 'default'` | 4.2 | MUST NOT — fail fast at startup |
| Deny-list input filtering for security | 2.2 | MUST NOT — use allow-list schema parsing |
| Missing `HttpOnly` on session cookie | 3.4 | MUST NOT — JS-readable session token |
| `localStorage` for access tokens | 3.4 | MUST NOT (prefer HttpOnly cookie) |
| Logging plaintext credentials or PII | 5.4 | MUST NOT |
| Unpinned dependency version | 6.1 | MUST NOT — pin exact versions |

---

## Appendix D — Standard crosswalk

### TSF++ base standard

| Security area | TSF++ rule | Why the overlap matters |
|---|---|---|
| Boundary validation (Rule 2.1) | Rule 1.5, Rule 6.1–6.5 | External input must be narrowed from `unknown` to a branded domain type at the boundary — identical mechanism, security-critical application. |
| Authorization enforcement (Rules 3.1–3.3) | Rule 1.2, Rule 1.8 | Authorization outcomes are discriminated unions; exhaustive matching with `absurd` ensures no authorization state is silently unhandled. |
| Secret and key handling (Rules 4.1–4.2) | Rule 2.1–2.4, Rule 6.1 | Secrets are `const`, branded, and loaded once at the boundary. Immutability prevents accidental mutation or leakage through mutable closure. |
| Error and telemetry safety (Rules 7.1–7.2) | Rule 6.1–6.5, Rule 9.1 | `Result` separates internal error fidelity from external error exposure. Boundary adapters map full `err` values to safe, typed API errors. |
| Security test gates (Rules 8.1–8.2) | Rule 10.1–10.4 | Security controls require machine-checkable verification — identical to the base standard's requirement that correctness claims are expressed as tests, not comments. |

### API standard

| Security area | API standard intersection |
|---|---|
| Boundary validation | Rule 3.1–3.3: request/response schema validation |
| AuthN/AuthZ controls | Rule 4.1–4.3: auth wiring, status semantics (401/403), endpoint protection |
| Safe error responses | Rule 5.1–5.3: structured error contract, no stack traces in responses |
| Abuse resistance | Rule 6.1–6.2: rate limiting, idempotency, pagination bounds |

### React standard

| Security area | React standard intersection |
|---|---|
| XSS prevention | Safe rendering via JSX; `dangerouslySetInnerHTML` forbidden |
| No client-side auth authority | Client-side permission gating is UX only; server enforces |
| Safe error presentation | Client errors use typed error display, not `err.message` interpolation |
| No secrets in client bundle | Environment variables prefixed `VITE_PUBLIC_` or equivalent — never private keys |

This document is the cross-cutting security baseline where all three standards intersect.

---

## Appendix E — References

1. **OWASP Application Security Verification Standard (ASVS) 4.0** — https://owasp.org/www-project-application-security-verification-standard/
2. **OWASP Top 10 (2021)** — https://owasp.org/Top10/
3. **OWASP API Security Top 10 (2023)** — https://owasp.org/API-Security/
4. **NIST Secure Software Development Framework (SSDF) SP 800-218** — https://csrc.nist.gov/publications/detail/sp/800-218/final
5. **CWE Top 25 Most Dangerous Software Weaknesses** — https://cwe.mitre.org/top25/
6. **Argon2 Password Hashing** — RFC 9106, https://www.rfc-editor.org/rfc/rfc9106
7. **eslint-plugin-security** — https://github.com/eslint-community/eslint-plugin-security
8. **gitleaks** — https://github.com/gitleaks/gitleaks
9. **Zod schema validation** — https://zod.dev/
10. **OWASP Cheat Sheet: Password Storage** — https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
11. **OWASP Cheat Sheet: Session Management** — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html