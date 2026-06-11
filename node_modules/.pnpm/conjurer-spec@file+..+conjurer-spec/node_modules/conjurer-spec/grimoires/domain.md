# domain.md — Conjurer Domain Grimoire

The spellbook for knowledge. Every field of human endeavour — healthcare,
law, finance, logistics, software architecture — possesses structure that
practitioners understand intuitively but rarely articulate systematically.
The `domain` grimoire surfaces this implicit structure, transforming
documentation, regulation, and practitioner knowledge into explicit,
composable, and operationalisable domain models.

---

## Philosophy

### The tacit knowledge problem

There is a gap between what domain experts *know* and what they have *written
down*. An experienced clinician knows that a particular drug interaction
matters only when the patient is over 65 and renally impaired — but this may
not appear explicitly in any single document. A tax lawyer knows that a
certain clause triggers a provision that most practitioners miss. A senior
engineer knows that a particular field in the legacy system is always null in
practice, despite being mandatory in the schema.

This tacit knowledge — accumulated through years of practice, pattern
recognition, and hard-won experience — is precisely what domain models must
capture. It is also what makes domain modelling hard. Sources document the
explicit; the valuable often lives in the gap.

`domain` grimoire functions therefore do two things: they extract what sources
*say*, and they infer what the domain *implies*. Both are made visible. Both
are attributed. The gap between stated fact and inferred structure is preserved
as an epistemic distinction, not collapsed.

### Discovery, not invention

Domains have inherent structure whether we model them or not. Insurance has
premiums, risk pools, and actuarial tables whether any software models them.
Contract law has offer, acceptance, consideration, and capacity whether any
system represents them. The domain grimoire's first principle is that we
*discover* this structure — we do not invent it.

This is a meaningful design constraint. It means domain models should be
justified by evidence from sources, not by the practitioner's preferences.
It means conflicts between sources should be preserved, not silently resolved
by preference. It means the model's provenance — where each concept came from,
how confident we are, what we could not find — is first-class information,
not metadata to be discarded.

The opposite of discovery is *imposition*: forcing a domain into a framework
that suits the technology rather than the domain. Imposing an anemic ORM
schema onto a rich legal domain produces a model that is internally consistent
but semantically false. The domain grimoire resists this.

### The model as epistemological instrument

A domain model is not just a technical artefact — it is an epistemological
instrument. The act of building it forces clarity about what is known, what
is assumed, and what is unknown. Entities that cannot be defined precisely are
often entities that are not understood. Relationships that cannot be stated
often reflect genuine ambiguity in the domain. Constraints that turn out to
be contested often reveal genuine disagreements between stakeholders.

This means that the process of building a domain model has value independent
of the model produced. The questions that arise — "Is this a separate entity
or an attribute of that one?" "Does this rule apply in that jurisdiction?"
"Who is responsible for this operation?" — are exactly the questions that
should be asked before writing a line of code.

### Progressive depth

No domain is fully understood in a single pass. Exploration begins with
breadth — a map of the territory, enough to navigate. Refinement adds depth
where it matters. This is how human understanding develops, and the grimoire
honours it: initial models are sketches; refined models are working documents;
annotated models are institutional knowledge.

---

## Naming rationale

**Domain** — In domain-driven design, the domain is the subject area to which
the application applies: the sphere of knowledge, activity, and rules that
the software models. The term carries this precise technical heritage into
Conjurer.

**`d/`** — The short namespace alias. Deliberate terseness: domain exploration
invocations appear frequently in complex programs, and brevity compounds.

---

## Part I: Discovery

The foundation of domain work is discovery — analysing sources to extract
entities, relationships, operations, constraints, and the implicit structure
that connects them.

---

### `d/explore`

Analyses sources — documents, URLs, text, or previously built models — to
extract a comprehensive domain model. The primary entry point for domain
discovery.

#### Signature

```clojure
(d/explore source
  :from          :text | :url | :file | :model | :multiple
  :depth         n
  :breadth       :narrow | :moderate | :broad | :exhaustive
  :focus         [:taxonomy :entities :operations :constraints
                  :nomenclature :legal-definitions :relationships
                  :actors :lifecycle :invariants]
  :sources       [:authoritative :legal :academic :practitioner]
  :language      :en | :nl | :de | :fr | ...
  :infer         [:missing-concepts :implicit-rules :unstated-assumptions]
  :confidence-threshold 0.0-1.0
  :compare-to    existing-model
  :output        :edn | :markdown | :graph
  :manifest      model-binding)
```

#### Parameters

**`source`** — What to analyse. A URL, a file path, a text string, a
previously produced domain model, or a vector of any of these for
multi-source exploration.

**`:from`** — Source type hint: `:text` (inline string), `:url` (web page),
`:file` (local document), `:model` (existing domain model to re-analyse),
`:multiple` (heterogeneous vector of sources).

**`:depth`** — Maximum nesting levels in taxonomies and hierarchies (1–5;
default 3). Deeper is richer; shallower is faster. Mark truncated branches
with `:more-available true` at the depth boundary.

**`:breadth`** — Concepts extracted per level: `:narrow` (top 3–5),
`:moderate` (10–15, default), `:broad` (20–30), `:exhaustive` (all
discoverable). Breadth determines coverage; depth determines detail.

**`:focus`** — Which domain aspects to prioritise. Multiple values produce
comprehensive analysis; single values produce targeted extraction:
- `:taxonomy` — hierarchical classification of concepts
- `:entities` — objects with identity and lifecycle
- `:operations` — actions, processes, state transitions
- `:constraints` — rules, obligations, prohibitions, preconditions
- `:nomenclature` — terminology, definitions, synonyms
- `:legal-definitions` — statutory definitions with citations
- `:relationships` — entity-to-entity connections with cardinality
- `:actors` — agents who perform operations or bear obligations
- `:lifecycle` — state machines for entities with meaningful state
- `:invariants` — conditions that must always hold across the domain

**`:sources`** — Source preference weighting:
- `:authoritative` — official bodies, government, standards organisations
- `:legal` — statutes, regulations, case law
- `:academic` — peer-reviewed research, established textbooks
- `:practitioner` — professional guides, handbooks, practitioner commentary

**`:language`** — Primary language for analysis and output. Technical terms
with no conventional translation (API, schema, GDPR) are preserved in their
original form.

**`:infer`** — What to infer beyond what sources explicitly state:
- `:missing-concepts` — concepts implied but not defined
- `:implicit-rules` — constraints that the domain assumes but does not state
- `:unstated-assumptions` — background knowledge the domain takes for granted

Inferred elements are marked `:inferred true` and attributed with the
reasoning that produced them. They are never silently promoted to stated fact.

**`:confidence-threshold`** — Minimum confidence score (0.0–1.0) for a
concept to appear in the output. Lower thresholds yield more complete but
less reliable models; higher thresholds yield sparser but more confident
ones. Default 0.6.

**`:compare-to`** — An existing model to diff against immediately after
exploration. Produces an annotated model with `:new`, `:changed`, and
`:absent` markers relative to the reference. Useful for tracking how a
domain evolves across document versions.

**`:output`** — Output format: `:edn` (default, structured data), `:markdown`
(human-readable documentation), `:graph` (entity-relationship representation).

#### Design rationale

Domain exploration requires balancing breadth and depth. Too shallow misses
important nuances; too deep overwhelms with detail that obscures structure.
The `:depth` and `:breadth` parameters give the practitioner explicit control
over this trade-off.

The `:focus` parameter reflects a real insight: different explorations serve
different purposes. Legal compliance work prioritises `:legal-definitions` and
`:constraints`. API design prioritises `:entities` and `:operations`.
Terminology alignment prioritises `:nomenclature`. Architecture planning
prioritises `:relationships` and `:lifecycle`. Forcing every exploration to
produce every aspect wastes effort and obscures relevant findings.

The `:infer` parameter addresses the tacit knowledge problem directly. Sources
document the explicit; inference surfaces the implicit. Marking inferred
elements distinctly — never collapsing them into stated facts — preserves the
epistemological distinction that matters for high-stakes domains where the
difference between "the regulation says" and "this implies" is legally
significant.

#### Example 1: Dutch healthcare insurance domain

```clojure
(d/explore "https://www.healthcare.gov/glossary/"
  :from    :url
  :depth   3
  :focus   [:taxonomy :legal-definitions :entities :constraints]
  :sources [:authoritative :legal]
  :language :en
  :infer   [:implicit-rules]
  :output  :edn)

;; Returns:
{:domain      "US Health Insurance (ACA)"
 :description "Regulated individual and employer health coverage under the
               Affordable Care Act"
 :source      "healthcare.gov/glossary"

 :taxonomy {
   :root "Health Insurance"
   :levels {
     1 [{:concept    "Qualified Health Plan"
         :definition "ACA-compliant plan sold through the Marketplace; covers
                      essential health benefits"
         :legal-ref  "ACA §1301"
         :confidence :high}
        {:concept    "Supplemental Coverage"
         :definition "Voluntary coverage for services outside the QHP benefit
                      package (dental, vision, gap plans)"
         :confidence :high}]
     2 [{:concept     "Deductible"
         :parent      "Qualified Health Plan"
         :definition  "Annual amount the enrollee pays out-of-pocket before the
                       plan begins sharing costs"
         :legal-ref   "ACA §1302(c)"
         :amount-2024 1600
         :confidence  :high}
        {:concept    "Premium"
         :parent     "Qualified Health Plan"
         :definition "Monthly amount paid to the insurer to maintain coverage"
         :legal-ref  "ACA §1301"
         :confidence :high}]
     3 [{:concept          "Premium Tax Credit"
         :parent           "Premium"
         :definition       "Income-based federal subsidy that reduces monthly
                            premium costs for eligible enrollees"
         :legal-ref        "IRC §36B"
         :administered-by  "IRS / Healthcare.gov"
         :confidence       :high}]}}

 :entities {
   "enrollee"   {:type :actor
                 :attributes [:member-id :address :income-bracket]
                 :roles [:premium-payer :care-recipient]
                 :lifecycle [:unenrolled :enrolled :terminated]}
   "insurer"    {:type :actor
                 :attributes [:state-licence :mlr-compliance]
                 :roles [:collect-premiums :pay-claims :contract-network]
                 :legal-obligations ["Guaranteed issue — ACA §2702"
                                     "No lifetime dollar limits — ACA §2711"]}
   "provider"   {:type :actor
                 :roles [:deliver-care :submit-claims]
                 :subtypes ["primary-care-physician" "specialist"
                            "hospital" "pharmacy"]}}

 :relationships [
   {:from "enrollee" :to "insurer"  :type :holds-plan-with
    :cardinality :many-to-one :constraint "One QHP per enrollee during plan year"}
   {:from "enrollee" :to "provider" :type :receives-care-from}
   {:from "provider" :to "insurer"  :type :submits-claim-to
    :note "Direct billing applies only to in-network providers"}]

 :constraints [
   {:type :legal :strength :obligation
    :description "Insurer must accept every applicant during open or special
                  enrollment periods regardless of health status"
    :source "ACA §2702 (guaranteed issue)"
    :applies-to ["insurer"]}
   {:type :legal :strength :obligation
    :description "Plans must cover ten essential health benefit categories
                  without annual or lifetime dollar limits"
    :source "ACA §1302"
    :applies-to ["insurer"]}
   {:type     :inferred
    :inferred true
    :description "Enrollees who miss open enrollment may not obtain a QHP
                  until the next open enrollment period unless a qualifying
                  life event triggers a special enrollment period"
    :reasoning  "Follows from ACA §1311(c)(6) (open enrollment windows) combined
                 with §1311(c)(4) (special enrollment triggers); no single
                 provision states the default lock-out explicitly"
    :confidence :medium}]
 ;; ✓ The first two constraints carry :source — a citable statutory section —
 ;;   and no :inferred marker; they are stated fact.
 ;; ✓ The third carries :inferred true plus :reasoning instead of a :source:
 ;;   no single article states the lock-out rule; it is derived from two
 ;;   provisions read together. This is the inferred/stated boundary the
 ;;   grimoire never collapses.

 :nomenclature {
   "premium"    {:definition "Monthly payment to maintain health plan coverage"
                 :legal-ref  "ACA §1301"
                 :synonyms   ["health premium" "monthly premium"]}
   "deductible" {:definition "Annual out-of-pocket threshold before cost-sharing begins"
                 :legal-ref  "ACA §1302(c)"
                 :related    ["out-of-pocket maximum" "co-insurance"]
                 :note       "Out-of-pocket maximum is a separate, higher limit
                              that caps total annual exposure including deductible"}}

 :metadata {
   :analysed-at        "2025-11-02T18:30:00Z"
   :source-language    :en
   :language           :en
   :concepts-extracted 34
   :inferred-elements  3
   :confidence         :high
   :completeness       0.85
   :depth-achieved     3
   :conflicts-found    0
   :conflicts-resolved 0
   :sources-consulted  ["healthcare.gov" "ACA text (Public Law 111-148)"
                        "cms.gov/cciio"]}}
```

#### Example 2: Multi-source regulatory exploration

```clojure
(d/explore ["https://www.hhs.gov/hipaa/for-professionals/privacy/index.html"
            "https://www.hhs.gov/hipaa/for-professionals/security/index.html"
            "hipaa-omnibus-rule-2013.pdf"]
  :from    :multiple
  :depth   4
  :focus   [:legal-definitions :constraints :actors :operations]
  :sources [:legal :authoritative]
  :language :en
  :infer   [:implicit-rules :unstated-assumptions]
  :output  :edn)

;; Returns unified model spanning all three sources:
;; - Patient rights extracted from Privacy Rule and Omnibus Rule amendments
;; - Conflict between Privacy Rule's 60-day breach notification and Omnibus
;;   Rule's clarified 60-day-from-discovery clock preserved with attribution
;; - Implicit rule inferred: a Business Associate that sub-contracts PHI handling
;;   must obtain a Business Associate Agreement from the sub-contractor, even
;;   when the covered entity's BAA is silent on sub-contractors —
;;   marked :inferred true with reasoning (follows from 45 CFR §164.308(b)(4))
```

#### Example 3: Technical domain with inference

```clojure
(d/explore "OAuth 2.0 RFC 6749 and RFC 6750"
  :from    :text
  :depth   2
  :breadth :narrow
  :focus   [:entities :operations :relationships :constraints]
  :infer   [:implicit-rules]
  :output  :edn)

;; Returns:
{:domain "OAuth 2.0"
 :entities {
   "Resource Owner" {:type :actor  :role "End user who authorises access"}
   "Client"         {:type :actor  :role "Application requesting access on behalf of owner"}
   "Authorisation Server" {:type :service :role "Issues access tokens after authentication"}
   "Resource Server"      {:type :service :role "Hosts protected resources; validates tokens"}}

 :operations {
   "Authorisation Code Flow" {
     :actors  ["Resource Owner" "Client" "Authorisation Server"]
     :steps   [:redirect-to-as :user-authenticates :code-issued :code-exchanged :token-issued]
     :use-when "Client can securely store client secret (server-side apps)"}
   "Token Refresh" {
     :actors [:Client :Authorisation-Server]
     :inputs [:refresh-token]
     :outputs [:new-access-token :new-refresh-token]}}

 :constraints [
   {:type :security :strength :obligation
    :description "Access tokens must be short-lived"
    :source "RFC 6749 §1.5"}
   {:type     :inferred :inferred true
    :description "Implicit flow is deprecated — clients must not use it for new implementations"
    :reasoning  "RFC 9700 (OAuth 2.0 Security BCP) prohibits implicit flow;
                 not stated in original RFC 6749 but now industry consensus"
    :confidence :high}]}
```

#### Usage patterns

```clojure
;; Single authoritative source
(d/explore "https://official-standard.org/specification"
  :from    :url
  :depth   3
  :sources [:authoritative])

;; Focused extraction — only what's needed
(d/explore requirements-doc
  :focus  [:entities :constraints]   ;; skip taxonomy, nomenclature
  :depth  2)

;; Compare a domain against a reference model to surface what has changed
(d/explore "updated-regulations-2025.pdf"
  :compare-to existing-domain-model
  :output :edn)
;; → Returns model with :new, :changed, :absent markers

;; High-confidence only — sparse but reliable
(d/explore noisy-source
  :confidence-threshold 0.8
  :breadth :narrow)
```

---

### `d/extract`

Targeted extraction of specific facts, relationships, or structural elements
from a source or an existing model. Where `d/explore` produces a comprehensive
domain map, `d/extract` retrieves a precise answer to a specific question.

#### Signature

```clojure
(d/extract source-or-model
  :what     :entities | :relationships | :constraints | :operations
            | :terminology | :actors | :lifecycle | :invariants
  :matching criteria
  :depth    n
  :as       :list | :map | :graph
  :output   :edn
  :manifest extraction-binding)
```

#### Parameters

**`:what`** — What category of domain fact to extract. Unlike `d/explore`,
which extracts everything, `d/extract` retrieves one specific facet.

**`:matching`** — A filter: a pattern, predicate, or natural-language
description of which items within the category to retrieve.

**`:depth`** — How deep to follow references when extracting. Depth 1 returns
the item; depth 2 includes its immediate relationships; depth 3 includes the
relationships of those relationships.

**`:as`** — Output shape: `:list` (ordered collection), `:map` (keyed by
concept name), `:graph` (nodes and edges).

#### Design rationale

`d/explore` is an expedition — comprehensive, time-consuming, producing a map
of the territory. `d/extract` is a query — targeted, fast, producing a
specific answer. The two are complementary: explore to understand, extract to
retrieve.

The distinction matters in practice. A practitioner building an API endpoint
for a specific entity doesn't need the entire domain model — they need that
entity's attributes, relationships, and applicable constraints. `d/extract`
retrieves precisely that, without the overhead of a full exploration.

#### Example 1: Entity extraction with depth

```clojure
(d/extract health-insurance-domain
  :what     :entities
  :matching {:type :actor}
  :depth    2
  :as       :map)

;; Returns: all actor-type entities with their immediate relationships
;; {
;;   "enrollee" {
;;     :attributes [:member-id :address :income-bracket]
;;     :related-entities ["insurer" "provider"]
;;     :operations-as-actor ["enroll" "disenroll" "file-claim"]}
;;   "insurer"  { ... }
;;   "provider" { ... }}
```

#### Example 2: Constraint extraction by type

```clojure
(d/extract gdpr-domain
  :what     :constraints
  :matching {:strength :obligation :applies-to "controller"}
  :as       :list)

;; Returns: ordered list of all obligations on data controllers
;; [{:description "Maintain records of processing activities"
;;   :source "GDPR Art. 30"  :applies-to "controller"}
;;  {:description "Designate DPO where required"
;;   :source "GDPR Art. 37"  :applies-to "controller"} ...]
```

#### Example 3: Lifecycle extraction

```clojure
(d/extract order-domain
  :what     :lifecycle
  :matching {:entity "order"}
  :as       :graph)

;; Returns state machine as graph:
;; {:states [:draft :submitted :confirmed :shipped :delivered :cancelled :refunded]
;;  :transitions [
;;    {:from :draft     :to :submitted  :trigger "customer confirms"}
;;    {:from :submitted :to :confirmed  :trigger "payment clears"}
;;    {:from :submitted :to :cancelled  :trigger "payment fails" :compensate :release-inventory}
;;    {:from :confirmed :to :shipped    :trigger "warehouse dispatches"}
;;    {:from :shipped   :to :delivered  :trigger "delivery confirmed"}
;;    {:from :delivered :to :refunded   :trigger "return accepted" :within "14 days"}]
;;  :terminal-states [:delivered :cancelled :refunded]}
```

---

### `d/refine`

Deepens or extends an existing domain model by focusing on specific concepts,
incorporating additional sources, or expanding specific aspects with more
detail.

#### Signature

```clojure
(d/refine existing-model
  :focus-on  "concept-name" | [:concept-1 :concept-2]
  :expand    [:deeper-taxonomy :more-examples :related-concepts
              :legal-framework :edge-cases :historical-context]
  :depth     +n
  :enrich-from [additional-source ...]
  :infer     [:missing-concepts :implicit-rules]
  :output    :enhanced-edn
  :manifest  refined-model)
```

#### Parameters

**`:focus-on`** — Specific concept or concepts to deepen. All other parts of
the model are preserved unchanged.

**`:expand`** — What aspects to add to the focused concept:
- `:deeper-taxonomy` — additional hierarchy levels beneath the concept
- `:more-examples` — concrete usage examples and edge cases
- `:related-concepts` — concepts adjacent to but not directly under this one
- `:legal-framework` — statutory basis, enforcement history, interpretation
- `:edge-cases` — boundary conditions and exception handling
- `:historical-context` — how the concept evolved, prior definitions

**`:depth`** — Additional levels to add beyond the model's current depth for
the focused concept. Use `+n` notation: `:depth +2` adds two levels.

**`:enrich-from`** — Additional sources to incorporate for the focused area.

#### Design rationale

Initial explorations favour breadth; refinement provides targeted depth. Rather
than requiring complete specifications upfront, `d/refine` supports iterative
discovery: explore broadly to understand the terrain, identify areas requiring
more detail, refine precisely there.

This mirrors how domain experts actually work. A lawyer reading a contract
does not attempt to understand every clause at maximum depth simultaneously.
They scan for structure, identify clauses requiring close attention, then read
those closely. `d/refine` formalises this expert reading strategy.

#### Example

```clojure
(def aca-domain (d/explore "https://www.healthcare.gov/glossary/"
  :depth 2 :breadth :moderate))

(d/refine aca-domain
  :focus-on  "deductible"
  :expand    [:legal-framework :edge-cases :historical-context]
  :depth     +3
  :enrich-from ["https://www.cms.gov/cciio/resources/data-resources/oop"
                "aca-cost-sharing-regs-2024.pdf"])

;; Original model: unchanged
;; deductible branch: expanded to depth 5, with:
;; - Legal basis: ACA §1302(c) with full regulatory history
;; - Annual limit amounts per plan year (indexed series 2014–2025)
;; - Exceptions: preventive services (cost-sharing-free under §2713),
;;   out-of-network emergency care, embedded vs aggregate family deductibles
;; - Edge cases: HSA-eligible HDHP minimum deductible interaction,
;;   mid-year plan changes, deductible credit on plan switching
;; - Historical: pre-ACA practice, 2014 introduction, subsequent CPI indexing
```

---

## Part II: Synthesis

When understanding must emerge from multiple sources, or when a model must be
understood from a particular vantage point, synthesis constructs combine,
compare, and scope domain knowledge.

---

### `d/merge`

Combines multiple domain models into a unified view, aligning equivalent
concepts and making conflicts between sources explicit.

#### Signature

```clojure
(d/merge [model-1 model-2 ...]
  :strategy         :union | :intersection | :prefer-first | :synthesise
  :align-concepts   true | false
  :perspective-map  {:model-1 :regulatory :model-2 :practitioner ...}
  :conflict-resolution :prefer-authoritative | :prefer-recent | :preserve-all
  :output           :unified-edn
  :manifest         unified-model)
```

#### Parameters

**`:strategy`** — How to combine content:
- `:union` — include all information from all sources; mark conflicts
- `:intersection` — include only content agreed upon by all sources
- `:prefer-first` — first-listed model wins all conflicts
- `:synthesise` — attempt intelligent reconciliation; explain reasoning

**`:align-concepts`** — When true, detect semantically equivalent concepts
with different names across sources and merge them under a canonical term.
The alignment is always made visible: the canonical term is explicit, and
all source terms are preserved as alternatives.

**`:perspective-map`** — Labels what each source *represents*, not just what
it *is*. A model from a regulatory body represents `:regulatory` interpretation;
a model from a trade association represents `:industry` interpretation; one
from a practitioner handbook represents `:operational` interpretation.
Labelled perspectives enable the merged model to carry perspective context
alongside content.

**`:conflict-resolution`** — When `:synthesise` cannot determine consensus:
`:prefer-authoritative` (government > academic > industry),
`:prefer-recent` (later publication wins),
`:preserve-all` (include all positions with attribution).

#### Design rationale

Domains rarely have single authoritative sources. Legal domains span multiple
jurisdictions. Healthcare has clinical guidelines, research findings, and
regulatory requirements. Technical domains evolve through standards bodies,
vendor implementations, and community practices. A model built from one source
is incomplete; a model that hides the provenance of its claims is unreliable.

The `:perspective-map` is an important addition to the original design. When
merging a regulatory interpretation with a practitioner handbook with an
academic analysis, the merged model should carry that provenance. Not just
*what* each source said, but *from where it was speaking*. This is the
difference between a model that can be used for compliance work (requires
regulatory provenance) and one that can only inform general understanding.

#### Example: Merging HIPAA perspectives

```clojure
(def hhs-privacy  (d/explore "https://www.hhs.gov/hipaa/for-professionals/privacy"
                    :sources [:legal]))
(def hhs-security (d/explore "https://www.hhs.gov/hipaa/for-professionals/security"
                    :sources [:legal]))
(def hipaa-guide  (d/explore "hipaa-compliance-handbook-2024.pdf"
                    :sources [:practitioner]))

(d/merge [hhs-privacy hhs-security hipaa-guide]
  :strategy        :synthesise
  :align-concepts  true
  :perspective-map {:hhs-privacy  :regulatory-privacy
                    :hhs-security :regulatory-security
                    :hipaa-guide  :practitioner-operational}
  :conflict-resolution :prefer-authoritative)

;; Returns:
{:domain "HIPAA"
 :perspectives {:regulatory-privacy    "HHS Privacy Rule — governs use and disclosure of PHI"
                :regulatory-security   "HHS Security Rule — governs electronic PHI safeguards"
                :practitioner-operational "Operational compliance guidance for covered entities"}

 :aligned-concepts [
   {:sources-terms  ["patient" "individual" "plan member"]
    :canonical      "individual"
    :aligned-from   [:regulatory-privacy :regulatory-security :practitioner-operational]
    :note           "45 CFR uses 'individual'; guide uses 'patient' — aligned to regulatory term"}
   {:sources-terms  ["covered entity" "CE" "health plan"]
    :canonical      "covered-entity"}]

 :conflicts [
   {:concept   "breach-notification-clock"
    :positions [
      {:perspective :regulatory-privacy    :value "60 days from discovery"
       :source "45 CFR §164.404(b)"}
      {:perspective :practitioner-operational :value "as soon as reasonably possible"
       :source "HIPAA Compliance Handbook 2024 §8.3"
       :note   "Handbook interprets 60-day window as outer bound, not target"}]
    :resolution "60-day limit is statutory; handbook guidance is aspirational"
    :actionable "Model hard deadline as 60 days; add operational target of 10 business days"}]

 :confidence   :high
 :completeness 0.91}
```

---

### `d/compare`

Produces a structured comparison of two domain models — identifying
conceptual alignments, divergences, gaps, and structural differences.
Different from `d/merge`, which produces a unified model; `d/compare` produces
an analysis of the *relationship* between two models.

#### Signature

```clojure
(d/compare model-a model-b
  :dimensions   [:entities :operations :constraints :terminology :structure]
  :highlight    :alignments | :divergences | :gaps | :all
  :perspective  "natural-language framing of why this comparison matters"
  :output       :comparison-report | :diff-edn
  :manifest     comparison-binding)
```

#### Design rationale

Comparison without merge is a common need that the original spec did not
address. A compliance team needs to know: does our internal data model align
with GDPR requirements? A migration team needs to know: what concepts exist
in the legacy model that are absent from the target? A standards body needs
to know: how does this implementation of the standard diverge from the
reference?

`d/compare` answers these questions by producing an explicit relational
analysis — which concepts are equivalent, which are present in one model but
absent in the other, which share names but mean different things, and which
structural patterns differ between the models.

#### Example: Checking internal model against regulation

```clojure
(d/compare internal-data-model gdpr-domain
  :dimensions  [:entities :constraints :operations]
  :highlight   :gaps
  :perspective "Does our internal model satisfy GDPR's structural requirements?")

;; Returns:
{:comparison "internal-data-model vs gdpr-domain"
 :perspective "GDPR compliance gap analysis"

 :alignments [
   {:concept       "data-subject"
    :in-model-a    "User" :in-model-b "data-subject"
    :verdict       :semantically-equivalent
    :note          "Same concept, different name — align terminology"}]

 :gaps-in-model-a [
   {:missing-concept  "processing-record"
    :required-by      "GDPR Art. 30"
    :severity         :critical
    :description      "No record of processing activities found in internal model"}
   {:missing-concept  "data-retention-policy"
    :required-by      "GDPR Art. 5(1)(e) storage limitation"
    :severity         :high
    :description      "Retention durations not modelled for any entity type"}]

 :divergences [
   {:concept      "consent"
    :in-model-a   "Boolean flag on User record"
    :in-model-b   "Structured record with purpose, timestamp, and withdrawal path"
    :severity     :high
    :description  "Internal consent representation is insufficient for Art. 7 compliance"}]

 :verdict     :non-compliant
 :critical-gaps 1
 :high-gaps     2
 :recommendations [
   "Add processing-record entity with mandatory fields per Art. 30"
   "Model consent as first-class entity, not attribute"
   "Add retention-policy to each entity with stored personal data"]}
```

---

### `d/scope`

Derives a focused sub-domain view from a larger domain model. Useful when a
comprehensive model exists but only a specific facet is needed for a given
task — the scope narrows the lens without losing the parent context.

#### Signature

```clojure
(d/scope domain-model
  :to        "sub-domain name or concept cluster"
  :include   [:related-entities :applicable-constraints :relevant-operations]
  :depth     n
  :retain-provenance true
  :output    :scoped-edn
  :manifest  scoped-model)
```

#### Design rationale

A comprehensive domain model of healthcare may contain hundreds of entities.
A practitioner building a prescription management system needs a scope: the
prescription sub-domain, its entities, its constraints, and its actors —
but not the billing sub-domain or the ward management sub-domain.

`d/scope` derives this focused view without losing the parent context. The
scoped model retains provenance (it knows where it came from and what it is a
view of), enabling the practitioner to expand scope when needed without
starting over.

#### Example

```clojure
(d/scope comprehensive-healthcare-domain
  :to      "prescription-management"
  :include [:related-entities :applicable-constraints :relevant-operations]
  :depth   3
  :retain-provenance true)

;; Returns a scoped model containing:
;; Entities: Patient (scoped attributes), Prescriber, Medication, Prescription
;; Operations: prescribe, dispense, refill, cancel, check-interactions
;; Constraints: prescription-validity-period, max-refills, controlled-substance-rules
;; Actors: physician, pharmacist, patient
;; 
;; Provenance: {:parent-model comprehensive-healthcare-domain
;;              :scope "prescription-management"
;;              :excluded-sub-domains ["billing" "ward-management" "diagnostics"]}
```

---

### `d/bounded-context`

Partitions a large domain model into bounded contexts — the regions within
which a term has a single, unambiguous meaning — and produces the context map
that describes how those regions relate. Where `d/scope` extracts one region
for use, `d/bounded-context` reveals the seams of the whole.

#### Signature

```clojure
(d/bounded-context domain-model
  :strategy      :infer | :declare
  :contexts      {:context-name {:owns        [:entity ...]
                                 :language    "the term-meaning this context fixes"
                                 :team        "owning team, if known"}}
  :detect        [:linguistic-boundaries :transactional-boundaries
                  :team-boundaries :lifecycle-boundaries]
  :relationships :infer | [{:upstream :ctx-a :downstream :ctx-b
                            :pattern  :pattern-keyword}]
  :on-shared-term :flag | :split | :alias
  :output        :context-map
  :manifest      context-map)
```

#### Parameters

**`:strategy`** — `:infer` asks the processor to discover context boundaries
from the model itself; `:declare` takes the practitioner's `:contexts` map as
authoritative and only validates it. Inference is for understanding an
unfamiliar domain; declaration is for imposing a deliberate architecture.

**`:contexts`** — Explicit context definitions. Each context `:owns` a set of
entities and fixes the meaning of terms within its boundary. The same entity
name may legitimately appear in two contexts with different attributes — that
is the point of a bounded context, not a modelling error.

**`:detect`** — Which signals to use when inferring boundaries:
- `:linguistic-boundaries` — the same word means different things ("policy"
  in underwriting vs. "policy" in claims)
- `:transactional-boundaries` — clusters that change together within one
  consistency boundary (aligns with aggregate roots)
- `:team-boundaries` — Conway's-law seams: regions owned by different teams
- `:lifecycle-boundaries` — entities whose state machines are independent

**`:relationships`** — The context map. Either `:infer` the relationship
patterns or declare them. Patterns follow the DDD strategic vocabulary:
- `:shared-kernel` — two contexts share a small, jointly-owned model
- `:customer-supplier` — downstream context's needs influence upstream's plan
- `:conformist` — downstream accepts upstream's model wholesale, no translation
- `:anticorruption-layer` — downstream translates upstream's model to protect
  its own (the integration pattern for legacy or third-party systems)
- `:open-host-service` — upstream publishes a stable protocol for many consumers
- `:published-language` — a shared, documented interchange format between contexts
- `:separate-ways` — no integration; the contexts deliberately do not connect

**`:on-shared-term`** — What to do when one term appears in multiple contexts:
`:flag` (report it, change nothing), `:split` (give each context its own
qualified entity, e.g. `underwriting/policy` and `claims/policy`), `:alias`
(keep one canonical entity, record the per-context reading).

#### Design rationale

The grimoire commits to Domain-Driven Design throughout — aggregate roots,
value objects, the `:against :ddd` validation target — yet until now offered
no way to express DDD's most consequential strategic pattern: the bounded
context. `d/validate` even reports `:missing-bounded-context-definitions true`
as a warning, naming a gap it had no construct to fill. `d/bounded-context`
fills it.

The decisive insight DDD contributes is that **a single ubiquitous language
across a large domain is a mistake**, not an aspiration. "Policy" means a
contract in underwriting and a coverage rule in claims; forcing one definition
produces a model that is wrong in both contexts. Bounded contexts make
disagreement legitimate: each context is internally consistent, and the
context map governs translation at the seams. This is why `:on-shared-term`
defaults to `:flag` rather than auto-merging — a shared term across contexts
is usually a signal of a boundary, not a synonym to be reconciled.

The construct pairs deliberately with `d/scope`. `d/scope` answers "give me
the piece I need to build against"; `d/bounded-context` answers "show me where
the pieces are and how they must talk." One is extraction, the other is
cartography.

#### Example 1: Inferring contexts in an insurance domain

```clojure
(d/bounded-context insurance-domain
  :strategy :infer
  :detect   [:linguistic-boundaries :transactional-boundaries :team-boundaries]
  :on-shared-term :split
  :manifest insurance-contexts)

;; Returns:
{:contexts {
   :underwriting {:owns     ["application" "risk-assessment" "underwriting/policy" "premium"]
                  :language "policy = the contract being priced and issued"
                  :team     "Underwriting Engineering"}
   :claims       {:owns     ["claim" "claims/policy" "settlement" "adjuster"]
                  :language "policy = the coverage rules a claim is evaluated against"
                  :team     "Claims Engineering"}
   :billing      {:owns     ["invoice" "payment" "premium-schedule" "dunning"]
                  :language "premium = the recurring amount owed"
                  :team     "Finance Systems"}}

 :shared-terms [
   {:term "policy"
    :appears-in [:underwriting :claims]
    :action :split
    :resolution "Split into underwriting/policy and claims/policy"
    :note "Same word, genuinely different concept — not a synonym to merge"}
   {:term "premium"
    :appears-in [:underwriting :billing]
    :action :flag
    :note "Underwriting computes it; billing schedules it. Likely a published-language seam."}]

 :context-map [
   {:upstream :underwriting :downstream :billing  :pattern :customer-supplier
    :note "Billing depends on underwriting's premium output; can influence its schedule format"}
   {:upstream :underwriting :downstream :claims   :pattern :published-language
    :note "Claims reads issued policies via a stable published contract"}]

 :metadata {:contexts-found 3 :shared-terms 2 :strategy :infer :confidence :medium}}
;; ✓ Boundaries were inferred from three signals at once; :confidence is :medium,
;;   not :high, because inference from linguistic clues is fallible — a declared
;;   strategy would raise this.
;; ✓ "policy" was split (genuine homonym across contexts); "premium" was only
;;   flagged (same concept handed across a seam) — the construct distinguishes
;;   the two failure modes rather than treating every shared word identically.
```

#### Example 2: Declaring a deliberate architecture and validating it

```clojure
(d/bounded-context healthcare-domain
  :strategy :declare
  :contexts {
    :clinical    {:owns ["patient" "encounter" "diagnosis" "clinical/order"]
                  :language "order = a clinical instruction (medication, test, referral)"}
    :scheduling  {:owns ["appointment" "slot" "provider-calendar"]
                  :language "no overlap with clinical vocabulary"}
    :billing     {:owns ["invoice" "billing/order" "claim" "tariff"]
                  :language "order = a billable line item"}}
  :relationships [{:upstream :clinical :downstream :billing
                   :pattern :anticorruption-layer}]
  :manifest care-contexts)

;; Returns the declared map plus a validation of it:
{:contexts { ... as declared ... }
 :validation {
   :coverage     :complete          ;; every entity in the model belongs to a context
   :orphans      []                 ;; no entity left unassigned
   :shared-terms [{:term "order" :appears-in [:clinical :billing] :handled :split}]
   :seam-integrity :sound}
 ;; ✓ "order" appears in both clinical and billing with incompatible meanings;
 ;;   the declared :anticorruption-layer is exactly the right pattern — billing
 ;;   translates clinical orders into billable items rather than importing the
 ;;   clinical meaning, protecting its own model from upstream change.
 :recommendations [
   "Define the anticorruption translation explicitly: clinical/order → billing/order mapping"
   "scheduling has no declared relationships — confirm :separate-ways is intentional"]}
```

#### Usage patterns

```clojure
;; Map the seams, then scope into one context to build against it
(~> enterprise-domain
  (d/bounded-context :strategy :infer :detect [:transactional-boundaries])
  (d/scope :to :claims :include :all)
  (transmute :into :rest-api :preserving [:entities :operations]))

;; Validate that a hand-drawn architecture actually covers the model
(d/bounded-context legacy-domain
  :strategy :declare
  :contexts proposed-team-boundaries
  :on-shared-term :flag)   ;; surface every cross-context term for review
```

---

### `d/ubiquitous-language`

Reifies a domain's vocabulary as a first-class, enforceable glossary: the set
of canonical terms, their precise definitions, their provenance, and — equally
important — the terms that must *not* be used. Where `:nomenclature` is raw
extracted terminology, a ubiquitous language is a curated, governable artefact.

#### Signature

```clojure
(d/ubiquitous-language domain-model
  :scope          :whole-domain | :per-context
  :for-context    :context-name        ;; when scoped to a single bounded context
  :canonicalise   :prefer-authoritative | :prefer-frequent | :practitioner-choice
  :include        [:definitions :synonyms :forbidden-terms :examples :provenance]
  :forbid         {"banned-term" "use this canonical term instead"}
  :enforce-in     [:code :documentation :api :ui-copy]
  :output         :glossary | :glossary-edn | :markdown
  :manifest       language-binding)
```

#### Parameters

**`:scope`** — `:whole-domain` produces one glossary; `:per-context` produces
one per bounded context (the DDD-correct default for any domain that has been
through `d/bounded-context`, since each context fixes its own meanings).

**`:canonicalise`** — How to choose the canonical term when several compete:
`:prefer-authoritative` (the term used by the most authoritative source),
`:prefer-frequent` (the term practitioners actually use most), or
`:practitioner-choice` (defer to an explicit human decision, recording it).

**`:forbid`** — A map from banned terms to their canonical replacements. This
is the teeth of the construct: it does not merely list preferred words, it
names the words that cause confusion and routes them to the right one. A
forbidden term with no replacement is a term to be eliminated entirely.

**`:enforce-in`** — Where the language is meant to bind. A ubiquitous language
that governs prose but not code is half-applied; the value of DDD's ubiquitous
language is precisely that the *same* words appear in conversation, in the
model, and in the source. This parameter records the intended reach so
downstream generators (`d/generate-dsl`, `w/prototype`) can honour it.

#### Design rationale

Eric Evans's central claim in Domain-Driven Design is that the hardest bugs
are not in the code but in the *translation* — the silent slippage between the
word a domain expert uses, the word in the model, and the identifier in the
source. A "reservation" becomes a "booking" becomes a `TxnRecord`, and with
each rename a little meaning leaks away until the system quietly does the wrong
thing and everyone is certain they asked for the right one.

The grimoire already extracts `:nomenclature`, but extraction is not
governance. A list of terms is a description; a ubiquitous language is a
commitment. The difference is `:forbid` and `:enforce-in`: a real ubiquitous
language tells you not only what to say but what to stop saying, and where the
rule applies. This is why the construct is distinct from `d/extract :what
:terminology` rather than a flag on it — extraction observes usage as it is,
canonicalisation decides usage as it should be, and those are different
epistemic acts that the grimoire keeps separate on principle.

The output is designed to be consumed, not just read. The `:glossary-edn`
form feeds directly into `d/generate-dsl` (so generated function names use
canonical terms), into `w/prototype` (so UI copy uses domain words), and into
`d/validate :checks [:naming]` (so the model can be checked against its own
declared language). The language becomes the contract the rest of the
toolchain enforces.

#### Example 1: Curating a language for a single bounded context

```clojure
(d/ubiquitous-language insurance-domain
  :scope        :per-context
  :for-context  :claims
  :canonicalise :prefer-authoritative
  :include      [:definitions :synonyms :forbidden-terms :provenance]
  :forbid       {"file"   "claim"
                 "payout" "settlement"
                 "case"   "claim"}
  :enforce-in   [:code :api :documentation]
  :manifest     claims-language)

;; Returns:
{:context :claims
 :terms [
   {:canonical  "claim"
    :definition "A request for payment under a policy following an insured event"
    :synonyms-seen ["file" "case" "loss notification"]
    :forbidden  ["file" "case"]
    :provenance "Policy Conditions §7; Claims Handling Manual 2024"
    :confidence :high}
   {:canonical  "settlement"
    :definition "The agreed amount paid to resolve a claim, in full or in part"
    :synonyms-seen ["payout" "disbursement"]
    :forbidden  ["payout"]
    :provenance "Claims Handling Manual 2024 §3.2"
    :confidence :high}
   {:canonical  "adjuster"
    :definition "The actor who assesses a claim and determines settlement"
    :synonyms-seen ["assessor" "loss adjuster"]
    :note "‘assessor’ is acceptable in locale-specific UI copy; ‘adjuster’ is canonical in code"
    :confidence :high}]

 :enforcement {
   :code          :strict       ;; identifiers must use canonical terms
   :api           :strict       ;; endpoint and field names must use canonical terms
   :documentation :strict
   :ui-copy       :advisory}    ;; not in :enforce-in — locale variation tolerated

 :metadata {:context :claims :terms 14 :forbidden-terms 3 :canonicalised-by :prefer-authoritative}}
;; ✓ Each forbidden word routes to a canonical replacement — the glossary tells
;;   you what to stop saying, not just what to prefer.
;; ✓ ‘adjuster’ keeps a tolerated synonym (‘assessor’) for UI copy while staying
;;   strict in code: enforcement is graduated per surface, not all-or-nothing.
```

#### Example 2: Feeding the language into generation

```clojure
;; A curated language becomes the naming contract for everything generated downstream
(def claims-language
  (d/ubiquitous-language insurance-domain
    :scope :per-context :for-context :claims
    :canonicalise :prefer-authoritative
    :output :glossary-edn))

(d/generate-dsl claims-domain
  :target   :clojure
  :namespace "insurance.claims"
  :using-language claims-language)   ;; generated fns: register-claim, assess-claim,
                                     ;; settle-claim — never register-file or pay-out

(d/validate claims-model
  :checks [:naming]
  :against-language claims-language)
;; → Reports any entity, operation, or attribute name that violates the
;;   declared language, e.g. an operation named "process-payout" flagged
;;   because "payout" is forbidden in favour of "settlement".
```

#### Usage patterns

```clojure
;; Standard DDD pipeline: find the contexts, then give each its own language
(~> enterprise-domain
  (d/bounded-context :strategy :infer :manifest contexts)
  (d/ubiquitous-language :scope :per-context :canonicalise :prefer-authoritative))

;; Eliminate a term entirely (no replacement = stop using it, full stop)
(d/ubiquitous-language domain
  :forbid {"synergy" nil "leverage-as-verb" nil}
  :enforce-in [:documentation])
```

---

### `d/evolve`

Records and reasons about how a domain model changes over time. Where
`:compare-to` produces a one-shot diff between two models, `d/evolve` maintains
a lineage — a versioned history of what was added, changed, and retired, and
*why* — turning a static model into a living document with an audit trail.

#### Signature

```clojure
(d/evolve baseline-model
  :to            revised-model | new-source
  :from-source   :model | :url | :file        ;; when :to is a fresh source
  :record        [:additions :changes :removals :rationale]
  :reason        "natural-language account of why the domain changed"
  :driver        :regulation-change | :new-source | :practitioner-correction
                 | :scope-expansion | :error-fix
  :version       "semver for the resulting model"
  :on-removal    :archive | :tombstone | :discard
  :output        :evolved-model | :changelog
  :manifest      evolved-model)
```

#### Parameters

**`:to`** — The target state: either an already-built revised model, or a fresh
source (a new regulation, an updated requirements document) to explore and
diff against the baseline in one step.

**`:driver`** — Why the model is changing. This is not bookkeeping — the driver
determines how much epistemic weight the change carries. A
`:regulation-change` rewrites stated fact and is authoritative; a
`:practitioner-correction` adjusts the model against tacit knowledge; an
`:error-fix` repairs a prior extraction mistake. The driver is recorded against
every changed element so future readers know whether a difference reflects the
domain changing or our understanding of it changing.

**`:on-removal`** — What happens to retired elements: `:archive` (keep them in
a versioned history, retrievable), `:tombstone` (leave a marker recording that
the concept once existed and when it was removed — important in regulated
domains where "this rule used to apply" is itself a fact), or `:discard`
(remove without trace; rarely appropriate).

**`:record`** — Which dimensions of change to capture. `:rationale` is the
distinguishing one: it captures not just *what* changed but the reasoning, so
the lineage explains itself.

#### Design rationale

The grimoire's philosophy insists that "initial models are sketches; refined
models are working documents; annotated models are institutional knowledge" —
that a domain model is a living artefact. Yet the only tool for handling change
was `:compare-to`, which diffs two models and forgets. A diff answers "what is
different now"; it cannot answer "how did we get here" or "when did this rule
stop applying and why". In regulated domains — exactly the domains this
grimoire targets — that second question is often the one that matters in an
audit.

`d/evolve` makes change first-class. The decisive design choice is the
`:driver`, which encodes the *kind* of change. A model whose constraint changed
because the law changed is in a completely different epistemic position from a
model whose constraint changed because we finally read the source correctly.
Collapsing those into an undifferentiated "diff" destroys exactly the
information an auditor, a successor, or a future version of the practitioner
needs. By recording the driver and rationale against every change, the lineage
becomes self-explaining: a reader can reconstruct not just the model's current
state but the history of reasoning that produced it.

`:on-removal :tombstone` reflects a hard-won lesson from regulated domains: a
rule that no longer applies is not the same as a rule that never existed. "The
short-term plan exemption for this category was removed in 2024" is a fact a
compliance system may need long after the rule is gone. Tombstoning preserves
the model's memory of its own past.

#### Example 1: Absorbing a regulatory change with full lineage

```clojure
(def aca-2024 (d/explore "aca-benefit-regs-2024.pdf" :depth 3 :focus [:constraints]))

(d/evolve aca-2024
  :to          "aca-benefit-regs-2025.pdf"
  :from-source :file
  :driver      :regulation-change
  :record      [:additions :changes :removals :rationale]
  :reason      "Annual ACA benefit parameter update for 2025: deductible and
                out-of-pocket limits re-indexed; new requirement for over-the-counter
                contraceptive coverage added"
  :version     "2025.0.0"
  :on-removal  :tombstone
  :manifest    aca-2025)

;; Returns:
{:domain  "US Health Insurance (ACA)"
 :version "2025.0.0"
 :evolved-from {:version "2024.x" :at "2025-11-02T10:00:00Z"}

 :changes [
   {:element "deductible.individual-maximum"
    :kind    :changed
    :from    9450 :to 9800
    :driver  :regulation-change
    :reason  "Annual CPI indexing per 45 CFR §156.130(a)(2); Federal Register 2024"
    :confidence :high}
   {:element "essential-benefit.otc-contraceptives"
    :kind    :added
    :driver  :regulation-change
    :reason  "Final rule requires coverage of OTC contraceptives without
              cost-sharing effective plan years starting Jan 1 2025"
    :confidence :high}
   {:element "cost-sharing.short-term-plan-exemption-2024"
    :kind    :removed
    :driver  :regulation-change
    :on-removal :tombstone
    :tombstone {:existed-until "2024-12-31"
                :reason "Short-term plan exemption from ACA cost-sharing rules
                         rescinded; replaced by stricter durability limits"}
    :confidence :high}]

 :metadata {:additions 1 :changes 1 :removals 1 :driver :regulation-change}}
;; ✓ Every change carries its :driver and :reason — a future reader can tell
;;   this is the regulation changing, not a re-reading of the same rule.
;; ✓ The removed exemption is tombstoned, not discarded: the model retains
;;   the fact it existed until 2024-12-31, which a compliance audit may need.
```

#### Example 2: Distinguishing a correction from a domain change

```clojure
;; A practitioner discovers an earlier extraction was simply wrong —
;; the domain did not change, our model of it did.
(d/evolve ccpa-model
  :to       corrected-ccpa-model
  :driver   :error-fix
  :record   [:changes :rationale]
  :reason   "Earlier extraction read the CCPA opt-out right as applying to all
             personal information; correct scope is sale and sharing of PI only.
             No statutory change — extraction error corrected."
  :version  "1.0.1"
  :manifest ccpa-corrected)

;; Returns a changelog where the single change is marked :driver :error-fix:
;; ✓ The version bump is a patch (1.0.0 → 1.0.1), not a minor or major —
;;   the model was wrong, not out of date. :driver :error-fix records this so
;;   the change is never mistaken for the regulation having changed.
```

#### Usage patterns

```clojure
;; Track a domain across a series of document versions, accumulating lineage
(~> (d/explore "policy-v1.pdf")
  (d/evolve :to "policy-v2.pdf" :from-source :file :driver :new-source :version "2.0.0")
  (d/evolve :to "policy-v3.pdf" :from-source :file :driver :new-source :version "3.0.0"))
;; → Each step appends to the lineage; the final model carries its full history.

;; Produce a human-readable changelog for stakeholders
(d/evolve baseline :to revised :driver :scope-expansion
  :output :changelog)
```

---

## Part III: Explicit modeling

When no suitable source exists, when sources are insufficient, or when
practitioner knowledge must be codified directly, explicit modeling constructs
allow the practitioner to author domain knowledge rather than extract it.

---

### `d/model`

Manually defines a domain model — entities, relationships, operations,
constraints, and lifecycle states — from the practitioner's own understanding.

#### Signature

```clojure
(d/model domain-name
  :entities      {:entity-name {:attributes  [:attr ...]
                                :lifecycle   [:state ...]
                                :type        :aggregate-root | :entity | :value-object | :actor}} 
  :relationships [{:from :entity-a :to :entity-b
                   :type :relationship-type
                   :cardinality :one-to-one | :one-to-many | :many-to-many
                   :cascade :delete | :preserve | :nullify}
                  ...]
  :operations    {:op-name {:actors       [:actor ...]
                            :inputs       [:input ...]
                            :outputs      [:output ...]
                            :preconditions ["condition"]
                            :postconditions ["condition"]
                            :invariants   ["must hold throughout"]}}
  :constraints   [{:type    :business | :technical | :legal | :security
                   :strength :obligation | :permission | :prohibition | :recommendation
                   :rule    "natural-language rule"
                   :source  "origin of rule"
                   :applies-to [:entity ...]}
                  ...]
  :invariants    ["always-true condition" ...]
  :output        :edn
  :manifest      model-binding)
```

#### Parameters

**`:entities`** — Map of entity names to their structure. The `:type`
classification encodes the entity's role in the domain:
- `:aggregate-root` — entry point for transactional consistency (DDD aggregate)
- `:entity` — has identity and lifecycle but subordinate to an aggregate root
- `:value-object` — defined by attributes alone; no independent identity
- `:actor` — an agent that performs operations or bears obligations

**`:lifecycle`** — Explicit state machine for entities with meaningful state.
States are listed in natural order; transitions are inferred from operations
unless explicitly provided.

**`:operations`** — Domain operations (verbs) with their actors, inputs,
outputs, and the conditions that must hold before (preconditions) and after
(postconditions) them.

**`:invariants`** — Conditions that must hold across the domain at all times
(not just before or after specific operations). These are the domain's
architectural laws: "a product's inventory count is never negative", "a
cancelled order cannot transition to shipped".

#### Example: E-commerce domain

```clojure
(d/model "E-Commerce Platform"
  :entities {
    :customer {:type       :aggregate-root
               :attributes [:id :email :name :address :payment-methods]
               :lifecycle  [:prospective :registered :verified :suspended :churned]}

    :order    {:type       :aggregate-root
               :attributes [:id :customer-id :items :total :status :placed-at]
               :lifecycle  [:draft :submitted :confirmed :processing
                            :shipped :delivered :cancelled :refunded]}

    :product  {:type       :entity
               :attributes [:id :sku :name :price :inventory-count :category]
               :note       "inventory-count is managed by warehouse system — read-only here"}

    :payment  {:type       :entity
               :attributes [:id :order-id :amount :currency :method :status :authorised-at]}

    :address  {:type       :value-object
               :attributes [:street :city :postcode :country-iso]
               :note       "Equality by attribute value, not identity"}}

  :relationships [
    {:from :customer :to :order   :type :places
     :cardinality :one-to-many    :cascade :preserve}
    {:from :order    :to :product :type :contains
     :cardinality :many-to-many   :via :order-line}
    {:from :order    :to :payment :type :settled-by
     :cardinality :one-to-one     :cascade :preserve}]

  :operations {
    :place-order {
      :actors         [:customer]
      :inputs         [:cart-contents :shipping-address :payment-method]
      :outputs        [:order-confirmation :order-id]
      :preconditions  ["All items have inventory-count ≥ quantity requested"
                       "Payment method is valid and not expired"
                       "Customer account is :verified"]
      :postconditions ["inventory-count decremented for each item"
                       "Order status is :submitted"
                       "Payment status is :authorised"]}

    :process-return {
      :actors         [:customer :support-agent]
      :inputs         [:order-id :return-reason :items-to-return]
      :outputs        [:return-label :refund-confirmation]
      :preconditions  ["Order status is :delivered"
                       "Return requested within 14 days of delivery"
                       "Items not excluded from return policy"]
      :postconditions ["Refund initiated within 5 business days"
                       "Order status is :refunded"]}}

  :constraints [
    {:type :business :strength :obligation
     :rule "Orders over $75 qualify for free standard shipping to domestic addresses"
     :applies-to [:order]}
    {:type :technical :strength :obligation
     :rule "Inventory decrement must be atomic to prevent overselling"
     :applies-to [:order :product]}
    {:type :legal :strength :obligation
     :rule "EU customers have 14-day right of withdrawal from distance purchases"
     :source "EU Consumer Rights Directive 2011/83/EU"
     :applies-to [:order]}]

  :invariants [
    "A product's inventory-count is never negative"
    "A payment's amount always equals the associated order's total"
    "An order in :cancelled status cannot transition to any non-terminal state"
    "A :churned customer's personal data must not be retained beyond legal minimum"])
```

---

### `d/annotate`

Adds practitioner knowledge — corrections, context, caveats, and tacit
expertise — to an existing domain model without altering the model's
extracted facts.

#### Signature

```clojure
(d/annotate model
  :annotations [
    {:target  "concept-or-path"
     :kind    :correction | :context | :caveat | :tacit-knowledge | :open-question
     :note    "annotation text"
     :author  "practitioner identifier"
     :confidence :high | :medium | :low}
    ...]
  :output :annotated-edn
  :manifest annotated-model)
```

#### Design rationale

An extracted model is a document's interpretation. A practitioner's model
is an expert's interpretation. Both are valuable; neither is complete alone.
`d/annotate` provides a layer for the practitioner to add what the documents
do not say — the edge case that always trips people up in practice, the
regulatory interpretation that differs from the literal text, the business
rule that was agreed verbally but never written down.

Annotations are separate from extracted facts. They do not mutate the
underlying model; they add an authoritative practitioner layer above it.
This preserves the distinction between what the source says and what the
expert knows.

#### Example

```clojure
(d/annotate health-insurance-model
  :annotations [
    {:target     "deductible.exceptions"
     :kind       :tacit-knowledge
     :note       "In practice, all ACA-compliant plans must cover preventive
                  services at zero cost-sharing even before the deductible is
                  met — this is frequently absent from plan summaries.
                  Confirmed by ACA §2713 and HRSA preventive care guidelines."
     :author     "domain-expert-rwalker"
     :confidence :high}

    {:target     "insurer.guaranteed-issue"
     :kind       :caveat
     :note       "Guaranteed issue applies only during open and special
                  enrollment periods. Outside those windows an insurer may
                  refuse a new applicant — a common compliance misconception."
     :author     "domain-expert-rwalker"
     :confidence :high}

    {:target     "provider.out-of-network-billing"
     :kind       :open-question
     :note       "Unclear how No Surprises Act §2799B-1 interacts with
                  self-funded ERISA plans — federal floor applies but state
                  surprise-billing laws may not. Needs legal confirmation."
     :author     "domain-expert-rwalker"
     :confidence :low}])
```

---

### `d/validate`

Checks a domain model for internal consistency, structural completeness, and
adherence to known patterns.

#### Signature

```clojure
(d/validate model
  :checks  [:completeness :consistency :naming :relationship-integrity
            :constraint-coverage :lifecycle-reachability]
  :against :ddd | :rest-conventions | :openapi | :custom-standard
  :against-language language-binding   ;; optional: check naming against a glossary
  :strict  false
  :output  :validation-report
  :manifest validation-result)
```

#### Parameters

**`:checks`** — What to validate:
- `:completeness` — all referenced concepts are defined
- `:consistency` — no contradictions within the model
- `:naming` — terminology is consistent throughout (no mixed synonyms)
- `:relationship-integrity` — all relationship endpoints reference defined entities
- `:constraint-coverage` — all entities have at least one applicable constraint
- `:lifecycle-reachability` — all lifecycle states are reachable from the initial state

**`:against`** — Validate against a known pattern or standard:
- `:ddd` — Domain-Driven Design (aggregate roots, value objects, bounded contexts)
- `:rest-conventions` — REST API design principles (resource naming, operation mapping)
- `:openapi` — OpenAPI 3.1 specification compatibility

When `:against-language` is supplied (a glossary from `d/ubiquitous-language`),
the `:naming` check additionally flags any entity, operation, or attribute name
that uses a forbidden term instead of its canonical replacement.

#### Example

```clojure
(d/validate ecommerce-model
  :checks  [:completeness :consistency :naming :lifecycle-reachability]
  :against :ddd
  :strict  false)

;; Returns:
{:valid    true
 :score    0.84
 :errors   []
 :warnings [
   {:check       :completeness
    :description ":order-line is referenced in the order→product relationship
                  but is not defined as an entity"}
   {:check       :lifecycle-reachability
    :description "State :processing in order lifecycle has no incoming transition
                  from :confirmed — unreachable"}]
 :suggestions [
   "Define :order-line as an entity with :quantity and :unit-price attributes"
   "Add :confirm-payment operation transitioning order from :confirmed to :processing"
   "Consider designating :customer as an explicit aggregate root with bounded context"]
 :ddd-assessment {
   :aggregate-roots-identified [:customer :order]
   :missing-bounded-context-definitions true
   :value-objects-correctly-typed true}}
```

---

## Part IV: Operationalisation

Domain knowledge has value when it can be acted upon. These constructs transform
domain models into operational artefacts: domain-specific languages, exportable
documentation, and queryable knowledge bases.

---

### `d/generate-dsl`

Creates a domain-specific language from an explored domain, enabling
practitioners to express solutions in domain vocabulary rather than generic
programming vocabulary.

#### Signature

```clojure
(d/generate-dsl domain-model
  :style     :declarative | :imperative | :mixed
  :includes  [:entities :operations :queries :constraints]
  :namespace "domain.namespace"
  :target    :clojure | :conjurer-extension | :natural-language
  :using-language language-binding   ;; optional: a d/ubiquitous-language glossary
  :output    :dsl-definition
  :manifest  dsl-binding)
```

#### Parameters

**`:target`** — What kind of DSL to generate:
- `:clojure` — Clojure functions namespaced under `:namespace`
- `:conjurer-extension` — New Conjurer grimoire constructs that extend the
  language itself with domain-specific invocations
- `:natural-language` — A structured vocabulary guide for consistent
  communication across the team

**`:using-language`** — An optional glossary produced by `d/ubiquitous-language`.
When supplied, every generated identifier uses the glossary's canonical terms
and avoids its forbidden ones — the DSL inherits the domain's vocabulary by
construction rather than by convention.

#### Design rationale

The end goal of domain modelling is not the model — it is the language. When a
team can express their work in the domain's own vocabulary (`prescribe-medication`,
`place-order`, `declare-bankruptcy`), the conceptual gap between business
understanding and technical implementation narrows. Bugs that arise from
mistranslation between business and technical vocabulary become rarer. Reviews
between domain experts and engineers become possible.

The `:conjurer-extension` target is particularly powerful: it generates a new
Conjurer grimoire from the domain model, extending Conjurer itself with
domain-specific invocations. The modelled domain becomes executable Conjurer.

#### Example 1: Healthcare DSL

```clojure
(def healthcare-dsl
  (d/generate-dsl clinical-domain
    :style     :declarative
    :includes  [:entities :operations :constraints]
    :namespace "healthcare.us"
    :target    :clojure))

;; Generated DSL enables domain-fluent code:
(require '[healthcare.us :as h])

(h/prescribe-medication
  :prescriber  physician-007
  :patient     patient-12345
  :medication  "Metformin 500mg"
  :dosage      {:frequency :twice-daily :duration :90-days}
  :indication  "Type 2 diabetes — HbA1c above target on lifestyle intervention alone")

(h/check-interactions
  :patient             patient-12345
  :new-medication      "Metformin 500mg"
  :current-medications current-prescription-list)
```

#### Example 2: Conjurer extension from domain

```clojure
(d/generate-dsl insurance-domain
  :style     :declarative
  :includes  [:operations :constraints]
  :namespace "insurance"
  :target    :conjurer-extension)

;; Generates a new grimoire that extends Conjurer:
;; (i/accept-claim claim-data :assess [:coverage :liability :fraud-signals])
;; (i/calculate-premium profile :factors [:age :risk-class :history])
;; (i/validate-policy policy :against [:state-requirements :internal-rules])
```

---

### `d/export`

Exports a domain model to an external format for documentation, collaboration,
or tooling integration.

#### Signature

```clojure
(d/export domain-model
  :to       :markdown | :html | :mermaid | :plantuml | :owl-rdf | :json-ld
  :include  [:diagrams :definitions :constraints :metadata :annotations]
  :audience :technical | :business | :regulatory
  :output   "filename.ext")
```

#### Parameters

**`:audience`** — Shapes the language and level of technical detail in the
exported document. `:technical` uses precise technical vocabulary; `:business`
uses domain vocabulary without implementation concerns; `:regulatory` uses
legal and compliance framing.

#### Example

```clojure
(d/export gdpr-compliance-model
  :to       :markdown
  :include  [:definitions :constraints :annotations]
  :audience :regulatory
  :output   "gdpr-compliance-model.md")

;; Generates structured documentation:
;; - Executive summary of data processing activities
;; - Data subject rights catalogue with legal citations
;; - Obligations per actor with source references
;; - Annotated known issues and open questions
;; - Suitable for submission to Data Protection Authority
```

---

### `d/query`

Searches a domain model for specific concepts, patterns, or relationships,
returning targeted results.

#### Signature

```clojure
(d/query domain-model
  :find   "natural-language question or pattern"
  :return :concepts | :relationships | :constraints | :operations | :all
  :limit  n
  :output :edn | :list
  :manifest query-result)
```

#### Example

```clojure
(d/query healthcare-domain
  :find   "all obligations that apply when handling patient data"
  :return :constraints
  :output :list)

;; Returns: ordered list of all constraints matching the query,
;; with source attribution and confidence scores.

(d/query ecommerce-domain
  :find   "entities that can be in more than one state simultaneously"
  :return :concepts
  :output :list)
```

---

## Best practices

### Authoritative sources first; practitioner sources to supplement

Build domain models on official, citable foundations. Legal texts, standards
bodies, and authoritative reference works give models their epistemic backbone.
Practitioner guides and community documentation add operational nuance. The
provenance hierarchy matters: when sources conflict, authoritative sources win —
but conflicts should be named, not silently resolved.

### Mark the boundary between extracted and inferred

The `:inferred true` marker is not decoration. In high-stakes domains —
regulation, medicine, finance — the difference between "the law says" and "this
implies" is legally and operationally significant. Never promote an inferred
element to a stated fact. Keep the distinction explicit and permanent.

### Preserve conflicts; never silently resolve them

When two sources contradict each other, the correct response is to preserve
both positions with attribution and note the contradiction. Silent resolution
— choosing one source's position without visibility — creates models that look
authoritative but conceal genuine disagreements that domain experts need to
adjudicate.

### Use `:lifecycle` for entities with meaningful state

An entity that can be in different states (`order: draft → submitted →
confirmed → shipped → delivered`) has a state machine. Make it explicit.
Explicit lifecycle models enable reachability checks, prevent invalid
transitions, and make the domain's dynamics visible.

### Annotate before you forget

Tacit knowledge has a half-life. The expert who knows why a particular
exception exists will eventually leave. The meeting where a business rule was
verbally agreed will be forgotten. `d/annotate` is the mechanism for
capturing this before it disappears — not as code, not as documentation
nobody reads, but as first-class domain knowledge attached to the model it
explains.

### Scope before generating

When using a domain model to generate artefacts — APIs, UI components, test
suites — scope the model first to the relevant sub-domain. Passing a
comprehensive 200-entity domain model to `w/prototype` produces output
calibrated to the wrong level of abstraction. Scoping to the 8 entities
actually needed produces something immediately useful.

### Anti-patterns

**Imposing technology structure onto the domain.** The most damaging mistake
in domain modelling is letting the implementation shape the model rather than
the reverse. Flattening a rich legal domain into a handful of CRUD tables
because the ORM is comfortable with tables produces a model that is internally
tidy and semantically false. The philosophy section names this *imposition*,
the opposite of discovery. Symptom: every entity has the same shape (id,
created-at, updated-at, a bag of columns) and no entity has a lifecycle, an
invariant, or a constraint that the technology did not suggest. Remedy: model
the domain as the domain expert describes it, then let `target` declarations
decide what materialises as code — selective materialisation, not wholesale
flattening.

**Treating inferred elements as stated fact.** Dropping the `:inferred true`
marker because "we're fairly sure anyway" collapses the single most important
distinction the grimoire maintains. An inferred constraint presented as a
quoted regulation is not a small inaccuracy — in a compliance context it is a
fabricated citation. If confidence is high enough that the marker feels
unnecessary, the right move is to find the source that states it and cite that,
not to silently promote the inference.

**One ubiquitous language for a domain that has bounded contexts.** Forcing a
single canonical meaning on a term that legitimately means different things in
different contexts ("policy", "order", "account") creates a model that is wrong
in every context at once. When `d/bounded-context` reveals a shared term across
contexts, the usual answer is to split it, not to pick one winner. Reaching for
`d/ubiquitous-language :scope :whole-domain` on a multi-context domain is the
tell.

**Diffing without recording the driver.** Using `:compare-to` to absorb a new
document version and then discarding the comparison throws away the one fact an
auditor will ask for: *why* did the model change — did the law change, or did
we re-read it? Prefer `d/evolve` with an explicit `:driver` whenever the change
matters beyond the current session.

---

## Integration patterns

### Domain as the common semantic substrate

A domain model produced by `d/explore` serves as the shared semantic
foundation from which multiple artefacts are generated. This is the key
integration pattern: one exploration, many transmutations.

```clojure
;; Explore once — generate many
(def crm-domain
  (d/explore "crm-requirements.pdf"
    :depth 4 :focus [:entities :operations :constraints]))

(~> crm-domain
  (d/scope :to "customer-management" :include :all)
  (w/prototype "Customer Portal"
    :from-domain true :features [:crud :search :export])
  (weave customer-platform
    :strands [customer-portal auth-service notification-service]
    :ensuring [:gdpr-compliance :audit-trail]))

(transmute crm-domain
  :into :rest-api :preserving [:entities :operations :constraints])

(transmute crm-domain
  :into :test-suite :preserving [:business-rules :invariants])
```

### Domain context enriching core context

Domain models feed directly into `context establish`. An explored domain is
not just a data structure — it is semantic knowledge that should propagate
into the session's interpretive frame.

```clojure
(def healthcare (d/explore "healthcare-requirements.pdf" :depth 3))

(context establish clinical
  :domain      :healthcare
  :entities    (d/extract healthcare :what :entities :as :map)
  :constraints (d/extract healthcare :what :constraints :as :list))

;; All subsequent invocations now understand the healthcare domain's
;; entities and constraints without being told explicitly.
(conjure appointment-scheduler)  ;; knows Patient, Provider, Encounter entities
(conjure billing-module)         ;; knows the constraint structure automatically
```

### Domain-driven code generation via threading

```clojure
(~> requirements-document
  (d/explore    :depth 4 :focus [:entities :operations :constraints])
  (d/validate   :checks [:completeness :consistency] :against :ddd)
  (d/annotate   :annotations practitioner-knowledge-base)
  (d/scope      :to "core-domain" :include :all)
  (transmute    :into :rest-api :preserving [:entities :operations])
  (w/prototype  "Management Interface" :from-domain true))
```

---

## Grimoire metadata

```clojure
{:grimoire    "domain"
 :namespace   "d/"
 :version     "2.1.0"
 :description "Domain knowledge discovery, modelling, synthesis,
               and operationalisation"

 :constructs {
   :discovery    [d/explore d/extract d/refine]
   :synthesis    [d/merge d/compare d/scope]
   :structure    [d/bounded-context d/ubiquitous-language]
   :evolution    [d/evolve]
   :modeling     [d/model d/annotate d/validate]
   :operations   [d/generate-dsl d/export d/query]}

 :best-for [
   "Domain-driven design and knowledge extraction"
   "Regulatory compliance modelling and gap analysis"
   "Multi-source knowledge synthesis with conflict preservation"
   "Bounded-context discovery and context-map cartography for large domains"
   "Curating an enforceable ubiquitous language per bounded context"
   "Tracking model evolution across regulation and document versions with audit lineage"
   "DSL generation from domain models"
   "Living documentation that evolves with understanding"
   "Comparative analysis between model versions or perspectives"
   "Scoping large domain models for targeted artifact generation"]

 :works-with [:core :data :web :semantics :orchestrate]

 :key-concepts [
   {:term "Domain"
    :definition "A sphere of knowledge with inherent structure, rules, and vocabulary
                 that exists independently of any software model of it"}
   {:term "Entity"
    :definition "A domain object with identity and lifecycle — it persists over time
                 and can be individually distinguished (customer, order, patient)"}
   {:term "Value object"
    :definition "Defined by its attributes alone; has no independent identity.
                 Two addresses with the same fields are the same address."}
   {:term "Aggregate root"
    :definition "The entity through which a cluster of related entities is accessed;
                 the transactional consistency boundary in DDD"}
   {:term "Bounded context"
    :definition "A region of a domain within which a term has one unambiguous meaning.
                 The same word may mean different things in different contexts; the
                 context map governs translation at the seams."}
   {:term "Context map"
    :definition "The description of how bounded contexts relate — which is upstream,
                 which downstream, and by which integration pattern (shared-kernel,
                 customer-supplier, anticorruption-layer, published-language, etc.)"}
   {:term "Ubiquitous language"
    :definition "A curated, enforceable vocabulary for a domain or context: canonical
                 terms with definitions and provenance, plus the forbidden terms that
                 route to them. A commitment, not merely a description of usage."}
   {:term "Lineage"
    :definition "The versioned history of a domain model — what was added, changed,
                 and retired across versions, each change carrying the driver and
                 rationale that produced it"}
   {:term "Tombstone"
    :definition "A marker left when an element is removed, recording that the concept
                 once existed and when it ceased to apply — preserved because in
                 regulated domains a retired rule remains a historical fact"}
   {:term "Actor"
    :definition "An agent — human, system, or organisation — that performs
                 operations or bears obligations within the domain"}
   {:term "Operation"
    :definition "An action or process that changes domain state. Has actors,
                 inputs, outputs, preconditions, and postconditions."}
   {:term "Constraint"
    :definition "A rule governing the domain: obligation, prohibition, permission,
                 or recommendation. Carries strength and provenance."}
   {:term "Invariant"
    :definition "A condition that must hold at all times across the domain —
                 not just before or after operations, but always"}
   {:term "Lifecycle"
    :definition "The state machine of an entity: the states it can be in
                 and the transitions between them"}
   {:term "Inferred element"
    :definition "A concept, rule, or relationship that the domain implies
                 but no source explicitly states. Always marked :inferred true."}
   {:term "Provenance"
    :definition "The origin of a domain element: which source stated it,
                 under what authority, with what confidence"}]}
```

---

## Implementation notes for LLM processors

### Semantic extraction from natural language

Domain structure is encoded in language patterns. Recognise:

- **Hierarchies**: "types of X include…", "X is a kind of…", "X consists of…"
- **Definitions**: "X is defined as…", "X means…", "for the purposes of this…"
- **Relationships**: "X belongs to Y", "each X has one Y", "X produces Y"
- **Actors**: "X is responsible for…", "Y must…", "the [role] shall…"
- **Constraints**: `must`, `shall`, `required`, `prohibited`, `only if`, `unless`
- **Lifecycle signals**: "X can be active, suspended, or terminated"
- **Implicit rules**: consequence clauses, "therefore", "which means that"

```clojure
;; From: "A prescribing physician must verify the patient has no known allergies
;;        before issuing a controlled substance prescription."
;; Extract:
{:operation "issue-controlled-substance-prescription"
 :actors    ["prescribing-physician"]
 :preconditions ["patient.known-allergies verified by prescriber"]
 :constraint {:type :legal :strength :obligation
              :source "text" :applies-to ["prescribing-physician"]}}
```

### Depth management

Respect `:depth` strictly. At the depth boundary, mark the item with
`:more-available true` rather than truncating silently. Never recurse into
a concept at depth n+1 when the limit is n.

```clojure
;; At depth limit, mark rather than truncate:
{:concept "Carnivores" :parent "Mammals" :more-available true}
;; Not: {:concept "Carnivores" :children [{...}]}  ;; violates depth limit
```

### Source prioritisation

When `:sources [:authoritative :legal]` is specified, apply this priority
order: government/official bodies → legal statutes and case law → standards
organisations (ISO, W3C, RFC) → peer-reviewed academic → industry bodies →
practitioner guides → community documentation.

Mark each extracted element with its source type so the consumer can assess
epistemic weight.

### The inferred/stated distinction

This is the most important processing discipline in the domain grimoire.
*Never* promote an inferred element to stated fact. The markers `:inferred true`
and `:source` are not optional metadata — they are the epistemological
structure of the model. An extracted element without `:source` is incomplete.
An inferred element without `:inferred true` is a misrepresentation.

When `:infer [:implicit-rules]` is specified:
- Identify consequence chains: if A and B are stated, and A+B → C is a
  logical necessity, infer C and mark it inferred
- Identify gaps: concepts that are referenced but not defined; mark them as
  `:missing-concept true` rather than inventing definitions

### Conflict handling in `d/merge`

When sources disagree:
- Never silently resolve. Always produce a `:conflicts` key.
- Apply `:conflict-resolution` strategy to determine which position takes
  precedence, but always preserve all positions with attribution.
- With `:strategy :synthesise`, attempt reconciliation only when sources are
  addressing different aspects of the same concept. When they genuinely
  contradict each other, mark the conflict explicitly.

### Lifecycle reachability

When `:lifecycle` is defined or extracted, verify:
1. There is exactly one initial state (or mark if ambiguous)
2. Every non-initial state is reachable from the initial state through some
   chain of transitions
3. Terminal states are identified (states with no outgoing transitions)
4. Report unreachable states as warnings in `d/validate`

### Concept alignment in `d/merge`

When `:align-concepts true`, detect synonymy by:
- Exact string equivalence across languages (known translation pairs)
- Semantic similarity (same definition, different term)
- Structural equivalence (same attributes, same relationships, different name)

Never merge concepts on name similarity alone. "Customer" and "Customer
account" may be distinct entities. Alignment requires semantic justification.
The canonical term is the most authoritative or most precise — annotate the
reasoning for the choice.

### Confidence scoring

Every extracted element should carry a confidence estimate:
- `:high` — explicit statement in a primary authoritative source
- `:medium` — stated in a secondary source, or inferred from clear implication
- `:low` — inferred from indirect evidence, or stated in a low-authority source

The model's overall `:confidence` is the weighted mean of its elements.
`:completeness` is an estimate of how much of the domain has been captured,
expressed as a fraction 0.0–1.0.

### Bounded-context inference

When `:strategy :infer`, do not invent boundaries to be tidy. A bounded context
is justified by evidence: a term that demonstrably shifts meaning, a cluster
that changes together, a documented team seam. Report `:confidence :medium` or
lower for inferred contexts unless the linguistic evidence is unambiguous —
boundary inference is genuinely uncertain and the model should say so.

Never auto-resolve a shared term by merging. The default `:on-shared-term`
behaviour is `:flag`. A term appearing in two contexts is more often a
boundary marker than a synonym; merging it silently destroys the very
distinction the construct exists to surface. Only `:split` or `:alias` when
explicitly instructed, and always record what was done and why.

When `:strategy :declare`, validate rather than rewrite: report orphan entities
(assigned to no context), coverage gaps, and shared terms — but treat the
practitioner's `:contexts` map as authoritative. Declaration is an act of
architectural intent; the processor's job is to check it, not to second-guess it.

### Ubiquitous-language canonicalisation

`d/ubiquitous-language` decides usage; it does not merely observe it. This is
the opposite discipline from `d/extract :what :terminology`, which reports terms
as they appear. When canonicalising:
- A `:forbid` entry with a replacement (`"payout" "settlement"`) means: the
  banned term maps to the canonical one. A `:forbid` entry mapping to `nil`
  means: eliminate the term entirely, no replacement.
- Preserve every observed synonym under `:synonyms-seen` even after choosing a
  canonical term — the record of what people actually said is itself useful.
- Enforcement is per-surface and graduated. A surface listed in `:enforce-in`
  is `:strict`; a surface omitted is `:advisory`. Never report a single global
  enforcement level for a language that declares per-surface reach.
- On a multi-context domain, `:scope :per-context` is correct. If asked for
  `:scope :whole-domain` where bounded contexts exist, produce the whole-domain
  glossary but warn that cross-context homonyms have been collapsed.

### Evolution and the driver distinction

The `:driver` is the load-bearing field of `d/evolve`. It records whether a
change reflects the *domain* changing or our *understanding* of it changing —
an epistemic distinction as important here as the inferred/stated boundary is
in `d/explore`. Apply it strictly:
- `:regulation-change`, `:new-source`, `:scope-expansion` → the domain (or our
  view of it) genuinely moved; typically a minor or major version bump.
- `:practitioner-correction`, `:error-fix` → the domain did not change; we did.
  Typically a patch version bump. An `:error-fix` must never be presented as
  the domain having changed.

When `:on-removal :tombstone`, never delete the element's memory. Record
`:existed-until` and the reason. A retired regulation is still a historical
fact that downstream compliance tooling may need to assert ("this rule applied
until 2024-12-31"). `:discard` is the only mode that erases, and it should be
used only for genuine extraction noise, never for elements that were ever
believed to be real.

### Metadata richness

Every domain model must include:

```clojure
{:metadata {
   :analysed-at          "ISO-8601 timestamp"
   :sources-consulted    ["source-1" "source-2"]
   :concepts-extracted   n
   :inferred-elements    n
   :confidence           :high | :medium | :low
   :completeness         0.0-1.0
   :depth-achieved       n
   :language             :nl
   :conflicts-found      n
   :conflicts-resolved   n}}
```

Omitting metadata is not acceptable. An unattributed domain model is not a
domain model — it is an assertion without evidence.