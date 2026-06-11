# Conjurer

> "Shall I make spirits fetch me what I please,
> Resolve me of all ambiguities,
> Perform what desperate enterprise I will?" <br/>
> — Christopher Marlowe, The Tragical History of the Life and Death of Doctor Faustus (c. 1592)

<img width="754" height="629" alt="image" src="https://github.com/user-attachments/assets/50411de2-b675-49b1-b8cd-d650aa9c92f6" />

<br/>
Conjurer is a declarative language for LLM interaction. You specify *what* should exist,
not *how* to create it. Clojure-inspired syntax, composable grimoires, and
semantic context accumulation let intent compress over time. The LLM is not
an executor — it is a co-author that ascends to meet you.

---

## The idea

Traditional programming forces the human downward, to the machine's level of expression. Conjurer reverses the direction. The practitioner states intent; the system manifests a complete, production-ready artifact through semantic understanding rather than syntactic execution.

This works because LLMs are not finite automata. They are probability distributions over meaning conditioned on context — which means they can accept semantic *equivalence classes*, not merely syntactic identity. Conjurer is designed around this fact.

And the flow runs both ways. Intent becomes artifact through manifestation — but a codebase that already exists can be read back the other way, its buried intent *exhumed* into a domain model, conventions, decisions, and a continuable specification. Conjurer can bootstrap itself from a project with a past.

```clojure
;; These three invocations are equivalent. Conjurer accepts all of them.
(conjure user-form :validates [:email-format :age-minimum :password-strength])
(conjure user-form :ensures [:valid-email :legal-age :secure-password])
(conjure user-form :requires {:email :valid-format :age {:at-least 18}})
```

---

## A taste of the language

**Manifest something:**

```clojure
(conjure fraud-detector
  :analyzes transactions
  :flags :suspicious-patterns
  :confidence-threshold 0.75
  :explain-decisions true)
```

**Refine it progressively:**

```clojure
(refine fraud-detector
  :add [:velocity-scoring :geographic-anomaly]
  :focus-on :false-positive-reduction)
```

**Establish context that accumulates across invocations:**

```clojure
(context healthcare
  :domain :healthcare
  :regulations [:hipaa :hitech]
  :entities {:patient [:id :mrn :dob] :encounter [:id :timestamp :codes]})

;; Every subsequent invocation now inherits PHI handling,
;; audit requirements, and healthcare vocabulary — without restating them.
;; Context has mass. The heavier it grows, the shorter your invocations become.

(conjure appointment-scheduler)   ;; HIPAA compliance is implicit
(conjure billing-report)          ;; Audit trail is implicit
(conjure patient-summary)         ;; PHI protection is implicit
```

**Pipeline with the threading operator:**

```clojure
(~> "contract-2024.pdf"
  (d/explore :depth 3 :focus [:obligations :dates :liability])
  (s/texan :models [:argumentation :risk :legal])
  (conjure risk-report :highlight [:termination-clauses :ip-assignment])
  (e/compose :audience :legal-counsel :tone :professional))

;; A PDF becomes a domain model, becomes a semantic analysis,
;; becomes a targeted report, becomes a formatted document.
;; Each step is inspectable; any step can be refined independently.
```

**Integrate coexisting systems:**

```clojure
(weave e-commerce-platform
  :strands [auth-service product-catalog cart-service payment-processor]
  :integrations [
    {:from auth-service :to [cart-service payment-processor] :via :jwt-propagation}
    {:from cart-service :to payment-processor :via :order-handoff
     :contract {:idempotency-key :required :amount-verification :strict}}]
  :ensuring [:no-orphaned-transactions :unified-error-taxonomy])
```

**Contain failure gracefully:**

```clojure
(ward product-recommendations
  :protect (conjure fetch-ml-recommendations :user-id current-user :timeout 200)
  :recover {
    timeout?            (conjure cached-recommendations :from :redis)
    model-unavailable?  (conjure popularity-based-recommendations)
    feature-store-error? (conjure editorial-picks :list :homepage-defaults)}
  :degrade-gracefully true
  :escalate :when (> consecutive-model-failures 50))
```

**Declare certainty explicitly:**

```clojure
(conjure transaction-screening
  :thresholds {
    :daily-limit       (certain (eur 10000))   ;; binding — compliance threshold
    :velocity-window   (prefer  (minutes 5))   ;; reasonable default, tunable
    :anomaly-score-cut (allow   0.75)}         ;; illustrative — system may recalibrate

  :within (ensure
    :structural [(<= :daily-limit (eur 10000))]
    :semantic   ["alerts are actionable, not alarming"]
    :verify-via [:mcp :tests :llm]
    :on-violation :halt))

;; certain · prefer · allow declare how strongly each value binds.
;; ensure declares postconditions and which enforcement layer verifies what.
;; Honest about the boundary between mechanical and semantic guarantees.
```

---

## Grimoires

Conjurer's standard library is organized into **grimoires** — thematic spellbooks, each specializing in a domain of manifestation. A grimoire is both a specification and an educational artifact: philosophy, function signatures, realistic examples, and implementation guidance for LLM processors, woven together as literate programming.

| Grimoire | Namespace | Purpose |
|---|---|---|
| [core](grimoires/core.md) | _(none)_ | The language itself: invocations, composition, execution, certainty contracts, reflection, and ecosystem connectives (`charter` · `target` · `asset` · `handover`) |
| [domain](grimoires/domain.md) | `d/` | Knowledge extraction, domain modeling, DSL generation |
| [data](grimoires/data.md) | `data/` | Synthetic data generation, transformation, validation pipelines |
| [web](grimoires/web.md) | `w/` | Web analysis, component generation, full-stack prototyping |
| [semantics](grimoires/semantics.md) | `s/` | Deep textual analysis, multi-model interpretation, synthesis |
| [reasoning](grimoires/reasoning.md) | `r/` | Inference, rule-based derivation, decision logic, traceable conclusions |
| [taxonomy](grimoires/taxonomy.md) | `t/` | Classification systems, hierarchical organization, controlled vocabularies |
| [orchestrate](grimoires/orchestrate.md) | `o/` | Workflow coordination, saga patterns, human-in-the-loop |
| [eloquence](grimoires/eloquence.md) | `e/` | Tone, audience targeting, rhetorical structure |
| [agent](grimoires/agent.md) | `a/` | Autonomous action: agent definition, invocation, delegation, multi-agent coordination |
| [exhume](grimoires/exhume.md) | `x/` | Code archaeology: recover a domain model, conventions, decisions, and a continuable `.cnj` from an existing codebase |
| [foresight](grimoires/foresight.md) | `f/` | Forward-looking structured opinion: graded deferred candidates, dated reassessment, and promotion to a decision |

---

## Core vocabulary

Seven terms cover the language:

| Term | Role |
|---|---|
| **spell** | A named, reusable invocation pattern |
| **charm** | An anonymous invocation |
| **incantation** | A macro — an invocation that generates invocations |
| **grimoire** | A namespace and its collection of spells |
| **conjure** | The primary manifestation function |
| **refine** | Iterative enhancement of an existing manifestation |
| **manifest** | The result of a conjuration |

---

## Design principles

1. **Declarative supremacy** — specify outcomes, not implementations
2. **Semantic richness over syntactic rigidity** — meaning matters more than form; multiple expressions of the same intent are all valid
3. **Semantic gravity** — context accumulates mass; the heavier it grows, the shorter and more precise your invocations become
4. **Productive ambiguity** — some vagueness is an invitation for creative manifestation, not an error to be corrected
5. **Progressive refinement** — complexity accretes; `refine` is a discovery tool as much as an enhancement mechanism
6. **Intent topology** — not all requirements are equally central; `conjure` distinguishes `:requires`, `:prefers`, `:style`, and `:deferred`
7. **Calibrated certainty** — values carry graded commitment (`certain` · `prefer` · `allow`); invocations carry contracts (`given` / `ensure`); the language is honest about which enforcement layer verifies what
8. **Collaborative discovery** — the LLM co-authors, surfaces tensions, and proposes improvements; it does not merely execute

---

## This repository

```
conjurer/
├── README.md              ← you are here
├── CHANGELOG.md           ← design history and decisions
├── conjurer.md            ← philosophy, naming rationale, full principles
├── template.md            ← canonical structure for grimoires and .cnj files
├── index.edn              ← machine-readable symbol catalog (132 symbols)
├── quick-reference.md     ← every symbol at a glance
├── SKILL.md               ← agent entry point and processing guidance
└── grimoires/
    ├── core.md            ← the language's foundational constructs
    ├── domain.md
    ├── data.md
    ├── web.md
    ├── semantics.md
    ├── reasoning.md
    ├── taxonomy.md
    ├── orchestrate.md
    ├── eloquence.md
    ├── agent.md
    ├── exhume.md          ← recover Conjurer spec from existing code
    └── foresight.md       ← graded deferred candidates and their lifecycle
```

Start with [`conjurer.md`](conjurer.md) for the philosophical foundation, then [`grimoires/core.md`](grimoires/core.md) for the language itself.

---

## Status

Conjurer is in **active design phase**. The specifications are conceptual artifacts — they define language semantics for LLM processors, not a compiled runtime. Nothing is published or versioned yet; the design is evolving.

MIT