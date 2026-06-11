# TSF++ Philosophy

## The problem this standard exists to solve

Production TypeScript fails in predictable ways. A function returns `undefined` where the caller assumed `User`. An exception unwinds through five layers and lands in a `catch (e)` that swallows it. A `let` reassignment two hundred lines away invalidates an aliased reference. A new variant is added to a union and three switch statements silently miss it.

These are not edge cases. They are the dominant defect classes in TypeScript codebases, and they share a structural property: the type system was permitted to *not know* something it could have known. `any`, `as`, `!`, `throw`, `null`, `let`, and the open-ended `switch` are each a place where the compiler stops being able to prove what the program does.

TSF++ is a standard for code that has to be right. It treats every such opening as a defect to be eliminated, not a convenience to be defended. It assumes that programmers under deadline cannot reliably reason about non-local state, partial functions, or unhandled cases — and that the type system's job is to make those mistakes unrepresentable rather than to detect them after the fact.

## Lineage

TSF++ draws on three traditions of high-assurance software, each developed in environments where defects are expensive in a literal, often-fatal sense.

**Lockheed Martin JSF++** governs the C++ code that flies the F-35. Its central conviction is that a language as permissive as C++ requires a coding standard that subtracts features rather than adds them — the subset is the safety property.

**JPL Power of Ten** (Holzmann) governs the C code that operates on spacecraft that cannot be patched in flight. Its central conviction is that static analysis can only verify what the language permits to be verified, and so the language as written must be restricted to the analyzable fragment.

**ML and Haskell** contribute the positive program: algebraic data types, total functions, parametricity, and equational reasoning. Where JSF++ and Power of Ten subtract dangerous constructs from imperative languages, ML and Haskell show what becomes available when those constructs were never there.

TSF++ is the application of these three lineages to TypeScript. The subset is the safety property. The remaining language is functional, total, and algebraic. The compiler is the first proof.

## The standard family

TSF++ is a family of layered standards, not a single document. `CODING_STANDARD.md` is the base standard that always applies. Domain and cross-cutting profiles extend it for specific concerns:

- `API_CODING_STANDARD.md` for HTTP boundaries and transport contracts
- `REACT_CODING_STANDARD.md` for UI composition and state modelling
- `DATA_CODING_STANDARD.md` for repository adapters and data access boundaries
- `TEST_CODING_STANDARD.md` for test architecture and verification practice
- `ANNOTATION_CODING_STANDARD.md` for comments, markers, and decision traceability
- `SECURITY_CODING_STANDARD.md` for security controls and trust-boundary hygiene
- `CONFIG_CODING_STANDARD.md` for typed configuration loading and environment parsing
- `LOG_CODING_STANDARD.md` for structured logging, trace correlation, and redaction discipline

This layering is intentional. The base rules establish algebraic and total coding constraints; profiles tighten those constraints where domain-specific failure modes are common.

## The axioms

### 1. Correctness by construction

The primary goal is to make illegal states unrepresentable in the type system. If a value cannot exist in an illegal state, you cannot write code that creates one, no matter how careless you are.

**Defect class eliminated.** Invalid combinations of fields, missing variant cases, smuggled invariants. The most common bug in business logic — "I forgot we could be in state X here" — is moved from runtime to compile time, or made impossible to express at all.

**Consequence.** Type narrowing, not runtime checks. Exhaustive matching, not boolean guards. Smart constructors at every boundary where untyped data enters the domain.

### 2. Totality

Every function must have an output for every legal input. Partiality — functions that crash, throw, or loop forever on valid input — is a hidden control-flow vector that reviewers cannot cheaply detect.

**Defect class eliminated.** Uncaught exceptions, `undefined is not a function`, silent `null` returns from APIs that nominally return `T`. Failure becomes a value the caller is forced to handle, not a transition the caller can fail to anticipate.

**Consequence.** No partial functions. Use `Option<T>` for "no value", `Result<T, E>` for "might fail". Never `null` or `throw` in the middle of a pipeline.

### 3. Immutability

Mutable state is temporal coupling. If an object can change after creation, every alias to it becomes a potential source of surprise, and every line that operates on it becomes order-sensitive.

**Defect class eliminated.** Aliasing bugs, order-of-update bugs, stale-reference bugs, and the family of "it worked in isolation but broke in context" failures. With immutable values, identity and equality coincide; with mutable values, they diverge.

**Consequence.** Data is values, not objects. Use `const`, discriminated unions, and recursive structures. No `let` within a function body.

### 4. Referential transparency

A function's output depends only on its inputs. Calling a function twice with the same arguments yields the same result. Globals, ambient context, wall-clock time, and unannounced I/O are inputs whether the signature admits it or not — and a signature that conceals them is a signature that lies.

**Defect class eliminated.** Heisenbugs, test flakes, "works on my machine", and the cascade of defensive coding that follows when callers stop trusting that a function does what it says. Equational reasoning — substituting a function call for its result — becomes valid, which is the foundation of every higher-order refactor.

**Consequence.** Immutable inputs, pure outputs, explicit side effects at the boundary. No class instance state, no `this`, no ambient context. Effects are reified as values (`Task`, `IO`, `Result`) and threaded through the program, not invoked implicitly.

### 5. Exhaustiveness

The compiler must enforce that every case is handled. Silent fallthrough on an unanticipated variant is a defect the type system can detect and the language already supports; failing to enable that detection is a choice.

**Defect class eliminated.** "We added a new variant and forgot to update the renderer." A new arm of a discriminated union becomes a compile error at every site that should have considered it, surfacing the inventory of work to be done rather than letting it ship as a silent gap.

**Consequence.** Discriminated unions with exhaustive `switch` and an `absurd` witness in the default arm. No untagged unions, no generic `any`, no silent fallthroughs.

## How the axioms compose

Each axiom is useful in isolation. The standard's claim is stronger: when applied together, they enable *equational reasoning* over the entire program.

Equational reasoning is the property that a function call can be replaced by its result without changing the meaning of the program. It sounds modest. In practice it is the foundation of every confident refactor, every reliable test, every cache, every memoization, every parallelization, every formal review. Code without equational reasoning is code that must be *run* to be understood. Code with equational reasoning can be *read*.

The axioms reinforce each other to produce this property:

- **Totality and immutability** remove temporal coupling. A function that always returns and never mutates has no observable order-dependence.
- **Referential transparency and immutability** localize side effects. What is not at the boundary is pure; what is at the boundary is reified and visible.
- **Exhaustiveness and correctness by construction** remove dead and unreachable paths. The set of states the program can be in is enumerable from its types.
- **Immutability and correctness by construction** propagate type changes as compile-time errors. A field rename or variant addition surfaces every site that must be updated.

The whole is greater than the sum. A codebase that observes one axiom intermittently gets intermittent benefit. A codebase that observes all five gets a qualitatively different property: it can be reasoned about without running it.

## What you trade

TSF++ is not free.

The upfront cost is real: more deliberate type design at module boundaries, more characters typed for `Option` and `Result` plumbing, fewer of the syntactic shortcuts that make TypeScript feel like a scripting language. Junior team members face a learning curve. Some refactors that would have been a single keystroke become a deliberate transformation.

The payoff compounds rather than amortizes. The savings are not "we caught a bug in code review"; they are "the bug was never proposable". Over the life of a system the latter dominates, because the bugs that matter are the ones that survived review, escaped tests, and only revealed themselves in production after the original author had forgotten the context.

The trade is therefore not "slower now, faster later" — it is "slower now, *more confident* later". Speed of change in a mature TSF++ codebase comes from the type system carrying the integrity proof, not from the absence of one.

## Anti-patterns this standard rejects

TSF++ rejects four positions that are common in mainstream TypeScript. Each is rejected for the same reason: it cedes a proof the type system was capable of carrying.

**Gradual typing as a destination.** `any`, `as`, and `!` exist in TypeScript to ease migration from JavaScript. As a transitional measure they are defensible. As a steady state they are a standing waiver of every guarantee the rest of the type system provides. TSF++ permits these only inside smart constructors at the boundary between untyped input and the typed domain — never in business logic.

**Object-orientation as the default modelling language.** Classes blur data and behavior. `this`-binding is a known source of subtle defects. Inheritance couples identity with equality. Encapsulated mutable state is exactly the temporal coupling axiom 3 forbids. TSF++ models data as algebraic types and behavior as functions over those types, with no `this`, no inheritance, and no instance state.

**Exceptions as ordinary control flow.** `throw` is invisible in a function signature. A reader of the type `(x: A) => B` cannot tell whether the function returns `B`, throws, or loops. `Result<B, E>` makes the same information visible, exhaustively handled, and composable. TSF++ reserves `throw` for unrecoverable invariant violations and forbids it in domain logic.

**Tests as a substitute for types.** A test exhibits a defect on one input. A type rules out a defect on every input. They are complementary — but they are not interchangeable, and a codebase that relies on tests to enforce properties the type system could have enforced has chosen to sample where it could have proven.

These rejections are categorical. They are the line between TSF++ and a strict-but-not-functional TypeScript style.

## On libraries

Several libraries implement TSF++-compatible patterns. None of them *is* TSF++; the standard is a discipline, not a dependency.

**fp-ts** provides algebraic data types and combinators in the ML tradition, with type classes encoded via higher-kinded type emulation. It is compatible with TSF++ and unnecessary for it.

**Effect-TS** provides a structured effect runtime — fibers, schedulers, dependency injection, retries, tracing. It is an architectural commitment that goes well beyond what TSF++ requires. Codebases that adopt Effect can satisfy TSF++; codebases that satisfy TSF++ are not obliged to adopt Effect.

**Zod** provides runtime schema validation at the system boundary. It complements TSF++ directly: the typed domain begins where Zod has parsed `unknown` into a value the type system can carry.

**`@tsfpp/prelude`** is this project's reference implementation of the minimum ADT surface — `Option`, `Result`, `List`, branded types, an `absurd` witness, and the combinators that operate on them. It is a sufficient foundation but not the only one.

A codebase can satisfy TSF++ with any of these, with several together, or with none — provided the axioms hold.

## The aesthetic claim

Safer code is not the only payoff, nor the most durable one. TSF++ code is *clearer*.

A function whose type signature includes every input, every output, and every failure mode tells a reader what it does without requiring them to step through it. A discriminated union with five arms tells a reader the exhaustive list of states without requiring them to grep for assignments. A pipeline of pure functions can be read like an algebraic expression and refactored like one.

This is not an incidental benefit. It is what makes the standard sustainable. Practitioners adopt TSF++ for safety and continue with TSF++ for legibility. The discipline pays in defect prevention; the practice rewards in the quality of the code itself. That is the deeper reason the axioms compose: they are not five constraints stacked on top of an imperative language, they are the shape of code that has had the imperative artifacts removed.

## When to adopt, when to skip

**Adopt TSF++ when:**

- The system has a lifespan measured in years and will be modified by people who did not write it.
- Defects compound — financial, medical, regulated, or operationally critical domains.
- The team is willing to invest in type design at module boundaries and reads ML-family code without friction.
- Refactoring is expected to be frequent and large.

**Skip TSF++ when:**

- The system is a prototype whose code will be discarded once a question is answered.
- The team is mid-migration from untyped JavaScript and gradual typing is the current priority.
- The codebase is dominated by class-based frameworks (Angular, NestJS, TypeORM) whose contracts presume OOP — the friction outweighs the benefit.
- "We have always done it this way" is a non-negotiable constraint.

These are descriptive, not exhortative. TSF++ is a fit for a specific class of system. It is not a universal style claim and does not aspire to be.

## Further reading

**The lineages**

- *JSF Air Vehicle C++ Coding Standards* (Lockheed Martin) — https://www.stroustrup.com/JSF-AV-rules.pdf
- *The Power of Ten — Rules for Developing Safety Critical Code* (Gerard Holzmann, NASA JPL) — https://spinroot.com/gerard/pdf/P10.pdf
- *Haskell 2010 Language Report* — https://www.haskell.org/onlinereport/haskell2010/

**The positive program**

- *Why Functional Programming Matters* (John Hughes, 1990) — the classic argument for what composition buys you.
- *Theorems for Free!* (Philip Wadler, 1989) — parametricity and what types alone can prove.
- *Types and Programming Languages* (Benjamin Pierce, MIT Press, 2002) — the textbook.
- *Thinking with Types* (Sandy Maguire) — type-driven design in practice.

**The conviction**

- *Simple Made Easy* (Rich Hickey, Strange Loop 2011) — on the difference between *simple* and *easy*, and why the standard prefers the former.
- *Out of the Tar Pit* (Ben Moseley and Peter Marks, 2006) — on accidental complexity and the case for functional, declarative state management.