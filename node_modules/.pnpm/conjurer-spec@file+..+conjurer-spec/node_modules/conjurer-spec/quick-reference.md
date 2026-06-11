# Conjurer — Quick Reference

All 137 symbols across 12 grimoires. For full signatures and examples,
see the individual grimoire files.

---

## core — The language itself

Organised into seven thematic parts: fundamentals, composition, execution,
certainty contracts, typing, reflection, and ecosystem connectives. See
`core.md` for the full construct map and signatures.

| Symbol | Part | Synopsis |
|---|---|---|
| `conjure` | I | Primary manifestation: describe what should exist |
| `refine` | I | Iteratively enhance an existing manifestation |
| `context` | I | Declare semantic context for subsequent invocations |
| `using` | I | Scope a context or namespace to a block |
| `assume` | I | Declare operative constraints: team, infrastructure, non-negotiables |
| `ritual` | II | Multi-phase invocation with named stages and intermediate artefacts |
| `~>` | II | Threading: compose transformations left-to-right |
| `transmute` | II | Change form while preserving semantic essence |
| `weave` | II | Integrate independent artefacts into a system with explicit contracts |
| `lore` | II | Register domain patterns and anti-patterns for session-wide application |
| `sequence` | III | Execute operations in order; saga compensation on failure |
| `parallel` | III | Execute operations concurrently; combine by merge, quorum, or first-wins |
| `branch` | III | Conditional execution on predicate or structural pattern |
| `retry` | III | Automatic retry with backoff for transient failures |
| `intercept` | III | Apply cross-cutting concerns without touching the operation |
| `ward` | III | Structured error containment with explicit degradation ladder |
| `certain` | IV | Inline qualifier: value is bound, no substitution permitted |
| `prefer` | IV | Inline qualifier: value is a lean; default for unmarked entries |
| `allow` | IV | Inline qualifier: value is illustrative; system may substitute |
| `given` | IV | Declare preconditions; treat MCP results as ground truth |
| `ensure` | IV | Declare postconditions; name which layer verifies what |
| `shape` | V | Semantic type contract — what data means, not just its structure |
| `explain` | VI | Transparent account of how a manifestation was produced |
| `meta-query` | VI | Interrogate a manifestation — assumptions, trade-offs, failure modes |
| `witness` | VI | Observe without modifying; produces out-of-band reasoning record |
| `as` | VI | Apply a perspectival role — security auditor, new engineer, regulator |
| `charter` | VII | Session anchor for `.cnj` files: goals, decisions, open questions |
| `target` | VII | Declare implementation form: language, standard, artefact types |
| `asset` | VII | Register external standard or capability (coding standard, design system) |
| `handover` | VII | Package session context; transfer to specialist agent |
| `materialise` | Turn a target into an artefact: deterministic preflight plan, then semantic generation |

### Key parameters

| Parameter | Meaning |
|---|---|
| `:requires` | Load-bearing capabilities — always present |
| `:prefers` | Preferred capabilities — applied when feasible |
| `:style` | Aesthetic guidance — never overrides correctness |
| `:deferred` | Noted but not implemented now |
| `:manifest` | Bind the result to a name |
| `:when` | Conditional refinement — activates when predicate holds |
| `:inherits` | Context hierarchy — extends parent, does not replace |

### Certainty markers

| Form | Meaning |
|---|---|
| `(certain v)` | Value is bound — no substitution permitted at any layer |
| `(prefer v)` | Value is a lean — honoured unless overridden (default for unmarked map entries) |
| `(allow v)` | Value is illustrative — system may substitute freely |
| `(given ...)` | Preconditions: `:facts`, `:state`, `:from-mcp` treated as ground truth; `:scope` controls reach |
| `(ensure ...)` | Postconditions: `:structural` (mechanical), `:semantic` (LLM-enforced), `:behavioural` (scenarios); `:verify-via [:mcp :llm :tests :lint]`; `:on-violation :halt \| :warn \| :document` |

---

## domain `d/` — Knowledge extraction

| Symbol | Synopsis |
|---|---|
| `d/explore` | Analyse sources; extract entities, relationships, constraints, rules |
| `d/extract` | Targeted retrieval of a specific domain facet |
| `d/refine` | Deepen or extend an existing model on specific concepts |
| `d/merge` | Combine models; align concepts; make conflicts explicit |
| `d/compare` | Structured comparison: alignments, divergences, gaps |
| `d/scope` | Derive a focused sub-domain view from a larger model |
| `d/bounded-context` | Partition a model into bounded contexts and context-map relationships |
| `d/ubiquitous-language` | Build an enforceable canonical glossary for a domain or context |
| `d/evolve` | Maintain versioned domain-model lineage with change drivers and rationale |
| `d/model` | Manually define a domain model from practitioner knowledge |
| `d/annotate` | Add tacit knowledge without altering extracted facts |
| `d/validate` | Check model for completeness, consistency, pattern conformance |
| `d/generate-dsl` | Create a domain-specific language from a domain model |
| `d/export` | Export a model to documentation or interchange formats |
| `d/query` | Search a model for concepts, patterns, or relationships |

### `:focus` values for `d/explore`
`:taxonomy` `:entities` `:operations` `:constraints` `:nomenclature`
`:legal-definitions` `:relationships` `:actors` `:lifecycle` `:invariants`

### `:infer` values
`:missing-concepts` `:implicit-rules` `:unstated-assumptions`

---

## data `data/` — Data lifecycle

| Symbol | Synopsis |
|---|---|
| `data/schema` | Formal schema: fields, types, constraints, compliance |
| `data/generate` | Realistic datasets with locale-aware distributions |
| `data/transform` | Declarative reshape, filter, enrich, aggregate |
| `data/convert-format` | Format conversion preserving semantics (CSV ↔ Parquet ↔ JSON …) |
| `data/pipeline` | Multi-stage pipeline with resilience and checkpointing |
| `data/validate` | Validate data against schema; collect all violations |
| `data/profile` | Statistical profile: distributions, cardinalities, drift detection |
| `data/generate-tests` | Auto-generate test suites from schema constraints |
| `data/expect` | Dataset-level expectations (volume, distribution, freshness) against a baseline |
| `data/contract` | Producer-consumer data contract: guarantees, SLA, schema-evolution, breach handling |
| `data/lineage` | Non-invasive provenance tracking through transformations |
| `data/mask` | Privacy: anonymise, pseudonymise, redact, or substitute |
| `data/reconcile` | Compare two datasets that should match; surface discrepancies |

### `:quality` values for `data/generate`
`:basic` `:realistic` `:production`

### `:strategy` values for `data/mask`
`:anonymise` `:pseudonymise` `:redact` `:synthetic-substitute`

---

## web `w/` — Web development

| Symbol | Synopsis |
|---|---|
| `w/analyze` | Analyse a site: visual design, structure, accessibility, performance |
| `w/extract-style` | Extract design tokens; normalise to a portable theme (NL Design System, Tailwind, custom) |
| `w/extract-structure` | Extract page structure, navigation, inferred user journey |
| `w/prototype` | Complete deployable web project; production-ready from first invocation |
| `w/component` | UI component with all variants, states, and interaction patterns |
| `w/tokens` | Design token system: primitives → semantic → component tiers |
| `w/responsive` | Responsive behaviour as an explicit strategy (incl. deliberate fixed-desktop) |
| `w/flow` | Interaction and state-machine design for multi-step UI, with error recovery |
| `w/copy` | Interface microcopy (labels, empty/error states) bound to components and states |
| `w/audit` | Accessibility, performance, SEO, code quality audit |
| `w/migrate` | Framework/toolchain migration preserving appearance and behaviour |

### `:accessibility` values
`:wcag-aa` (default, legal minimum) `:wcag-aaa` (highest standard)

### Common `:features` values
`:responsive` `:dark-mode` `:animations` `:accessibility` `:i18n` `:pwa`

(For responsive behaviour as a designed strategy — breakpoints, transforms,
deliberate fixed-desktop layouts — use `w/responsive` rather than the flag.)

---

## semantics `s/` — Textual analysis

| Symbol | Synopsis |
|---|---|
| `s/texan` | Comprehensive semantic extraction through structured analytical models |
| `s/viewpoint` | Explicit perspectival interpretation from a stakeholder role |
| `s/critique` | Identify logical weaknesses and gaps in an argument (cf. `e/critique` for prose quality) |
| `s/synthesise` | Multi-perspective integration; preserves genuine tensions |
| `s/distill` | Compress to argumentative skeleton — different from summarisation |
| `s/compare` | Compare texts: convergences, divergences, unique claims |
| `s/chronicle` | Extract temporal structure: timeline, causality, projections |
| `s/counter-manifest` | Principled alternative interpretation from a different position |
| `s/detect-manipulation` | Detect manipulation tactics; distinguish from legitimate persuasion |
| `s/semantic-profile` | Semantic fingerprint: argumentative complexity, rhetorical features |

### `:models` for `s/texan`
`:argumentation` `:framing` `:rhetoric` `:ethics` `:sentiment` `:style`
`:logical` `:contextual` `:power` `:facts-assumptions` `:temporal` `:stakeholder`

---

## orchestrate `o/` — Runtime workflow coordination

| Symbol | Synopsis |
|---|---|
| `o/define-workflow` | Named versioned workflow: stages, compensation, monitoring |
| `o/execute-workflow` | Initiate a workflow instance; supports dry-run and resume |
| `o/workflow-status` | Query current state of a running or completed instance |
| `o/scatter-gather` | Distribute in parallel; aggregate by merge, quorum, or first-wins |
| `o/fan-out` | Run one operation per item across a collection, with concurrency control |
| `o/human-approval` | Human-in-the-loop checkpoint with deadline, escalation, audit trail |
| `o/circuit-breaker` | Detect systematic failures; fail fast; allow recovery time |
| `o/schedule` | Recurring trigger with cron, interval, or fixed time; overlap management |
| `o/react` | Event-driven trigger (message, webhook, state change); dedup, ordering, backpressure |
| `o/replay` | Re-execute a workflow from a specific stage; preserves prior work |
| `o/audit-trail` | Complete execution history: decisions, human actions, errors, timing |

### Saga pattern
Register `:compensate` on each stage; set `:on-error :compensate`. Compensation
runs in reverse order automatically on failure.

---

## eloquence `e/` — Audience-aware communication

| Symbol | Synopsis |
|---|---|
| `e/compose` | Calibrated prose from structured knowledge for audience and purpose |
| `e/narrate` | Structure via narrative pattern: problem-solution, deliberative, etc. |
| `e/adapt-register` | Transform content between registers or audiences |
| `e/critique` | Review prose for clarity, register, and audience fit (cf. `s/critique` for argument validity) |
| `e/instruct` | Procedural content: tutorials, how-tos, runbooks, reference docs |
| `e/formalize` | Informal → precise auditable prose for legal or regulatory contexts |
| `e/simplify` | Technical → plain language for non-specialist audiences |
| `e/localize` | Cultural adaptation, not just translation |

### `:narrative` patterns for `e/narrate`
`:problem-solution` `:situation-complication-resolution` `:chronological`
`:deliberative` `:comparison-contrast` `:hero-transformation`

### `:audience` keywords
`:engineer` `:senior-engineer` `:executive` `:product-manager` `:legal-counsel`
`:compliance-officer` `:regulator` `:end-user` `:general-public` `:board`

---

## reasoning `r/` — Logical inference

| Symbol | Synopsis |
|---|---|
| `r/model` | Explicit logical model: facts, definitions, axioms, constraints |
| `r/rules` | Named if-then rules with strength and conflict resolution |
| `r/derive` | Primary inference: deductive, inductive, or abductive; full derivation chain |
| `r/decide` | Decision table / tree / rule-set evaluation with path and sensitivity |
| `r/hypothesise` | Abductive: ranked candidate explanations for observations |
| `r/analogise` | Analogical/case-based: transfer a conclusion from similar precedents |
| `r/check` | Verify: does this follow from these premises? Are these consistent? |
| `r/contradict` | Find internal contradictions in a belief set |
| `r/revise` | Belief revision: propagate a retracted/corrected fact through its conclusions |
| `r/trace` | Complete readable derivation chain in step-by-step, tree, or prose form |
| `r/argue` | Construct formal argument in Toulmin, classical, or legal-brief format |

### Inference modes
- **Deductive** — conclusion necessarily follows; as certain as premises
- **Inductive** — probable generalisation; new evidence can overturn
- **Abductive** — best explanation for observations; a candidate, not a certainty
- **Analogical** — transfer from a similar precedent; defeated by material differences (`r/analogise`)

### `:surface` values for `r/derive`
`:conclusions` `:derivation-chain` `:open-questions` `:underdetermined`

---

## taxonomy `t/` — Classification

| Symbol | Synopsis |
|---|---|
| `t/define` | Declare taxonomy: root, criteria, categories, membership rules |
| `t/build` | Construct taxonomy inductively from existing items |
| `t/facet` | Multi-dimensional orthogonal classification |
| `t/classify` | Place items in taxonomy; surfaces confidence and boundary cases |
| `t/align` | Map one taxonomy to another; surfaces gaps and conflicts |
| `t/validate` | Check for exhaustiveness, exclusivity, criterion consistency |
| `t/browse` | Query and navigate: find, filter by facet, traverse paths |
| `t/evolve` | Manage taxonomy change with crosswalk preservation |

### `:membership` types
- **`:monothetic`** — strict necessary and sufficient criteria; sharp boundaries
- **`:polythetic`** — family resemblance; items share most characteristic properties

---

## agent `a/` — Autonomous action

| Symbol | Synopsis |
|---|---|
| `a/define` | Declare agent identity: specializations, standards, constraints, memory |
| `a/memory` | Named memory store for operational state across invocations |
| `a/equip` | Grant scoped tool/resource access (MCP, filesystem, network) with permissions |
| `a/invoke` | Directed specific task — agent equivalent of a function call |
| `a/delegate` | Goal assignment with agent autonomy over approach |
| `a/compose` | Agent pipeline: sequential, parallel, or parallel-then-merge |
| `a/supervise` | Supervisor coordinates team; assigns tasks; synthesises results |
| `a/negotiate` | Structured agent dialogue toward shared position |
| `a/evaluate` | Assess output against criteria; optionally produce improved version |
| `a/reflect` | Agent examines its own output: assumptions, alternatives, failure modes |

### Invoke vs delegate
| Situation | Use |
|---|---|
| Specific task, known approach | `a/invoke` |
| Goal known, path not specified | `a/delegate` |
| Multiple sequential specialists | `a/compose :sequential` |
| Multiple parallel perspectives | `a/compose :parallel-then-merge` |
| Complex goal needing dynamic assignment | `a/supervise` |
| Contested design decision | `a/negotiate` |

### `:approve` values for `a/delegate`
`:each-step` `:major-decisions` `:on-completion` `:never`

---

## Exhume (`x/`) — code & artefact archaeology

The inverse of the forward flow: recovers Conjurer specification from existing
code. Every recovery is graded `:attested` (read directly) vs `:inferred`
(reconstructed, probable) — a guess is never dressed as a fact.

| Symbol | Recovers |
|---|---|
| `x/survey` | First-pass map: languages, structure, entry points, scale, apparent purpose |
| `x/recover-model` | Domain model from source (entities, relationships, invariants) — code-facing twin of `d/explore` |
| `x/infer-conventions` | Actually-practised coding standards → emits an `asset`; separates convention from accident/drift |
| `x/recover-stack` | Declared & enforced standard from manifest + config (deps, build, lint/format); language-agnostic → asset + infra assumption |
| `x/reconstruct-decisions` | Decision log from git history, comments, structure → charter `:decisions`; *what* vs *why* graded |
| `x/charter` | **Capstone:** assemble recovered fragments into a continuable `.cnj` — the reverse handover |

### Confidence grades
- **`:attested`** — read directly from code; reliable
- **`:strongly-inferred`** — well-supported by evidence; probable
- **`:speculative`** — a reasonable guess on thin evidence; treat with care

### The recovery arc
```clojure
(~> "../old-codebase"
  (x/survey :note [:reusable])
  (x/recover-model :emit :d-explore-compatible)
  (x/infer-conventions :emit :asset)
  (x/reconstruct-decisions :emit :charter-decisions)
  (x/charter :title "Project (recovered)" :open-from :gaps))
;; code → spec; continue forward from the recovered .cnj
```

---

## Foresight (`f/`) — what might become

Forward-looking structured opinion: graded deferred candidates, dated reassessment
that preserves the trajectory, and promotion that closes a candidate into a decision.

| Symbol | Records |
|---|---|
| `f/candidate` | A deferred capability as a graded, dated, lifecycle-bearing candidate (scores + rationale + status) |
| `f/reassess` | A dated re-evaluation as context changes — appended to history, never an overwrite |
| `f/hoist` | Promotion of a mature candidate into the decision/target it becomes, bound forward via `:into` |

### Recommended scoring (higher is always better → summable)
`:feasibility` (10 = trivial) · `:elegance` (10 = native) · `:containment` (10 = tiny blast radius) · `:value` (10 = essential)

---

## The `.cnj` file — canonical section order

```
1. (charter ...)           ← always first; goals, decisions, open questions
2. (asset ...)             ← external standards and capabilities
3. (assume ...)            ← operative constraints
4. (context ...)           ← domain semantic frame
5. domain work             ← d/explore, r/rules, t/define, etc.
6. (target ...)            ← implementation declarations
7. (handover ...)          ← when ready to materialise (issued, not always present)
```

---

## Cross-grimoire pipelines — common patterns

```clojure
;; Knowledge → code
(~> requirements-doc
  (d/explore :depth 4)
  (r/derive "What obligations apply?" :using compliance-rules)
  (t/classify entities :using gdpr-taxonomy)
  (target :api :language :typescript :standard :team-standard)
  (handover :to :typescript-agent :scope [:api]))

;; Text → decision
(~> policy-document
  (s/texan :models [:argumentation :facts-assumptions])
  (r/check "Does this satisfy our obligations?" :against compliance-model)
  (e/compose "Compliance Assessment" :audience :legal-counsel))

;; Agent quality loop
(~> domain-model
  (a/invoke :typescript-agent :task "Generate API" :produce :source)
  (a/evaluate :against quality-criteria :improve true)
  (a/reflect :questions ["What assumptions might not hold?"] :depth :thorough))

;; Multi-perspective review
(a/compose review
  :strategy :parallel-then-merge
  :agents [
    {:agent :security-reviewer  :task "Identify risks"}
    {:agent :performance-analyst :task "Identify bottlenecks"}
    {:agent :accessibility-lead  :task "Identify barriers"}])
```