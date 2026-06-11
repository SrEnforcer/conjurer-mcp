# RATIONALE.md — TSF++ Design Rationale

This document records the reasoning behind the TSF++ standard family. It is the answer to the question "why?" — why these rules exist, why they take the form they do, why the trade-offs were made the way they were.

The individual standards are normative. This document is not. Where a standard and this rationale appear to conflict, the standard governs. This document exists to help readers understand decisions rather than reverse-engineer them from the rules.

---

## Part I — The global argument

### 1.1 The origin: high-assurance software

TSF++ draws its lineage from three traditions in high-assurance software engineering:

**JSF++ (Lockheed Martin, 2005)** — the Joint Strike Fighter's C++ coding standard, written for mission-critical avionics code where a defect can cost a life. It bans dynamic memory allocation, recursion, function pointers, and exceptions. It mandates that every function fits on a single screen. The insight is that *constraint enables audit*: if you know a program cannot do certain things, the space of defects it can contain is smaller.

**JPL Power of Ten (Holzmann, 2006)** — ten rules for safety-critical C code at NASA's Jet Propulsion Laboratory. Rule one: no goto. Rule two: all loops have a fixed upper bound. Rule nine: no more than two levels of pointer indirection. Again, constraint as a tool for reasoning.

**The ML/Haskell school of algebraic types** — decades of academic and industrial research showing that making illegal states unrepresentable in the type system catches entire categories of bugs at compile time, before they reach a test suite or a production system.

TSF++ takes these traditions and applies them to TypeScript in the year 2026 — a language used for complex, long-lived, shared systems that are not avionics but are not toys either. The goal is not maximum restriction, but *principled restriction*: each rule eliminates a specific failure mode, and the set of rules together creates a codebase that is auditable, correct, and cheap to maintain.

### 1.2 The core thesis: constraint as amplifier

The counter-intuitive claim at the heart of TSF++ is that *writing code within strict constraints is faster and cheaper than writing code without them*, provided the constraints are the right ones.

This sounds wrong. In the short term, it is often wrong. The first week on a TSF++ codebase is slower than the first week on an unconstrained one. But the curve inverts.

The reason is the **defect cost curve**. A bug caught by the type system at edit time costs seconds. A bug caught by a test costs minutes. A bug caught in code review costs an hour. A bug caught in production costs days and reputation. TSF++ moves defects left — toward the type system, away from production. The constraints feel like friction; the absence of late-stage defects feels like speed.

The specific classes of defects TSF++ eliminates through constraint:

| Forbidden construct | Defect class eliminated |
|---|---|
| `let`, mutable state | Aliasing bugs, temporal coupling, order-of-operation surprises |
| `throw` in core | Untyped error paths, swallowed exceptions, missing error handling |
| `null` / `undefined` | Null reference errors (billion-dollar mistake) |
| `any` | Type unsoundness propagating through the system |
| Non-exhaustive `switch` | Silent omission when a new variant is added |
| `class` / `this` | Hidden state, prototype mutation, inheritance coupling |
| Optional parameters | Implicit defaults, inconsistent call sites |
| `for` / `while` | Incorrect loop bounds, early-exit surprises, mutation within iteration |

None of these bans is arbitrary. Each has a specific, recurring defect class behind it.

### 1.3 Algebraic code is cheaper to reason about — for humans and models

The second major thesis of TSF++ is that algebraic code — code based on sum types, total functions, pure transformations, and explicit effects — is not just easier to reason about for humans. It is significantly easier to reason about for language models too.

This matters because TSF++ projects use language models as coding agents. A model that can reason correctly about code generates fewer violations, requires fewer correction cycles, and produces more value per unit of compute.

**Why algebraic code is cheaper for models:**

*Predictability.* A codebase that follows TSF++ has a small, stable vocabulary of patterns: `pipe`, `match`, `Option`, `Result`, `map`, `flatMap`, `traverseArray`. A model that has seen these patterns once can recognise and apply them everywhere. An unconstrained codebase has a much larger vocabulary of idioms, styles, and one-off abstractions that a model must interpret anew each time.

*Explicit semantics.* In algebraic code, every value either has a value or is `None`. Every operation either succeeds or returns an `Err`. Every effect is either absent or explicitly typed as `Promise<Result<T, E>>`. There is no hidden state, no side-channel, no invisible exception. A model does not need to trace through layers of implicit behaviour to understand what a function does — the type tells it.

*Exhaustiveness.* A discriminated union with a `default: return absurd(x)` branch cannot be partially handled. A model generating code for a new variant is forced to handle all branches. There is no way to write a partial match that type-checks. This removes an entire class of model error.

*Local reasoning.* A pure function's output depends only on its inputs. A model does not need to track global state, database state, or call-site history to reason about a pure function. Each function can be understood in isolation. Local reasoning is cheaper — in human cognition and in model tokens.

*Fewer tokens.* A model generating code for a `pipe`-based pipeline needs fewer tokens than one generating equivalent imperative code with intermediate variables, error-checking branches, and mutation. The algebraic form is denser without being less readable. Denser correct code costs less to generate and less to verify.

The implication is that TSF++ creates a positive feedback loop: the standard makes code easier to generate correctly, which makes the agents more effective, which makes the codebase more consistent, which makes the standard easier to enforce.

### 1.4 The legitimate trade-offs

TSF++ is not appropriate everywhere. The trade-offs are real:

**Learning curve.** A developer unfamiliar with algebraic data types, total functions, or monadic composition will be slower initially. The standard is teachable, but it requires genuine learning, not just tooling adoption.

**Escape hatch friction.** When a third-party library forces a violation — an interface instead of a type alias, a callback that throws, a function that returns `null` — TSF++ requires a DEVIATION annotation. This is intentional: the friction records the exception and makes it visible. But it is still friction.

**Not appropriate for prototyping.** The deliberate type design that TSF++ requires is expensive for throwaway code. TSF++ is for systems you intend to maintain.

**Not appropriate for solo scripts.** The governance overhead (deviation registers, JSDoc, structured markers) is disproportionate for a 50-line utility script.

These trade-offs are the reason TSF++ is positioned as a standard for *production systems* — systems that will be maintained, extended, and audited over years.

---

## Part II — Rationale by standard

### 2.1 `CODING_STANDARD.md` — the base standard

#### Why functional, not object-oriented?

Objects blur data and behaviour. An object's fields are state; its methods are behaviour that modifies that state. The result is that to understand an object, you must understand all the methods that can mutate it, all the call sites that invoke those methods, and all the orderings in which they can be called. This is the root cause of the most common class of production defects: an object being in an unexpected state because some method was called in an unexpected order.

Algebraic data types separate data from behaviour completely. A value has fields. Functions transform values into other values. The value cannot "do" anything; it simply is. This eliminates temporal coupling: there is no order of operations to reason about, because operations don't mutate state.

#### Why `Result<T, E>` instead of exceptions?

Exceptions are untyped side channels. A function that throws carries no information in its signature about what it throws or when. The caller has no compile-time evidence that it needs to handle the exception. This is the source of uncaught exceptions in production: the type system gives no help.

`Result<T, E>` makes failure a first-class value. The function signature tells the caller exactly what can go wrong. The type system forces handling. There is no way to forget an error case — the code won't compile.

The second benefit is composability. `Result` values compose through `map`, `flatMap`, and `traverseArray`. Exceptions do not compose — you cannot map over a thrown exception.

#### Why `Option<A>` instead of `null | undefined`?

`null` and `undefined` exist everywhere in TypeScript's type system. A value typed as `string` can be `null` with `strictNullChecks` disabled. A value typed as `string | undefined` carries its optionality in the type but can be silently spread through the system.

`Option<A>` is explicit and compositional. An `Option<string>` is either `some(value)` or `none`. The holder cannot access the value without first checking which case they have. The type system enforces the check. And `Option<A>` composes: `mapO`, `flatMapO`, `getOrElse`, `orElse` — all the standard operations for working with absent values are available and chainable.

The additional clarity cost is that `Option<A>` is more verbose than `string | undefined`. This is the intended trade-off: the verbosity makes the optionality explicit and auditable.

#### Why no `enum`?

TypeScript `enum`s have a surprising compilation model: they produce runtime objects, create nominal typing that interacts oddly with structural typing, and have a numeric variant that allows invalid values to be cast in. The string-literal union (`'pending' | 'approved' | 'rejected'`) and the `as const` object are both superior for different use cases, and both align with TypeScript's structural type system.

#### Why no `interface`, prefer `type`?

`interface` declarations are open: they can be extended via declaration merging, even accidentally. `type` aliases are closed. In a codebase where correctness depends on sum types having a fixed, known set of variants, the openness of `interface` is a hazard. `type` is the safer default; `interface` is available with a DEVIATION where a framework contract requires it.

#### Why `absurd` instead of `throw` in default branches?

`throw new Error('unreachable')` compiles and runs. If it ever executes, something has gone wrong silently. `absurd(x)` where `x: never` does not compile if `x` is not `never` — the compiler catches the missing case before the code reaches production.

---

### 2.2 `API_CODING_STANDARD.md` — the boundary standard

#### Why `@tsfpp/boundary` instead of raw `Response`?

The Fetch API's `Response` constructor is stringly-typed. A 422 response looks like `new Response(JSON.stringify({...}), { status: 422, headers: ... })`. There is no compile-time check that the status code matches the body shape, that the content-type is set, or that the error follows RFC 9457. Errors are easy to construct inconsistently.

`@tsfpp/boundary` provides typed constructors — `apiErrorToResponse`, `createdResponse`, `mkPaginated` — that encode the correct status, headers, and body shape in a single call. The type system prevents a 422 response from being returned without a validation error, or a 201 response without a `Location` header.

#### Why is `extractContext` first?

Every handler needs a `traceId` for observability and a context object for auth. Extracting context first means the `ctx` object is available for all subsequent error responses, including those produced by validation failure. A validation response without a trace ID is harder to correlate in logs.

#### Why is the handler shape fixed (parse → use-case → respond)?

A fixed handler shape is easier to audit. If every handler follows the same four-step pattern, a reviewer can verify compliance by pattern-matching rather than by tracing arbitrary logic. The constraint also prevents handlers from becoming fat service objects that bypass use-case boundaries.

---

### 2.3 `REACT_CODING_STANDARD.md` — the UI standard

#### Why discriminated unions for component state?

The alternative — multiple `boolean` flags — creates a combinatorial explosion of possible states. A component with `isLoading`, `hasError`, and `isEmpty` flags has 8 possible state combinations, most of which are semantically meaningless or contradictory (`isLoading && hasError` simultaneously). The component code is then littered with guard clauses that implicitly assume certain flag combinations never occur.

A discriminated union with variants `loading | error | empty | populated` has exactly four states, all semantically meaningful, all exhaustively handled. The component cannot be in a state that makes no sense.

#### Why is `useEffect` the escape hatch of last resort?

`useEffect` is React's mechanism for synchronising with external systems. It is not a general-purpose side-effect mechanism, a data-fetching primitive, or a way to react to user events. Using it for these purposes leads to race conditions (effects running after the component unmounts), dependency array errors (missing or extra dependencies), and complex cleanup logic.

TanStack Query handles data fetching. Event handlers handle user events. Derived state handles computed values. `useEffect` is left only for genuine external synchronisation: WebSocket subscriptions, `IntersectionObserver`, imperative DOM libraries, canvas animation loops.

#### Why is speculative memoisation forbidden?

`useMemo`, `useCallback`, and `React.memo` are optimisation tools, not correctness tools. Adding them speculatively increases code complexity, makes the dependency array an ongoing maintenance burden, and often has no measurable performance effect because the operation being memoised was already cheap. Memoisation should be added after profiler evidence shows it is needed.

---

### 2.4 `DATA_CODING_STANDARD.md` — the DAL standard

#### Why the adapter pattern?

A repository adapter implements a port (an interface) defined by the domain. This means the domain never has a compile-time dependency on the database library. The domain can be tested with an in-memory stub. The database can be swapped without changing domain code. The adapter is the only place where infrastructure types (rows, prepared statements, connection objects) exist.

#### Why is not-found `Option<A>`, not `throw`?

A record not being present in the database is not an exceptional condition — it is a normal domain outcome. Modelling it as a thrown exception (or a `null` return) obscures this: the caller must either catch an exception or null-check, neither of which is visible in the function signature. `Option<A>` makes the "might not exist" case part of the contract, forces the caller to handle it, and composes correctly with the rest of the prelude.

#### Why is transaction management at the use-case layer?

A transaction boundary represents a unit of work that must succeed or fail atomically. That is a business decision, not an infrastructure decision. A repository method that implicitly starts and commits a transaction cannot participate in a larger unit of work managed by a use-case. Passing the transaction context from the use-case layer to the adapter preserves the correct separation.

---

### 2.5 `TEST_CODING_STANDARD.md` — the test standard

#### Why TDD (red before green)?

Test-driven development has a secondary benefit beyond catching bugs: it forces the developer to think about the contract before thinking about the implementation. A developer writing a test must answer: "What does this function return given this input?" That question is easier to answer correctly before the implementation exists, because the implementation cannot bias the answer.

The "red before green" rule also prevents the most common TDD failure: writing the test after the implementation and unconsciously writing a test that passes against the implementation as written, rather than against the specification as intended.

#### Why fast-check for pure functions?

Example-based tests check specific inputs. They can only catch bugs for the inputs you thought to test. Property-based tests check that a *law* holds for a generator's range of inputs. A law like "identity: `map(x => x)(opt) ≡ opt`" is stronger than "it works for these three examples I thought of." The combination — specific examples for documentation, property tests for correctness — is more thorough than either alone.

#### Why MSW instead of stubbing `fetch`?

Stubbing `fetch` at the module level replaces a global and can produce test pollution: a test that forgets to restore the stub affects subsequent tests. MSW intercepts at the network layer, leaving the actual HTTP client in place. This means tests exercise the full request pipeline, including serialisation, content-type handling, and error parsing — exactly the code that is most likely to be wrong in an API integration.

#### Why RTL over implementation-level testing?

Components exist to render UI that users interact with. A test that asserts on internal state, renders a specific sub-component, or queries by a `data-testid` attribute is testing the implementation. When the implementation changes — a refactor, a component split, a className change — the test fails even though the user-facing behaviour is unchanged. RTL's query hierarchy (by role, then by label, then by text) forces tests to assert on the interface a user actually encounters.

---

### 2.6 `ANNOTATION_CODING_STANDARD.md` — the annotation standard

#### Why "explain the why, not the what"?

Code tells you what it does. A function named `validateEmail` that calls a regex match tells you what it does. A comment that says `// validate the email` adds nothing. But a comment that says `// RFC 5322 allows unusual characters in the local part; this regex is intentionally permissive to avoid false negatives — the authoritative check happens at delivery time` tells you something the code cannot: the reasoning behind the choice and the known limitation.

Comments that paraphrase the code age poorly. When the code changes, the paraphrasing comment becomes wrong. Comments that explain the reasoning survive refactoring: the reasoning is usually still valid even after the implementation changes.

#### Why mandate documenting rejected alternatives?

The most dangerous moment in a codebase is when a future developer — possibly the original author six months later — looks at a non-obvious implementation choice and "improves" it to the more obvious alternative. If the obvious alternative was rejected for a reason, that improvement is a regression. Documenting rejected alternatives converts implicit decisions into explicit ones, making the non-obvious choice durable.

#### Why structured code markers with author and date?

A `TODO` without an author is unaccountable. Nobody knows who intended to fix it, whether the fixer is still on the team, or whether it is still relevant. A `HACK` without a date is undateable — it might be a week old or five years old. The structured format `// HACK(author, YYYY-MM-DD, TICKET): description` converts a marker from a note to a commitment: someone is accountable, the age is known, and the tracking system is referenced.

---

### 2.7 `SECURITY_CODING_STANDARD.md` — the security standard

#### Why validate at the boundary, not inside the domain?

Boundary validation follows the same logic as Parse, Don't Validate (see §2.1 base standard rationale). If input is validated inside a domain function, every domain function must defend itself. If input is validated and parsed at the boundary — into typed domain values — the domain can assume its inputs are valid. The validation cost is paid once; the domain is simpler.

#### Why is `principalId` never trusted from the request body?

A client that controls the request body can provide any `principalId` it chooses. Authentication must be verified by the server from a signed token (JWT, session, API key) and the principal extracted from the verified token — never from a user-supplied field. This rule exists because the failure mode (a user claiming to be another user by supplying their ID) is both trivially exploitable and non-obvious to a developer unfamiliar with the attack surface.

#### Why `baselineSecurityHeaders` on every response?

Security headers like `Strict-Transport-Security`, `X-Content-Type-Options`, and `Cache-Control: no-store` are not optional extras — they are the minimum defensive posture for any HTTP response. Forgetting them on individual routes is a common source of security findings in audits. Applying them via a shared utility that is required on every response eliminates the possibility of forgetting.

---

### 2.8 `CONFIG_CODING_STANDARD.md` — the configuration standard

#### Why ban direct `process.env` access outside the loader?

`process.env` is a global, stringly-typed side channel. Any module can read any key at any time, and missing values surface late as `undefined` in whichever code path reaches them first. This creates hidden dependencies, delayed failures, and tests that must mutate global process state.

TSF++ treats environment values as untrusted boundary input. They are parsed once at startup, validated, and converted into a typed `Config` value. The rest of the program depends on that value, not on ambient globals.

#### Why fail fast at startup?

Configuration defects are deployment defects. They should fail before the process accepts traffic, not during the first request that touches a missing key. Startup validation turns a late production incident into an early deterministic failure in deployment.

#### Why inject config as a dependency?

Dependency injection makes configuration requirements explicit in function signatures and constructors. A use-case requiring `tokenTtlSeconds` should receive it from `Config`; it should not reach into global state. This improves testability, enables local reasoning, and preserves referential transparency in core logic.

---

### 2.9 `LOG_CODING_STANDARD.md` — the structured logging standard

#### Why logging as a port instead of direct logger imports?

Directly importing `pino`/`winston` into domain code couples business logic to infrastructure choices. A logger port (`Logger`) keeps logging intent in the domain while leaving transport, formatting, and sinks in adapters. This preserves layering and allows logger implementations to change without touching use-cases.

#### Why structured logs only?

Unstructured text logs are hard to query, correlate, and alert on. Structured logs encode stable fields (`message`, `traceId`, `code`, domain identifiers) that machines can index and humans can filter quickly during incidents.

#### Why forbid `console.*` in application code?

`console.*` bypasses log-level control, field enrichment, redaction policy, and centralized routing. In production systems this creates observability gaps and potential data leakage. `console.error` is permitted only for early startup failure reporting, the one phase where the logging adapter may not yet be initialised.

---

## Part III — What TSF++ does not do

TSF++ is a coding standard, not an architecture standard. It constrains *how* code is written, not *what* the system does or *how it is structured*.

TSF++ does not prescribe:
- Deployment topology (monolith, microservices, serverless)
- Database choice (relational, document, graph)
- API style (REST, GraphQL, RPC)
- Package structure beyond basic layering constraints

These decisions belong to the project, not the standard.

TSF++ also does not claim to prevent all defects. SQL injection, business logic errors, race conditions in distributed systems, and requirements misunderstandings are outside its scope. TSF++ eliminates the defects that come from *how code is written*; the defects that come from *what code is written* require different tools.

---

## Part IV — The AI dimension

TSF++ was designed in an era where language models are used as coding agents. This is not incidental — it is a design input. The properties that make TSF++ code easier for humans to reason about have measurable effects on model behaviour:

**Smaller hypothesis space.** A model generating code in a TSF++ codebase knows that it should use `Result<T, E>`, `Option<A>`, `pipe`, and discriminated unions. It does not need to choose from a large vocabulary of patterns. The constraint reduces the number of plausible completions, which reduces the probability of a wrong completion being selected.

**Exhaustiveness as a correctness signal.** A model that generates a non-exhaustive `switch` receives a type error. The type error is a training signal in context: the model sees that its output was wrong and can correct it. `absurd` converts the type error into an explicit, readable constraint.

**Explicit error types.** `Result<T, E>` makes error types visible in completions. A model generating a call to a `Result`-returning function sees `isOk` / `isErr` / `map` / `flatMap` as the natural next tokens. It does not need to decide whether to try/catch or whether the function throws.

**Fewer tokens per correct unit of work.** A `pipe`-based transformation is denser than an equivalent imperative version. `pipe(input, validateEmail, flatMap(createUser), map(toDto))` expresses the same computation as ten lines of imperative code with intermediate variables and error checks. The dense form requires fewer tokens to generate correctly and fewer tokens to verify.

The practical outcome: TSF++ agents produce fewer first-pass violations, audit cycles are shorter, and the overall human-to-machine ratio of effort shifts toward the human doing review rather than the machine generating incorrect code that requires extensive correction.

This is the deepest alignment between the standard and its tooling: the same properties that make code correct and auditable for humans make it cheaper and more reliable for models to generate.