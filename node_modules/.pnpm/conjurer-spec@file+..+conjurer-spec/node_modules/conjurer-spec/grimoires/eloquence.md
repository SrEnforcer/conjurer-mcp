# eloquence.md — Conjurer Eloquence Grimoire

The spellbook for language. Every other grimoire manifests artefacts —
domain models, data pipelines, web interfaces, workflows, semantic analyses.
But manifestation without articulation is incomplete. The most sophisticated
architecture becomes useless if stakeholders cannot comprehend it. The most
rigorous analysis fails if its audience cannot interpret it. The most
carefully designed system goes unappreciated if it cannot explain itself.

`eloquence` bridges manifestation and understanding. It transforms structured
knowledge into calibrated language — prose shaped to audience, purpose, and
register. Where other grimoires produce artefacts, eloquence produces
*comprehension*. Where others generate structure, eloquence generates *clarity*.

---

## Philosophy

### The rhetorical problem

Every communication is a persuasion problem. Not in the cynical sense —
not manipulation — but in the classical sense: you have knowledge the reader
does not yet have, and your task is to transfer it in a form they can receive.
What they can receive depends on who they are, what they already know, what
they care about, and what register they expect from this kind of document.

A microservices architecture document written for senior engineers is not
improved by simplification for executives. It is ruined. The executive version
is a different document — same underlying knowledge, different selection,
different framing, different register, different structure. Neither is a
degraded version of the other. Both serve their audience with integrity.

`eloquence` operationalises this insight. Every invocation specifies audience
as a first-class parameter, not an afterthought. The system adapts selection,
structure, vocabulary, and register accordingly.

### The five canons of rhetoric, manifested

Classical rhetoric identifies five canons. Eloquence operationalises each:

**Inventio (Invention)** — Discovering what to say. `e/compose` integrates
with other grimoires to access structured knowledge, then selects what is
relevant for the specific communicative purpose.

**Dispositio (Arrangement)** — Organising material. `e/narrate` structures
information using established patterns (chronological, problem/solution,
comparative, deliberative) that enhance comprehension for the specific audience
and purpose.

**Elocutio (Style)** — Choosing words. `e/compose` and `e/adapt-register`
calibrate vocabulary, sentence rhythm, hedging patterns, active/passive voice,
and technical density to audience and purpose.

**Memoria (Memory)** — Mastering content. Accumulated context and `e/refine`
enable iterative improvement while maintaining consistency across related
documents and sessions.

**Pronuntiatio (Delivery)** — Presenting effectively. Output formats (markdown,
HTML, Word, PDF) ensure appropriate presentation for each medium and context.

### The same truth, multiple tellings

A technical architecture has one truth — the actual design decisions, their
rationale, their trade-offs. But that truth requires different tellings for
different audiences. Engineers need implementation detail and failure modes.
Executives need business impact and risk posture. Compliance officers need
audit evidence and control mapping. Regulators need statutory alignment.

These are not dilutions or simplifications of each other — they are genuinely
different documents that share a common knowledge substrate. `eloquence`
enables generating all of them from that substrate while maintaining fidelity
to the underlying truth.

### What eloquence is — and what it is not

Eloquence composes **documents**: prose with an argument and an arc, addressed
to a reader who sits down and reads. A report, a proposal, a runbook, a
formalised resolution, a plain-language privacy notice — these are eloquence's
domain. The unit is the document, and the disciplines are selection, structure,
register, and flow.

This draws a deliberate boundary against two neighbours:

- **Interface microcopy belongs to `web`, not eloquence.** Button labels, empty
  states, error messages, tooltips, and helper text are *interface*, not
  documents — fragments bound to UI states and read in passing by a user trying
  to do something else. They are governed by different disciplines (brevity at
  the moment of need, blameless errors, state-binding) and live with the
  interface. `web`'s `w/copy` owns them. Eloquence does not write the text inside
  a component; it writes the document that explains the system the component
  belongs to.

- **Argument analysis belongs to `semantics`, not eloquence.** Eloquence
  *produces* calibrated prose; `semantics` *analyses* it. When the question is
  "is this argument sound?" or "compress this preserving its argument structure",
  that is `s/critique` and `s/distill`. Eloquence's own `e/critique` (below)
  reviews prose for *communication* quality — clarity, register, audience fit —
  not for logical validity, which remains semantics' concern.

Stated simply: eloquence owns the document and how it reads. It defers the
interface fragment to `web` and the logical analysis to `semantics`.

### Four compositional principles

**Audience-centric adaptation** — Information must transform for its receivers.
Technical depth that enlightens experts overwhelms novices. Conversational tone
that builds trust with end-users undermines authority in legal contexts.

**Rhetorical intentionality** — Every document serves purposes beyond
information transfer. Making intent explicit enables purposeful language
shaping.

**Narrative architecture** — Humans comprehend through story structures. Raw
information overwhelms; narrative scaffolding enables understanding.

**Stylistic precision** — Tone, voice, register, diction, rhythm — these are
functional, not decorative. The grimoire treats style as a parameter.

---

## Naming rationale

**`e/`** — Short namespace alias.

**Eloquence** — From Latin *eloquentia*, derived from *eloqui* "to speak out."
Eloquence combines wisdom with verbal mastery to inform, persuade, and move
audiences. Not mere fluency — purposeful, calibrated expression.

**Compose** — To bring elements together into a unified, intentional whole.
The primary act of the grimoire.

**Narrate** — To structure events or information into a story that unfolds
for the reader rather than confronting them all at once.

**Adapt-register** — To shift a document's register — its vocabulary, formality,
and technical density — for a new audience, while holding its content fixed.
Adaptation transforms an existing telling; composition writes a new one.

**Critique** — From Greek *kritikē*, "the art of judging." To critique a
document is to judge how well it communicates for its reader — and, paired with
`:suggest`, to say what would make it better. The editorial counterpart to
composition.

**Instruct** — To write for *doing*: prose whose success is whether the reader
completes the task, not whether it reads well.

**Formalize** — To transform informal or ambiguous language into precise,
auditable prose suitable for legal or regulatory contexts.

**Simplify** — The inverse of formalise: to reduce complexity for accessibility
while preserving every obligation, right, and warning. Simple for its audience,
never simplistic.

**Localize** — To adapt a document for a locale — its examples, units, dates,
conventions, and references — not merely to translate its words. A localised
document reads as native, not as a foreign document in local vocabulary.

---

## Part I: Core compositional functions

---

### `e/compose`

The primary function: generates calibrated prose from structured knowledge,
specified audience, purpose, and rhetorical constraints.

#### Signature

```clojure
(e/compose subject
  :from          knowledge-source
  :audience      :audience-keyword | audience-definition
  :purpose       :inform | :persuade | :instruct | :report | :propose | :warn
  :tone          :formal | :professional | :conversational | :plain | :urgent
  :length        :brief | :standard | :comprehensive | :custom-word-count
  :structure     :narrative | :argumentative | :analytical | :procedural | :comparative
  :emphasise     [:aspect ...]
  :omit          [:aspect ...]
  :format        :markdown | :html | :plain-text
  :output        :document
  :manifest      document-binding)
```

#### Parameters

**`:audience`** — Who will read this. Built-in profiles:
`:engineer`, `:senior-engineer`, `:executive`, `:product-manager`,
`:legal-counsel`, `:compliance-officer`, `:regulator`, `:customer-support`,
`:end-user`, `:general-public`, `:board`

Custom audience definition:
```clojure
{:expertise    :domain-expert
 :technical    :low
 :cares-about  [:cost :risk :timeline]
 :register     :formal
 :language     :nl}
```

**`:purpose`** — The primary communicative goal. Determines what kinds of
rhetorical moves are appropriate: persuasive documents deploy credibility
signals and evidence; instructional documents prioritise sequence and clarity;
warning documents lead with risk and consequence.

**`:from`** — Knowledge source. Can be a domain model, a data analysis result,
a semantic analysis, a workflow specification, or free-form structured data.
The system selects from it what is relevant to the audience and purpose.

**`:emphasise`** / **`:omit`** — Fine-grained control over what aspects of the
source knowledge are foregrounded or suppressed.

#### Design rationale

`e/compose` is the flagship because it embodies the grimoire's central claim:
that audience is not a finishing touch applied to a finished document but the
*generative constraint* that determines what the document is. The construct
makes `:audience` a first-class, mandatory parameter precisely so that
composition cannot proceed without answering the only question that governs
every other decision — who reads this? Everything downstream (what to select,
how to structure, which register, what length) is derived from that answer.

The decisive design commitment is that **the audience versions are peers, not
a canonical document and its dilutions**. A weaker tool would generate "the
document" and then offer to simplify it; `e/compose` generates the executive
version and the engineer version as equally first-class artefacts drawn from
one knowledge substrate, because neither is a degraded form of the other. This
is why `:from` takes a *knowledge source* rather than a draft: composition
selects from structured knowledge per audience, it does not summarise a
pre-written master. The executive document omits implementation detail not
because it is dumbed down but because implementation detail does not serve the
decision an executive is making.

`:emphasise` and `:omit` exist because a knowledge source almost always
contains more than any single document should say. The editorial act —
deciding what this audience needs foregrounded and what it does not need at all
— is the heart of composition, and the construct makes it explicit rather than
leaving the system to guess at relevance. A document that includes everything
in the source has not been composed; it has been transcribed.

#### Example 1: Architecture document for three audiences

```clojure
(def architecture (d/explore "system-architecture.pdf" :depth 3))

;; For engineers: technical detail, failure modes, implementation guidance
(e/compose "Microservices Architecture"
  :from      architecture
  :audience  :senior-engineer
  :purpose   :inform
  :tone      :professional
  :structure :analytical
  :emphasise [:implementation-patterns :failure-modes :operational-requirements]
  :format    :markdown)

;; For executives: business impact, risk, strategic rationale
(e/compose "Platform Architecture Overview"
  :from      architecture
  :audience  :executive
  :purpose   :inform
  :tone      :professional
  :structure :narrative
  :emphasise [:business-capabilities :risk-posture :scalability]
  :omit      [:implementation-detail :specific-technologies]
  :length    :brief
  :format    :markdown)

;; For compliance: audit evidence, control mapping, security posture
(e/compose "Architecture Security and Compliance Evidence"
  :from      architecture
  :audience  :compliance-officer
  :purpose   :report
  :tone      :formal
  :structure :analytical
  :emphasise [:security-controls :audit-trail :regulatory-alignment :data-handling]
  :format    :markdown)
```

#### Example 2: Data analysis communicated to stakeholders

```clojure
(def analysis-results (data/profile customer-dataset :statistics :all))

(e/compose "Customer Behaviour Analysis — Q4 2025"
  :from      analysis-results
  :audience  :product-manager
  :purpose   :inform
  :tone      :professional
  :length    :standard
  :emphasise [:segment-shifts :anomalies :actionable-findings]
  :omit      [:statistical-methodology :raw-distributions]
  :format    :markdown)

;; Generated document:
;; - Opens with executive summary of key findings
;; - Presents segment distribution in plain language ("28% of customers
;;   are now in the premium tier, up from 22% last quarter")
;; - Flags anomalies as insights ("The pending account status has doubled
;;   in the past 30 days, suggesting an onboarding friction point")
;; - Closes with explicit recommendations
;; - No mention of z-scores, statistical methodology, or raw percentages
;; ✓ The same data/profile result could feed a document for a data scientist
;;   that foregrounds exactly what is omitted here (methodology, distributions).
;;   :omit is not hiding detail the PM couldn't handle — it is removing detail
;;   that does not serve the decision a PM is making. The audience determines
;;   relevance, and relevance determines selection.
```

---

### `e/narrate`

Structures information using an established narrative pattern — mapping content
onto a story arc that guides the reader from orientation through understanding
to conclusion.

#### Signature

```clojure
(e/narrate subject
  :from     knowledge-source
  :pattern  :problem-solution | :situation-complication-resolution
            | :comparison-contrast | :chronological | :cause-effect
            | :deliberative | :hero-transformation
  :audience :audience-keyword
  :arc      {:setup "..." :tension "..." :resolution "..."}
  :format   :markdown | :prose
  :output   :document
  :manifest narrative-binding)
```

#### Parameters

**`:pattern`** — The narrative structure:
- `:problem-solution` — establishes a problem, presents a solution, demonstrates
  resolution. Classic for proposals and design documents.
- `:situation-complication-resolution` — starts with stable situation, introduces
  a complication that disrupts it, resolves the disruption. Excellent for
  incident reports and change proposals.
- `:chronological` — follows temporal sequence. Natural for migration narratives,
  product history, and process documentation.
- `:deliberative` — presents a question, explores competing options, argues for
  a recommendation. Ideal for decision documents and ADRs.
- `:comparison-contrast` — establishes criteria, compares options against them,
  draws conclusion. Useful for technology evaluations and trade-off analyses.

**`:arc`** — Optional explicit guidance for the narrative arc when the system
needs more direction about how to tell this particular story.

#### Design rationale

`e/narrate` exists because humans do not comprehend lists of facts; they
comprehend stories. The same information that overwhelms as a flat enumeration
becomes graspable when arranged so that each part prepares the reader for the
next — a problem felt before its solution is offered, a situation established
before its complication disrupts it. Narrative is not decoration applied to
information; it is the scaffolding that lets information be understood and
retained. `e/narrate` makes that scaffolding a deliberate, named choice.

The construct separates from `e/compose` because *arrangement* (the second
classical canon, dispositio) is a distinct act from *selection and styling*.
`e/compose` decides what to say and in what register; `e/narrate` decides the
*shape of the telling* — and the same content can be narrated several ways, each
serving a different comprehension goal. The `:pattern` choices are not
interchangeable: a decision document wants `:deliberative` (question → options →
recommendation) because the reader must follow the reasoning to trust the
conclusion; an incident report wants `:situation-complication-resolution`
because the reader needs to feel the stability that was lost before they can
judge the fix. Matching pattern to purpose is the construct's core discipline,
which is why the patterns are enumerated and described rather than left implicit.

#### Example: Migration narrative

```clojure
(e/narrate "Database Migration to PostgreSQL 16"
  :from    {:migration-log migration-record :profile-comparison pre-post-profiles}
  :pattern :situation-complication-resolution
  :audience :engineering-team
  :arc     {:setup      "Legacy PostgreSQL 12 had served reliably for 4 years"
            :tension    "Approaching end-of-life with security implications"
            :resolution "Successful upgrade with performance improvements"}
  :format  :markdown)

;; Generated narrative:
;; "Our PostgreSQL 12 deployment, in production since 2021, had been
;; reliable — until its extended support window began to close.
;; 
;; With security patches no longer guaranteed after November 2025, and
;; our PCI DSS certification requiring supported database versions, we
;; had a defined window to act.
;; 
;; The migration to PostgreSQL 16 completed on [date]. Query planning
;; improvements in PG16 delivered an immediate 18% reduction in p95
;; query latency. The migration itself ran without customer impact..."
```

---

### `e/adapt-register`

Transforms existing content into a different register, audience, or level of
formality while preserving the underlying information and intent.

#### Signature

```clojure
(e/adapt-register source-content
  :from    :current-register-or-audience
  :to      :target-register-or-audience
  :preserve [:intent :factual-content :structure | :all]
  :language :en | :nl | :de | :fr | ...
  :output  :adapted-document
  :manifest adapted-binding)
```

#### Parameters

**`:from`** / **`:to`** — The source and target register or audience. Naming both
ends is what lets the construct calculate the transformation: technical-engineer
→ end-user is a different shift than legal-counsel → executive, and the
construct adapts vocabulary, formality, and technical density along the specific
gap between the two.

**`:preserve`** — What must survive the adaptation unchanged: `:intent` (the
document's purpose), `:factual-content` (every specific claim), `:structure`
(the arrangement), or `:all`. This is the line between adaptation and rewriting:
register shifts freely, but preserved elements are fixed points the
transformation may not move.

**`:language`** — The target language. Adaptation and translation can occur
together, but note that genuine cross-cultural adaptation (not just register) is
`e/localize`'s remit; `:language` here handles the linguistic surface while the
register transformation does the substantive work.

#### Design rationale

The same document must sometimes speak to multiple audiences. A technical
specification written for engineers must sometimes be adapted for a board
presentation. A legal contract must sometimes be explained in plain language
for the signatory. An internal incident report must sometimes be communicated
to customers.

`e/adapt-register` handles this without requiring a full `e/compose` from
scratch — it transforms existing content rather than generating from source
knowledge, preserving the document's structure and specific claims while
adapting vocabulary, tone, and technical density.

#### Example: Technical to plain language

```clojure
(e/adapt-register api-documentation
  :from     :technical-engineer
  :to       :end-user-non-technical
  :preserve [:intent :factual-content]
  :manifest user-facing-auth-doc)

;; Before (technical):
;; "Authenticate using OAuth 2.0 Bearer tokens. Include the Authorization
;;  header with the format 'Bearer {access_token}' in all API requests."

;; After (plain language):
;; "To use the service, you'll need an access code (we call it a token).
;;  You receive this code when you sign in. Include it with every request you
;;  make — your account administrator can help you set this up the first time."
;; ✓ :preserve [:intent :factual-content] holds the facts fixed (a token is
;;   still required, still per-request) while register, vocabulary, and
;;   technical density all shift. This is adaptation, not composition: the
;;   construct transforms an existing document rather than regenerating from a
;;   knowledge source, so the structure and specific claims survive intact.
```

---

### `e/critique`

Reviews existing prose for communication quality — clarity, register fit,
audience appropriateness, structure, and flow — and returns specific,
actionable findings. Where `e/compose` and `e/adapt-register` *produce* prose,
`e/critique` *evaluates* it. The editorial counterpart to the grimoire's
generative functions.

#### Signature

```clojure
(e/critique source-content
  :for          :audience-keyword | audience-definition
  :against      [:clarity :register-fit :audience-fit :structure :concision
                 :consistency :flow :jargon]
  :purpose      :inform | :persuade | :instruct | :report | :propose
  :severity     :all | :significant-only
  :suggest      boolean          ;; include concrete rewrites, not just findings
  :output       :critique-report
  :manifest     critique-binding)
```

#### Parameters

**`:for`** — The intended audience the prose is judged *against*. A critique is
meaningless without it: text that is admirably clear for an engineer may be
opaque for an executive, and the same document is well- or ill-judged only
relative to who must read it. The audience is the standard.

**`:against`** — The dimensions to evaluate:
- `:clarity` — is each sentence unambiguous; are referents resolved
- `:register-fit` — does the tone match the context (no jokes in a legal notice,
  no stiffness in a welcome email)
- `:audience-fit` — is the technical level, vocabulary, and assumed knowledge
  right for the reader
- `:structure` — does the arrangement serve comprehension; is the most important
  thing findable
- `:concision` — is anything padded, repeated, or saying in twenty words what
  ten would carry
- `:jargon` — unexplained terms the audience will not know
- `:consistency` — does terminology and voice hold steady throughout
- `:flow` — does each paragraph prepare the next, or does the reader lurch

**`:suggest`** — When true, each finding is paired with a concrete rewrite, not
just a diagnosis. "This sentence is unclear" is less useful than the clearer
sentence; with `:suggest true`, the critique does the harder half.

#### Design rationale

`e/critique` fills the gap between eloquence's generative functions and the real
workflow of writing, which is overwhelmingly *revision*. Most prose a
practitioner needs to improve already exists — a colleague's draft, a previous
version, a first attempt — and the useful act is not regenerating it from a
knowledge source (which discards the author's work and judgement) but reviewing
it and saying precisely what to change. Without `e/critique`, the only way to
improve a draft through the grimoire was to throw it away and `e/compose` anew.
The construct makes targeted revision first-class.

The boundary with `semantics` is deliberate and load-bearing. `s/critique`
evaluates an *argument* — is it valid, is the evidence sufficient, are there
fallacies? `e/critique` evaluates the *writing* — is it clear, well-pitched for
its reader, well-structured, free of jargon? An argument can be logically
impeccable and abominably written; a passage can be beautifully clear and
logically empty. The two critiques answer different questions, and keeping them
in separate grimoires keeps each honest about its remit. When a document needs
both — sound reasoning *and* clear communication — the two compose, as the usage
patterns show.

The discipline the construct enforces is that **critique is relative to
audience and purpose, never absolute**. There is no such thing as well-written
prose in the abstract; there is only prose well-judged for a reader and a goal.
By requiring `:for` and offering `:purpose`, the construct refuses to issue
context-free verdicts and instead measures the prose against the job it actually
has to do.

#### Example: Reviewing a draft before it goes to an executive

```clojure
(e/critique draft-board-memo
  :for      :executive
  :against  [:clarity :audience-fit :concision :jargon :structure]
  :purpose  :propose
  :suggest  true
  :manifest memo-critique)

;; Returns:
{:overall "Sound content, mispitched for the audience. The proposal is buried
           under implementation detail an executive reader will not act on, and
           the recommendation does not appear until the final paragraph."
 :findings [
   {:dimension :structure
    :severity  :significant
    :finding   "The recommendation is the last sentence; an executive memo should
                open with it so the reader knows the ask before the rationale."
    :suggestion "Move the closing recommendation to a one-line summary at the top,
                 then let the body support it."}
   {:dimension :jargon
    :severity  :significant
    :finding   "‘idempotent retry semantics’, ‘p95 latency’, and ‘blue-green
                deploy’ appear unexplained — outside this reader's vocabulary."
    :suggestion "Replace with the business consequence: ‘the change is safe to
                 retry’, ‘speed for the slowest 5% of users’, ‘zero-downtime release’."}
   {:dimension :concision
    :severity  :minor
    :finding   "Paragraph 3 restates the cost figures already given in paragraph 1."}]
 :strengths ["The risk section is clear and appropriately frank"
             "Cost figures are specific and sourced"]}
;; ✓ The critique judges the prose against :executive — the jargon findings are
;;   not ‘this is wrong’ but ‘this reader won't know these terms’. The same memo
;;   critiqued :for :senior-engineer would flag none of them. Audience is the standard.
;; ✓ :suggest true means each finding carries the fix, not just the diagnosis —
;;   the construct does the harder half of revision, not only the easy half.
;; ✓ :strengths are reported too: a critique that lists only faults gives the
;;   author no way to tell what to preserve while they revise.
```

#### Usage patterns

```clojure
;; The full review: is the argument sound (semantics) AND well-written (eloquence)?
(~> draft-proposal
  (s/critique :dimensions [:logical-consistency :evidential-support])  ;; is it sound?
  (e/critique :for :executive :against [:clarity :structure :jargon]   ;; is it clear?
              :suggest true))

;; Critique, then act on the findings by adapting rather than rewriting
(~> colleague-draft
  (e/critique :for :general-public :against [:jargon :clarity :register-fit])
  (e/adapt-register :to :general-public :preserve [:intent :factual-content]))
```

---

### `e/instruct`

Generates procedural instructional content — step-by-step guides, tutorials,
runbooks, and how-to documentation — structured for maximum clarity and
successful task completion.

#### Signature

```clojure
(e/instruct task
  :for           :audience-keyword
  :assumes       [:prerequisite-knowledge ...]
  :outcome       "what the reader will be able to do after reading"
  :format        :tutorial | :how-to | :runbook | :reference
  :include       [:prerequisites :steps :validation :troubleshooting :examples]
  :code-examples boolean
  :language      :nl | :en | ...
  :output        :instructional-document
  :manifest      instructions-binding)
```

#### Parameters

**`:format`** — The instructional genre:
- `:tutorial` — learning-oriented; teaches concepts through doing; reader
  has not done this before
- `:how-to` — task-oriented; achieves a specific goal; reader has relevant
  background
- `:runbook` — operations-oriented; emergency procedures, operational steps;
  clarity over elegance
- `:reference` — information-oriented; lookup document; completeness over
  readability

#### Design rationale

`e/instruct` is the construct for prose whose success is *measurable*: the
reader either completes the task or does not. This makes instructional writing
a distinct discipline from the expository composition `e/compose` produces — its
quality is judged not by how well it reads but by whether it works. The
construct's design follows from that difference.

The `:format` distinction encodes a well-established taxonomy (the four modes of
technical documentation) because the genres are genuinely different and
conflating them is the most common instructional failure. A tutorial that reads
like a reference manual teaches nothing; a runbook written like a tutorial gets
someone hurt during an incident. A tutorial is *learning*-oriented (the reader
has never done this and needs concepts taught through doing); a how-to is
*task*-oriented (the reader has the background and needs the goal achieved); a
runbook is *operations*-oriented (clarity and exactness over elegance, because
it is read under pressure); a reference is *information*-oriented (completeness
over readability, because it is consulted, not read). Naming the format selects
the whole discipline, not just a layout.

`:assumes` and `:outcome` are first-class because instructional writing fails at
its boundaries. State the prerequisites wrong and the reader is stranded at step
one; leave the outcome implicit and the reader cannot tell whether they
succeeded. By making the assumed starting knowledge and the promised ending
capability explicit, the construct forces the writer to define the gap the
instructions must bridge — which is the gap the reader actually traverses.

#### Example: Onboarding runbook

```clojure
(e/instruct "New Developer Environment Setup"
  :for       :new-engineer
  :assumes   [:basic-terminal :git-installed]
  :outcome   "Running the full development stack locally within 30 minutes"
  :format    :how-to
  :include   [:prerequisites :steps :validation :troubleshooting]
  :code-examples true
  :language  :en
  :manifest  onboarding-runbook)

;; Generated document:
;; ## Prerequisites
;; - Git ≥ 2.34 (check: `git --version`)
;; - Docker Desktop running
;; - Access to the company GitHub organisation (request from IT)
;;
;; ## Steps
;; **1. Clone the repository**
;; ```bash
;; git clone git@github.com:company/platform.git
;; cd platform
;; ```
;;
;; **2. Configure your environment**
;; Copy `.env.example` to `.env`:
;; ```bash
;; cp .env.example .env
;; ```
;; Fill in the values marked `CHANGE_ME` — your tech lead can share these.
;;
;; **Validate**: After this step, run `./scripts/validate-env.sh`.
;; You should see: `✓ Environment configuration valid`
;;
;; **Troubleshooting**: If validation fails with "Missing DATABASE_URL",
;; ensure you've replaced the placeholder with the development database URL
;; from the team's password manager.
```

---

### `e/formalize`

Transforms informal, conversational, or imprecise content into formal, precise,
auditable prose suitable for legal, regulatory, or contractual contexts.

#### Signature

```clojure
(e/formalize source-content
  :level        :standard | :legal | :regulatory | :contractual
  :preserve     :intent-strictly | :allow-clarifying-expansions
  :disambiguate [:pronouns :vague-references :implicit-agents]
  :number-claims boolean
  :definitions  :auto-generate | :existing-glossary | :none
  :citations    :auto-source | :existing-citations | :flag-unsourced
  :output       :formal-document
  :manifest     formal-binding)
```

#### Parameters

**`:disambiguate`** — What to make explicit that informal language leaves vague:
- `:pronouns` — replace "they" with the specific entity
- `:vague-references` — replace "this" and "the document" with specific references
- `:implicit-agents` — make passive constructions explicit ("it was decided" →
  "the Management Board decided")

**`:number-claims`** — Number every assertoric claim in the document, enabling
precise reference in legal correspondence ("with respect to claim 3.2...").

#### Design rationale

`e/formalize` exists because the language of decisions and the language of
records are different languages. A decision is made conversationally — "the data
team will own this, and they need a DPA by end of Q1" — and that phrasing is
perfectly clear in the room and dangerously vague on paper. Who is "the data
team" exactly? Does "need" mean obliged or merely advised? When is "end of Q1"?
Conversational ambiguity is harmless among people who share context and harmful
the moment the words must stand alone in a contract, a resolution, or a
regulatory submission. The construct's job is to close that gap without changing
what was decided.

The defining discipline is that **formalisation adds precision, never
substance**. `:preserve :intent-strictly` is the guardrail: the formalised
output may resolve a pronoun, fix a date, or define a term, but it may not
introduce an obligation the source did not contain or soften one it did. This is
why `:disambiguate` enumerates *specific* vagueness to resolve (pronouns,
implicit agents, vague references) rather than granting licence to rewrite — the
construct makes the implicit explicit, and stops there. `:number-claims` serves
the same auditable-record goal: numbered claims can be referenced exactly in
later correspondence, which conversational prose cannot.

The `:level` gradient (standard → legal → regulatory → contractual) exists
because the precision a record needs scales with its consequences. An internal
memo wants clarity; a regulatory submission wants every agent named, every
obligation marked with "shall" or "may", every date absolute. Naming the level
sets how far toward strict precision the formalisation should push.

#### Example: Formalising a meeting decision

```clojure
(e/formalize "We decided the data team will own the GDPR compliance work
              going forward, and they need to have a DPA in place by end of Q1"
  :level        :legal
  :preserve     :intent-strictly
  :disambiguate [:pronouns :implicit-agents]
  :number-claims true
  :manifest     formalised-decision)

;; Returns:
;; 1. The Data Management Team assumes ownership of the organisation's GDPR
;;    compliance programme with effect from [date of decision].
;; 2. The Data Management Team shall establish a Data Processing Agreement
;;    compliant with Article 28 of Regulation (EU) 2016/679 no later than
;;    31 March [year].
;; 3. For the purposes of this decision, "GDPR compliance programme" encompasses
;;    all obligations arising from Regulation (EU) 2016/679 and its national
;;    implementation instruments as applicable to the organisation's data
;;    processing activities.
;; ✓ Every vague element of the informal source is resolved: "they" becomes the
;;   named Team (:pronouns), "need to" becomes "shall" (obligation), "end of Q1"
;;   becomes an absolute date, and "GDPR compliance work" gets a numbered
;;   definition. :number-claims makes each obligation citable in later
;;   correspondence ("with respect to claim 2..."). The intent is preserved
;;   strictly — nothing was added or softened, only made precise.
```

---

### `e/simplify`

Transforms technically dense, formal, or complex content into plain language —
accessible without being condescending, precise without being technical.

#### Signature

```clojure
(e/simplify source-content
  :target-level  :primary | :secondary | :general-adult | :professional-non-specialist
  :preserve      [:key-obligations :legal-force :warnings]
  :language      :nl | :en | ...
  :standard      :plain-language-nl | :plain-language-uk | :clear-writing
  :output        :simplified-document
  :manifest      simplified-binding)
```

#### Parameters

**`:target-level`** — The reading level to write for: `:primary`, `:secondary`,
`:general-adult`, or `:professional-non-specialist`. The level sets concrete
targets for sentence length, vocabulary, and assumed knowledge — "simple" is
meaningless without saying simple *for whom*.

**`:preserve`** — The elements that must survive simplification intact:
`:key-obligations`, `:legal-force`, `:warnings`, `:rights-information`. This is
the guardrail against dilution. Simplification changes how content is expressed;
preserved elements fix what must remain true and present regardless of how the
prose is rewritten.

**`:standard`** — A recognised plain-language standard to conform to
(`:plain-language-nl`, `:plain-language-uk`, `:clear-writing`). Standards encode
measurable criteria, so the result can be checked against an external benchmark
rather than the writer's intuition about what reads simply.

#### Design rationale

`e/simplify` and `e/formalize` are deliberate inverses, and the pairing reveals
what each is for. Formalisation removes ambiguity by *adding* precision —
named agents, defined terms, absolute dates — at the cost of accessibility.
Simplification removes barriers by *reducing* complexity — shorter sentences,
active voice, concrete examples — at the cost of nothing that matters, if done
well. The construct exists because the same legal or technical content often
must exist in both forms: the auditable version for the record, and the
comprehensible version for the people the record affects.

The defining discipline is that **simplification is not dilution**. The
`:preserve` parameter is what separates `e/simplify` from "dumbing down": a
simplified privacy notice must retain every legal obligation, every right, every
warning — it changes how the content is *said*, never what is *true*. Plain
language is appropriately simple for its audience, not simplistic; a notice that
drops a legal right to read more smoothly has not been simplified, it has been
falsified. By making the preserved elements explicit, the construct holds the
line between accessibility and loss.

`:target-level` and `:standard` exist because "plain" is relative to a reader.
Plain language for a general adult audience differs from plain language for a
professional non-specialist, and recognised plain-language standards encode
measurable targets (sentence length, voice, vocabulary) rather than leaving
"simple" to taste. Naming the level and standard makes the simplification
checkable against an external benchmark, not just the writer's intuition.

#### Example: A regulatory privacy notice for the public

```clojure
(e/simplify privacy-notice-legal-version
  :target-level :general-adult
  :preserve     [:key-obligations :legal-force :rights-information]
  :standard     :clear-writing
  :manifest     plain-privacy-notice)

;; Transforms a complex legal notice into accessible plain language:
;; - Average sentence length reduced from 38 to 17 words
;; - Passive voice constructions replaced with active
;; - Legal jargon explained in parentheses on first use
;; - Rights section reformatted as a clear list
;; - Maintains all legally required content
;; - Readability level: suitable for readers at secondary-school level
;; ✓ :preserve [:rights-information :legal-force] is the guardrail: every right
;;   and every legal obligation survives the rewrite intact. The notice reads at
;;   a secondary-school level but a court would still find it complete. That is
;;   the line between simplification (how it is said) and dilution (what is true).
```

---

### `e/localize`

Adapts content for a specific locale — not just translation but genuine cultural
and contextual adaptation.

#### Signature

```clojure
(e/localize source-content
  :for           :locale-code
  :adapt         [:cultural-references :examples :units :date-formats
                  :formality-conventions :legal-references]
  :preserve      [:intent :factual-content :brand-voice]
  :glossary      {:term "locale-appropriate-term" ...}
  :output        :localised-document
  :manifest      localised-binding)
```

#### Parameters

**`:for`** — The target locale. Determines every adaptation downstream: which
cultural references land, which conventions apply, which regulations are the
relevant authority.

**`:adapt`** — Which dimensions to localise beyond the words themselves:
`:cultural-references` (swap examples that assume local knowledge),
`:examples` (use locally-plausible instances), `:units`, `:date-formats`,
`:formality-conventions` (match the locale's professional register), and
`:legal-references` (cite the locale's law, not the source's). Listing the
dimensions makes localisation a deliberate scope, not a vague "make it local".

**`:preserve`** — What must not change across the adaptation: `:intent`,
`:factual-content`, and `:brand-voice`. A localised document reads as native,
but it must remain the same document — same purpose, same facts, same voice —
not a different message that happens to share a topic.

**`:glossary`** — Locale-appropriate term mappings the localisation must honour
(`{"zip code" "postcode"}`), pinning specific renderings where the default
adaptation might choose otherwise.

#### Design rationale

Translation is a subset of localisation. A document localised for a Dutch
audience does not merely translate English to Dutch — it adapts examples from
American contexts to Dutch contexts (replacing "zip code" with "postcode",
replacing US-centric examples with European ones), adjusts formality conventions
(Dutch professional communication is less formal than German but more formal
than American), references appropriate local regulations rather than US law,
and uses date and number formats that Dutch readers expect.

`e/localize` handles the full scope of this adaptation, not just lexical
translation.

#### Example: Localising an onboarding guide for a Dutch audience

```clojure
(e/localize onboarding-guide-en
  :for      :nl
  :adapt    [:cultural-references :examples :units :date-formats
             :formality-conventions :legal-references]
  :preserve [:intent :factual-content :brand-voice]
  :glossary {"zip code" "postcode" "SSN" "BSN"}
  :manifest onboarding-guide-nl)

;; The localised guide is not a translation of the English one:
;; ✓ "Enter your zip code (e.g. 90210)" → "Vul uw postcode in (bijv. 1011 AB)"
;;   — both the term and the example format are adapted, not just translated
;; ✓ "12/31/2025" → "31-12-2025" — Dutch date convention, not US
;; ✓ A US-law data-handling reference is replaced with the AVG (the Dutch GDPR
;;   implementation), which signals the correct authority to a Dutch reader
;; ✓ Register shifts to Dutch professional norms — less formal than a German
;;   equivalent, more formal than an American one — while brand voice is preserved
;; ✓ The intent and every factual claim are unchanged; only their cultural
;;   carrier is adapted. Translation would have produced Dutch words in an
;;   American document; localisation produces a Dutch document.
```

---

## Part II: Integrated patterns

---

### Multi-audience document generation

The canonical pattern: one knowledge source, multiple audiences, each receiving
a document crafted for them.

```clojure
(def architecture-model (d/explore "architecture.pdf" :depth 4))

(parallel multi-audience-docs
  :operations [
    (e/compose "Technical Architecture" :from architecture-model :audience :senior-engineer)
    (e/compose "Platform Overview"       :from architecture-model :audience :executive)
    (e/compose "Security Evidence Pack"  :from architecture-model :audience :compliance-officer)]
  :combine-results :array)
```

### Analysis to communication pipeline

```clojure
(~> risk-assessment-data
  (s/texan      :models [:risk :ethics :stakeholder])
  (s/distill    :preserve [:argument-structure :key-claims] :for :executive)
  (e/compose "Risk Assessment Summary"
    :audience  :executive
    :purpose   :inform
    :structure :deliberative
    :emphasise [:key-risks :mitigation-options :recommendations]))
```

### Progressive formalisation

```clojure
;; Start informal, progressively formalise for different contexts
(def draft "We think we need to improve our data retention because GDPR
            requires it and we're not compliant right now")

(e/formalize draft :level :standard)    ;; Professional internal memo
(e/formalize draft :level :legal)       ;; Board resolution language
(e/formalize draft :level :regulatory)  ;; Submission to supervisory authority
```

---

## Best practices

### Specify audience before specifying content

Audience determines everything: what to include, what to omit, what vocabulary
to use, what register to adopt, how long to be. Before making any other decision
about a document, know who it is for.

### Use `:emphasise` and `:omit` deliberately

The `:from` parameter provides a knowledge source that may contain far more
than any single document should say. `:emphasise` and `:omit` are your
editorial tools. An executive summary should omit implementation detail.
A compliance evidence pack should omit business justification. Be explicit
about what each document needs and what it does not.

### Match format to purpose

- `:narrative` structure for documents that need to be understood in sequence
  (migration reports, change proposals, incident post-mortems)
- `:analytical` structure for documents where readers may jump to sections
  of interest (architecture documents, technical specifications)
- `:procedural` structure for instructional content where order matters
- `:deliberative` structure for decision documents where the reader needs
  to follow the reasoning

### Formalise before distributing legally

Any content that will form part of a contract, regulatory submission, or board
decision should pass through `e/formalize`. Informal language contains ambiguity
that is harmless in conversation and harmful in legal contexts.

### Localize thoughtfully, not mechanically

Localisation is not translation. Use `e/localize` for content that will be
read by audiences in different cultural contexts, not just different languages.
A document prepared for a Dutch municipal audience requires different examples,
different reference points, and different formality conventions than the same
document prepared for an American audience — even if both versions are in
English.

### Anti-patterns

**Writing the document, then bolting on the audience.** Composing a single
"neutral" document and simplifying it per audience treats the audience as a
finishing step rather than the generative constraint it is. The result is an
executive version that still reads like an engineering document with the hard
parts removed. Specify `:audience` first and let it govern selection and
structure from the start — the executive document and the engineer document are
peers drawn from one knowledge source, not an original and its dilution.

**Regenerating when you should revise.** Throwing away a colleague's draft to
`e/compose` a fresh one discards their work and judgement, and often their
domain knowledge with it. When prose already exists and needs improvement, use
`e/critique` to say precisely what to change, or `e/adapt-register` to transform
it — revision preserves what is good; regeneration gambles it.

**Simplifying into falsehood.** Dropping a legal right, a warning, or an
obligation to make a notice "read more smoothly" is not simplification — it is
falsification with better grammar. Always set `:preserve` on `e/simplify` and
hold the line: plain language changes how content is *said*, never what is *true*.

**Writing interface copy as if it were a document.** A button label, an error
message, an empty state — these are not small documents and do not want
eloquence's compositional disciplines. They want brevity at the moment of need
and state-binding. That is `web`'s `w/copy`, not eloquence. Reaching for
`e/compose` to write the text inside a UI component is using the wrong grimoire.

**Critiquing prose without naming the audience.** A critique that judges writing
in the abstract — "this is unclear", "too informal" — is unfounded, because
clarity and register are only ever relative to a reader. Always set `:for` on
`e/critique`; the same passage is well- or ill-judged only against the audience
it must reach.

---

## Integration patterns

### Eloquence as the communication layer

`eloquence` typically operates as the final stage of a pipeline — taking
structured outputs from other grimoires and preparing them for human consumption.

```clojure
(~> requirements-document
  (d/explore    :depth 3)
  (s/texan      :models [:argumentation :stakeholder])
  (data/profile domain-data :statistics :all)
  (e/compose "Domain Analysis Report"
    :from    {:domain-model domain-model :semantic-analysis analysis :data-profile profile}
    :audience :product-manager
    :purpose  :inform
    :length   :standard))
```

### Witness reports as communication source

`core`'s `witness` construct produces interpretive records that `eloquence`
can transform into readable decision documentation.

```clojure
(def decisions (witness architecture-decisions :observe [:all] :record-to log))

(e/compose "Architecture Decision Record"
  :from      decisions
  :audience  :engineering-team
  :purpose   :report
  :structure :deliberative
  :format    :markdown)
```

### The document/interface boundary with `web`

Eloquence and `web`'s `w/copy` are complementary, not overlapping. When a
product needs both its interface text and its documentation, each grimoire owns
its half: `w/copy` writes the fragments inside the UI; `eloquence` writes the
documents around it.

```clojure
;; The interface's own words — w/copy's domain
(w/copy customer-portal
  :surfaces [:empty-states :error-messages :buttons]
  :voice {:tone :plain :person :second})

;; The guide that explains the portal — eloquence's domain
(e/instruct "Using the Customer Portal"
  :for :end-user :format :how-to
  :include [:steps :validation :troubleshooting])
;; The two never write the same text: w/copy writes the empty-state message
;; the user sees in the app; e/instruct writes the how-to they open in a help centre.
```

### Sound and clear: composing `s/critique` with `e/critique`

A document that must persuade needs both a valid argument and clear prose. The
two critiques answer different questions and compose into a complete review.

```clojure
(~> draft-proposal
  (s/critique :dimensions [:logical-consistency :evidential-support])  ;; is it sound?
  (e/critique :for :executive :against [:clarity :structure :jargon]   ;; is it clear?
              :suggest true))
;; s/critique guards the reasoning; e/critique guards the communication.
;; Neither subsumes the other — an impeccable argument can be unreadable, and
;; flawless prose can be empty.
```

---

## Grimoire metadata

```clojure
{:grimoire    "eloquence"
 :namespace   "e/"
 :version     "2.1.0"
 :description "Audience-aware document composition, register adaptation,
               narrative structure, prose critique, plain language
               simplification, and formalisation for legal and regulatory contexts"

 :constructs {
   :core         [e/compose e/narrate e/adapt-register e/critique]
   :specialised  [e/instruct e/formalize e/simplify e/localize]}

 :best-for [
   "Multi-audience document generation from a single knowledge source"
   "Technical content adapted for executive, legal, and public audiences"
   "Reviewing existing drafts for clarity, register, and audience fit"
   "Plain language transformation of legal and technical documents"
   "Compliance and privacy communications for different audiences"
   "Instructional content: tutorials, how-tos, runbooks"
   "Formalisation of informal decisions for legal and regulatory contexts"
   "Locale-appropriate communication across cultural and linguistic contexts"]

 :works-with [:core :domain :data :semantics :orchestrate :web]

 :key-concepts [
   {:term "Register"
    :definition "The variety of language appropriate to a particular social
                 situation. Formal register for legal documents; conversational
                 for user guides; technical for engineering documentation."}
   {:term "Adaptation"
    :definition "Transformation of content for a specific audience while
                 preserving the underlying information and intent"}
   {:term "Narrative pattern"
    :definition "A structural template for organising information that matches
                 the way human minds process and retain material. Problem-solution,
                 chronological, deliberative, and comparative are the most common."}
   {:term "Formalisation"
    :definition "The transformation of informal or ambiguous language into
                 precise, auditable prose suitable for legal or regulatory
                 contexts. Makes implicit agents explicit and quantifies vague claims."}
   {:term "Plain language"
    :definition "Writing that communicates clearly to its intended audience,
                 without unnecessary complexity. Not simplistic — appropriately
                 simple for the audience. Active voice, short sentences, concrete
                 examples."}
   {:term "Localisation"
    :definition "Adaptation of content for a specific locale: not just translation
                 but cultural adaptation of examples, references, conventions,
                 and formality norms."}
   {:term "Prose critique"
    :definition "Evaluation of writing for communication quality — clarity,
                 register fit, audience appropriateness, structure — relative to
                 a named audience and purpose. Distinct from argument critique
                 (semantics' s/critique), which judges logical validity rather
                 than how well the prose communicates."}
   {:term "Document vs. interface boundary"
    :definition "Eloquence composes documents — prose with an arc, read by a
                 seated reader. Interface microcopy (labels, error and empty
                 states) is web's w/copy: fragments bound to UI states, read in
                 passing. The two are complementary and never write the same text."}]}
```

---

## Implementation notes for LLM processors

### Audience fidelity

The `:audience` parameter is not a suggestion. It is the governing constraint
for every language decision. When `:audience :executive` is specified, omit
implementation detail, use business-level vocabulary, avoid technical acronyms
(or explain them on first use), and structure for skimmability. When
`:audience :senior-engineer`, include failure modes, implementation choices,
and technical specificity.

Never produce prose that would be inappropriate for the specified audience.
A board presentation that includes container orchestration details is a
failure of audience fidelity.

### Register precision

The `:tone` parameter specifies register along a formality dimension. But
register is more than formality — it is the set of vocabulary choices, sentence
structures, and discourse patterns appropriate to a context:

- **Formal**: passive constructions for impersonality, nominal style, complex
  sentences, no contractions
- **Professional**: active voice preferred, moderate sentence complexity,
  third-person for institutional voice
- **Conversational**: second-person address, contractions acceptable, shorter
  sentences, direct questions
- **Plain**: short words preferred, active voice, specific examples over
  abstractions, defined-on-first-use for any technical terms

### Length calibration

- `:brief` — single page maximum; executive summaries, decision memos
- `:standard` — appropriate for the content; no padding, no artificial compression
- `:comprehensive` — full treatment; every important aspect addressed; suitable
  for reference documents and formal reports

Never pad to length. Never compress by omitting necessary information. Match
length to the content's genuine informational requirements for the specified
audience.

### Formalisation discipline

When applying `e/formalize` at `:level :legal` or `:level :regulatory`:
- Every agent must be a specific named entity or role (not "they" or "we")
- Every obligation must include "shall" (obligation) or "may" (permission)
- Every date reference must be absolute ("31 March 2026"), not relative
  ("by end of Q1")
- Every defined term must be capitalised after its definition
- Every factual claim must be sourced or marked as an assessment

### Localisation versus translation

`e/localize` is not a translation function. Translation is a prerequisite;
localisation is what happens after translation. When localising for `:nl`:
- Replace American cultural references with Dutch equivalents
- Use Dutch regulatory references (AVG, not GDPR, where both are technically
  correct but the Dutch term signals appropriate authority)
- Apply Dutch date format conventions (day-month-year)
- Observe Dutch professional communication norms (less hierarchical than
  German; more direct than British)
- Use Dutch plain language standards for citizen-facing documents (Rijksoverheid
  schrijfwijzer)

### Critique is relative, paired, and constructive

When processing `e/critique`, never issue a context-free verdict. Every finding
must be relative to the declared `:for` audience and, where given, `:purpose`:
jargon flagged for an executive is appropriate vocabulary for an engineer, and
the report must reflect that the standard is the reader, not an abstract ideal.
A critique that does not reference the audience in its findings has not done the
job.

Report strengths alongside faults. A critique that lists only problems leaves
the author unable to tell what to preserve while revising, and tends to provoke
wholesale rewrites that lose what worked. Surface what the prose does well as
explicitly as what it does poorly.

When `:suggest true`, pair every significant finding with a concrete rewrite,
not a restatement of the problem. "This sentence is unclear" is a diagnosis;
the clearer sentence is the value. The construct should do the harder half.

Hold the boundary with `s/critique`. `e/critique` judges *communication* —
clarity, register, structure, audience fit. It does not judge logical validity,
evidential sufficiency, or the soundness of an argument; those are `s/critique`'s
remit. If a prose problem is actually an argument problem (a claim is unclear
because it is unsupported, not because it is badly worded), say so and defer to
semantics rather than treating it as a writing defect.

### The document/interface boundary

Eloquence composes documents, not interface microcopy. When a request is
actually for the text inside a UI component — a button label, an error message,
an empty-state heading, a tooltip — that is `web`'s `w/copy`, governed by
different disciplines (brevity, state-binding, blameless errors). Do not use
`e/compose` or `e/adapt-register` to generate interface fragments; the output
will carry document-register habits inappropriate to microcopy. Eloquence writes
the runbook, the guide, and the report; it does not write the words rendered
inside the app's own screens.