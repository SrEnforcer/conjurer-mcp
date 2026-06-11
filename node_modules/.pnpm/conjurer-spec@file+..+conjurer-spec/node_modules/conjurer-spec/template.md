# template.md — Conjurer Structural Specifications

This document defines the canonical structure for two kinds of Conjurer
artefacts: **grimoires** (the standard library of invocations) and **`.cnj`
project files** (the persistent session memory of a Conjurer project).

Both are literate programming artefacts. Both interweave prose and code.
Both are written to be read by humans and interpreted by LLM processors.
What differs is their purpose: grimoires encode reusable capability;
`.cnj` files encode specific project intent.

---

## Part I: Grimoire structure

A grimoire is a thematic spellbook — a collection of related invocations
organized around a coherent domain or capability. Every grimoire in the
Conjurer ecosystem follows the structure defined here. Consistency is not
bureaucratic uniformity; it is what makes grimoires composable, navigable,
and extensible by anyone who understands the pattern.

### Canonical section order

Every grimoire contains these sections, in this order:

```
1. Title and one-paragraph purpose statement
2. Philosophy
   — Why this grimoire exists
   — What design principles govern it
   — Naming rationale (etymology, metaphor)
3. Parts I–N: Thematic construct groups
   — Each construct: signature, parameters, design rationale, examples
4. Best practices
5. Integration patterns
6. Grimoire metadata (EDN block)
7. Implementation notes for LLM processors
8. Closing statement
```

Sections 4–8 are present in every grimoire without exception. Sections 1–3
vary in depth by grimoire complexity but are never absent.

---

### The philosophy section

The philosophy section is the grimoire's most important section and the most
commonly underwritten. It must answer three questions before presenting any
construct:

**Why does this grimoire exist?** Not what it does — why it is a distinct
library rather than part of another grimoire. What problem does organizing
these invocations together solve? What would practitioners lose if this
grimoire did not exist?

**What principles govern the design?** The constructs in the grimoire were
designed rather than discovered. What trade-offs were made? What alternatives
were rejected? What values guided the choices? These are the principles
practitioners need to understand in order to use the grimoire well — and to
extend it intelligently.

**What do the names mean?** Conjurer names carry meaning. The naming rationale
section traces the etymology of the grimoire's namespace and key terms,
connecting them to their metaphorical or technical origins. This is not
decoration; it anchors the vocabulary in something memorable and principled.

The philosophy section should be 400–800 words. It is prose, not a bullet
list. It is written to be read, not skimmed.

---

### Construct definition structure

Every construct follows this template:

````markdown
### `namespace/construct-name`

One or two sentences: what the construct does and why it exists.

#### Signature

```clojure
(namespace/construct-name primary-input
  :parameter-1   type | type | type
  :parameter-2   value
  :optional-param value
  :manifest       result-binding)
```

#### Parameters

**`primary-input`** — What it accepts. Any relevant constraints on form or
type. What happens when it is absent.

**`:parameter-1`** — What this parameter does. The range of values it
accepts. How it interacts with other parameters when relevant.

#### Design rationale

One or two paragraphs explaining *why* this construct exists in the form it
does. What design decisions were made? What alternatives were considered and
why were they set aside? What would go wrong if a practitioner misunderstood
the intent?

The design rationale is the most valuable prose in the construct definition.
It is what enables practitioners to use the construct correctly in situations
the examples do not cover.

#### Example 1: Descriptive scenario name

```clojure
(namespace/construct-name "concrete-realistic-input"
  :parameter-1   :specific-value
  :parameter-2   42
  :manifest      result)

;; Returns:
{:key "realistic value"
 :results ["item-1" "item-2" ...]   ;; truncated for readability
 :metadata {:source "..." :confidence :high}}

;; ✓ Specific behaviour is correct because of specific reason
;; ✓ Edge case is handled this way because of design decision
```

#### Example 2: Different scenario showing different aspect

...

#### Usage patterns

```clojure
;; Pattern: Threading with other constructs
(~> source
  (namespace/construct-name :parameter-1 :value)
  (other-grimoire/construct :parameter :value))
```
````

**Rules for examples:**

- Every value is concrete and realistic. No `"foo"`, `"bar"`, `:some-value`.
  Use real domain names, realistic numbers, plausible content.
- Outputs are truncated with `...` and `; truncated` comments when they would
  be long. Show enough to understand the structure; omit what is obvious.
- Annotate results with `; ✓` comments explaining *why* the output looks the
  way it does. The annotation teaches; the output merely illustrates.
- Progress from simple to complex across examples. The first example should
  be immediately comprehensible. Later examples may show composition and
  edge cases.

---

### The metadata block

Every grimoire ends with a structured EDN metadata block immediately before
the implementation notes:

```clojure
{:grimoire    "name"
 :namespace   "prefix/"        ;; omit for core
 :version     "semver"
 :description "one to two sentences describing the grimoire's purpose"

 :constructs {
   :group-name [construct-1 construct-2 ...]}

 :best-for [
   "specific use case described concretely"
   ...]

 :works-with [:grimoire-1 :grimoire-2 ...]

 :key-concepts [
   {:term "term"
    :definition "precise, complete definition — not a tautology"}
   ...]}
```

The `:key-concepts` entries are the grimoire's glossary. Each definition must
be complete on its own — a practitioner who reads only the definition should
understand the concept without needing to read the prose first.

---

### Implementation notes for LLM processors

This is the grimoire's contract with its runtime. It translates the
construct's abstract specification into concrete behavioural guidance: what
to do when a parameter is absent, how to resolve ambiguity, what "correct"
means for this construct's output, what must never happen.

Implementation notes are written as prescriptions, not descriptions. "When
`:explain` is specified, always produce the derivation chain" — not "the
derivation chain may be produced." Precision here prevents misinterpretation
in high-stakes invocations.

Every construct with non-obvious LLM behaviour should have a dedicated
subsection in the implementation notes. Constructs whose behaviour is fully
specified by the signature and examples do not need one.

---

### Consistency rules

These rules apply to every grimoire without exception:

**Naming** — All construct names use lowercase with hyphens. Namespace
aliases are one or two letters, lowercase. No abbreviations in parameter
names that a domain expert would not recognise immediately.

**Prose style** — Sentences are complete. Paragraphs make one point.
Technical terms are used precisely; when a term's meaning might be ambiguous,
it is defined on first use. Passive voice is avoided in favour of active
constructions that name the subject.

**Code style** — Signatures show all parameters, even optional ones.
Optional parameters are indicated by their default or by a comment. The
`:manifest` parameter appears last. Clojure conventions apply: keywords for
named parameters, vectors for ordered collections, maps for keyed data.

**Cross-references** — When a construct's behaviour depends on another
grimoire's constructs, the dependency is named explicitly. "See `d/explore`
for domain model format" is better than "a domain model."

**Versioning** — The grimoire version follows semantic versioning. Patch
versions fix errors in documentation or examples. Minor versions add
constructs. Major versions change existing construct signatures or semantics.
Every version change is recorded in `CHANGELOG.md`.

---

## Part II: The `.cnj` project file

A `.cnj` file is a Conjurer project's persistent memory. Where a grimoire
encodes reusable capability, a `.cnj` file encodes a specific project's
intent, decisions, and targets — accumulated and structured so that any agent
or practitioner can pick up the work in any session.

### What a `.cnj` file is

A `.cnj` file is:

- **A Conjurer source file** — its constructs are valid Conjurer invocations,
  interpretable by any agent that reads the grimoires.
- **A session continuation mechanism** — attaching a `.cnj` file to a new
  session restores full project context. No re-explanation required.
- **A decision log** — the dated record of what was decided and why,
  preventing the project entropy that comes from decisions being made
  and then forgotten.
- **A selective materialisation plan** — the explicit map of which outputs
  become code, in which language and standard, and which remain as Conjurer
  specification.
- **A handover package** — the structured context that transfers to a
  specialist agent when implementation begins.

A `.cnj` file is not a chat transcript, a requirements document, or a
specification in the formal-methods sense. It is Conjurer code that happens
to encode project-level rather than domain-level knowledge.

### Canonical file structure

Every `.cnj` file follows this section order. Only `charter` is mandatory;
all other sections are added as the project develops.

```
Section 1: charter        — session anchor; always first
Section 2: asset          — external standards and capabilities
Section 3: assume         — operative constraints
Section 4: context        — domain semantic frame
Section 5: domain work    — the intellectual body of the project
Section 6: target         — implementation declarations
Section 7: handover       — when ready to materialise (issued, not always present)
```

The order reflects stability: `charter` changes slowly and is understood
first; `handover` is issued at a specific moment and appears last. A reader
skimming top to bottom understands the project before reaching implementation
details.

---

### Section 1: `charter`

The `charter` is the anchor of every `.cnj` file. It is written first and
updated throughout the project's life. It is the first thing any agent reads
when opening the file.

```clojure
(charter "Descriptive Project Title"
  :version  "0.1.0"             ;; increment when scope or direction changes
  :created  "YYYY-MM-DD"
  :updated  "YYYY-MM-DD"        ;; update on every session that changes the file
  :domain   "concise description of the subject domain"
  :language :en | :nl | :de    ;; primary language of the domain and outputs

  :goals [
    "outcome statement — what the project exists to accomplish"
    "another outcome"]

  :audience {:primary   :audience-keyword
             :secondary [:audience-keyword ...]}

  :decisions [
    ;; Append-only. Never delete or modify existing entries.
    {:date "YYYY-MM-DD"
     :decision "What was decided and why. Include the reasoning,
                not just the conclusion."}]

  :open [
    ;; Resolved questions are removed; new ones are added.
    "unresolved question that must be answered before proceeding with some aspect"]

  :outputs {
    :output-name  :conjurer-only        ;; stays as Conjurer specification
    :output-name  target-invocation     ;; produced by a target declaration below
    :output-name  handover-invocation}  ;; produced by a specialist agent

  :references ["other-file.cnj"]       ;; other .cnj files this project builds on
  :tags       [:domain :phase])
```

**The `:decisions` log** is the most important field in the charter. Decisions
that are made, understood at the time, and then lost to context are a primary
source of project entropy. Every significant design decision — choice of
language, deferral of a feature, resolution of a conflict, agreement on
a convention — belongs here with its date and rationale. The log is
append-only: past decisions are never deleted or silently revised. If a
decision is reversed, a new entry records the reversal and why.

**The `:open` list** is reviewed and updated every session. A question that
was implicitly answered but never recorded is a latent misunderstanding
waiting to surface as a bug or a conflict.

**The `:outputs` map** is the project's materialisation plan. Most domain
knowledge stays as `:conjurer-only` — the authoritative specification that
code is measured against. Specific surfaces are declared as `target` or
`handover` invocations when the project is ready to materialise them.

---

### Section 2: `asset` declarations

Assets register external capabilities — coding standards, style guides,
component libraries, domain vocabularies — that the project uses.

```clojure
(asset :standard-name
  :type        :code-standard | :style-guide | :component-library
               | :domain-vocabulary | :agent-definition
  :description "what this asset is and what it governs"
  :language    :language-keyword
  :location    "relative/path/to/standard.md"   ;; or URL
  :version     "semver"
  :enforces    ["positive constraint applied to all code using this standard"]
  :prohibits   ["anti-pattern actively avoided"]
  :applies-to  [:rest-api :spa :types ...]
  :agent       :agent-name                       ;; specialist agent for this standard
  :active-in   :project)
```

Assets appear near the top of the file so that any agent reading the file
encounters them before domain work. Their `:location` points to a file
external to the `.cnj` — the standard is maintained independently and
referenced, not embedded.

---

### Section 3: `assume`

Operative constraints: what the team and environment actually look like.

```clojure
(assume
  :environment    :production-saas | :internal-tool | :prototype | ...
  :scale          "description of expected load and growth"
  :team           {:size n :skill-level :keyword}
  :infrastructure {:existing [:technology ...] :avoid [:technology ...]}
  :constraints    {:budget :keyword :timeline "description"}
  :negotiable     [:aspect ...]
  :non-negotiable [:aspect ...])
```

---

### Section 4: `context`

The domain semantic frame that applies to all subsequent invocations.

```clojure
(context establish project-context
  :domain      :domain-keyword
  :regulations [:regulation ...]
  :entities    {:entity-name [:attribute ...] ...}
  :conventions {:convention :value ...})
```

---

### Section 5: Domain work

The intellectual body of the project: domain exploration, modelling,
semantic analysis, reasoning, classification. This section grows as the
project develops. It is the most important section — the project's
understanding of its domain expressed in Conjurer.

```clojure
;; Exploration
(def core-domain (d/explore "requirements.pdf" :depth 4))

;; Modelling
(def subscription-lifecycle
  (d/model "Subscription"
    :entities {:subscription {:type :aggregate-root
                              :lifecycle [:trial :active :paused :cancelled]}}))

;; Reasoning
(def billing-rules
  (r/rules :billing
    :rules [{:name :prorate-mid-cycle
             :if   "plan change occurs mid-billing-cycle"
             :then "charge prorated amount for remainder of cycle"
             :strength :definitive}]))

;; Classification
(def plan-taxonomy
  (t/define "Subscription Plans"
    :purpose "Classify plans to determine applicable features and pricing"
    :categories [...]))
```

---

### Section 6: `target` declarations

Implementation declarations: which outputs materialise as code, and how.

```clojure
(target :output-name
  :language  :typescript | :python | :clojure | :sql | :markdown | ...
  :framework :react | :express | :ring | :fastapi | ...
  :standard  :registered-asset-name
  :produces  [:rest-api :openapi :ddl :spa :test-suite ...]
  :scope     [:entity-or-concept ...]
  :from      domain-binding
  :via       :direct | :handover
  :agent     :agent-name)
```

Targets that stay as Conjurer specification are declared in the charter's
`:outputs` map as `:conjurer-only` and have no corresponding `target`
invocation here. A `target` invocation signals intent to produce a concrete
artefact.

---

### Section 7: `handover`

Issued when the project is ready to transfer scope to a specialist agent.
Not always present — handovers are events, not persistent declarations.

```clojure
(handover :to :agent-name
  :from     :current-session | charter-binding
  :scope    [:output-name ...]
  :include  [:charter :domain-model :target-specs :assets :decisions]
  :briefing "natural-language focus instruction for the receiving agent"
  :produces [:artefact-type ...]
  :return-to :current-session | nil
  :on-completion :merge-results | :notify | :terminal)
```

The briefing supplements — it does not replace — the structured context
included via `:include`. The receiving agent reads the charter, assets, domain
model, and target specs from the package; the briefing directs attention to
what matters most for the specific scope.

---

### A minimal `.cnj` file

The smallest useful `.cnj` file — the output of a bootstrapping session from
a natural-language description:

```clojure
;; my-project.cnj — generated from initial conversation 2025-11-05

(charter "Subscription Billing Platform"
  :version  "0.1.0"
  :created  "2025-11-05"
  :updated  "2025-11-05"
  :domain   "B2B SaaS; subscription lifecycle and automated billing"

  :goals [
    "Automate subscription renewals and expiry notifications"
    "Provide finance with real-time ARR and churn visibility"
    "Replace manual contract tracking in spreadsheets"]

  :audience {:primary :engineering-team :secondary [:finance :sales-ops]}

  :decisions []  ;; none yet

  :open [
    "Which payment provider? (Stripe vs Mollie)"
    "Retention period for cancelled subscription data?"
    "Invoice generation: in-house or via provider API?"]

  :outputs {
    :domain-model :conjurer-only}  ;; only one output declared so far

  :tags [:saas :billing :phase-1])

;; Domain work and targets will be added in subsequent sessions.
;; This file is the anchor. Everything else grows from it.
```

### Naming convention for `.cnj` files

- Use lowercase with hyphens: `subscription-billing.cnj`
- Name after the project or domain, not the session: `crm-integration.cnj`
  not `session-2025-11-05.cnj`
- Feature-level files that extend a root project use the feature name:
  `invoice-generation.cnj`, `webhook-delivery.cnj`
- Reference files (shared domain vocabulary, shared rules) use the domain
  concept: `gdpr-rules.cnj`, `pricing-taxonomy.cnj`

---

## Part III: Quality checklist

Before a grimoire or `.cnj` file is considered complete, verify:

### For grimoires

- [ ] Philosophy section answers all three required questions (why it exists,
      what principles govern it, what the names mean)
- [ ] Every construct has a signature, parameters section, design rationale,
      and at least two examples
- [ ] All example values are concrete and realistic — no `"foo"` or `"bar"`
- [ ] All example outputs are annotated with `; ✓` comments explaining
      significant behaviours
- [ ] Design rationale explains *why*, not just *what*
- [ ] Best practices section includes at least one anti-pattern
- [ ] Integration patterns section shows cross-grimoire composition
- [ ] Metadata block is complete and accurate
- [ ] Implementation notes cover all non-obvious LLM processing decisions
- [ ] Version is set and consistent with CHANGELOG

### For `.cnj` files

- [ ] `charter` is the first construct in the file
- [ ] `charter` has a dated `:decisions` log (empty is fine for new files)
- [ ] `charter` has an `:open` list (even if empty — explicit emptiness is
      better than absent)
- [ ] All registered `asset` declarations include `:location` pointing to
      the standard file
- [ ] Every `target` references an output declared in the charter's
      `:outputs` map
- [ ] Every significant design decision made in a session has been appended
      to the `:decisions` log before the session ends
- [ ] `:conjurer-only` outputs in the charter have no corresponding `target`
      invocation (deliberate — not an oversight)
- [ ] File is named after the project or domain, not the session

---

*This document governs the structure of all Conjurer artefacts. When in doubt
about how to organise a grimoire or a `.cnj` file, return here.*