# reasoning.md — Conjurer Reasoning Grimoire

The spellbook for inference. Every other grimoire operates on *what is* —
existing documents, existing data, existing code, existing workflows. The
`reasoning` grimoire operates on *what follows*: given these facts and these
rules, what must be true? Given this observation, what could explain it? Given
these claims, which are inconsistent? Given these constraints, what is possible?

Reasoning is the cognitive operation that connects knowledge to conclusion.
Without it, a system can know everything and infer nothing.

---

## Philosophy

### The gap between knowing and concluding

The existing grimoires give Conjurer remarkable epistemic reach. `domain`
extracts what a domain *is*. `semantics` analyses what a text *means*.
`data` validates what data *satisfies*. But none of these grimoires can
answer the next question: *given all of this, what follows?*

Consider: a domain model encodes that GDPR requires data minimisation. A
data schema describes which fields are collected. Neither grimoire alone can
answer: "Are we collecting more than GDPR permits?" That question requires
reasoning — the explicit derivation of a conclusion from the relationship
between two bodies of knowledge.

This gap exists everywhere consequential decisions are made. Does this
applicant meet the eligibility criteria? Do these symptoms point to a
diagnosis? Does this contract clause create the obligation the party believes
it does? Do these architectural choices satisfy the stated quality attributes?
In every case, someone must reason from facts and rules to conclusions. The
`reasoning` grimoire gives Conjurer the vocabulary to do this explicitly,
traceably, and honestly.

### Reasoning as relationship, not assertion

The fundamental character of reasoning is relational — it concerns the
*relationship between claims*, not the claims themselves in isolation. A
fact asserted is an assertion. A conclusion derived is a reasoning product.
The difference is provenance: a derived conclusion traces to the premises that
produced it, and that trace is the reasoning itself.

This has a critical design consequence. The `reasoning` grimoire is built
around chains of custody. Every conclusion must trace to its premises. Every
rule application must be explicit. Every inference must be distinguishable
from an assertion. A system that produces conclusions without traceable
derivation paths is not reasoning — it is asserting confidently, which is
a very different and much more dangerous thing.

### Three modes of inference

Classical logic distinguishes three forms of inference, each with different
epistemic force:

**Deductive** reasoning derives necessary conclusions: if the premises are
true, the conclusion *must* be true. A tax rule applied to an income bracket
produces a deductively derived tax liability. The conclusion is as certain as
the premises and the rule.

**Inductive** reasoning derives probable conclusions: a pattern observed in
many cases is generalised to a new case. The conclusion is probably true but
not necessarily so. Risk scoring from historical patterns is inductive; the
score is an estimate, not a certainty.

**Abductive** reasoning derives the *best explanation*: given an observation,
what hypothesis most plausibly accounts for it? Medical diagnosis is abductive;
so is debugging. The conclusion is a candidate explanation, not a proven fact.

The `reasoning` grimoire handles all three modes, always making the mode
explicit — because the epistemic status of a conclusion depends entirely on
which mode produced it.

### The boundary with other grimoires

**`semantics`** identifies argument *structure* — that a text contains a
claim, some premises, and an inference. `reasoning` evaluates argument
*validity* — whether the inference is actually warranted by the premises.

**`domain`** models what *exists* in a domain. `reasoning` derives what
*follows* from that existence — the implications, obligations, and constraints
that domain facts entail.

**`orchestrate`** coordinates *processes*. `reasoning` evaluates *decisions*
within processes — what branch should be taken given these conditions, what
rule applies given these facts.

**`data`** validates that data satisfies a schema. `reasoning` validates that
*claims about data* follow from the data's content.

---

## Naming rationale

**`reasoning`** — From Latin *ratio*, calculation, account, reason. The
deliberate choice of this plain, precise word over alternatives like `logic`
or `inference` reflects the grimoire's scope: not just formal logical systems
but the full range of structured, traceable thinking that moves from what
is known to what follows.

**`r/`** — The short namespace alias.

**`r/derive`** — From Latin *derivare*, to lead away from, to draw from a
source. The primary act: drawing conclusions from their sources.

**`r/model`** — A structured representation of what is known. Not a metaphor —
a model in the logician's sense: the facts, definitions, axioms, and constraints
that fix what is true within a frame of reasoning.

**`r/rules`** — Explicit conditional knowledge: if these conditions hold,
then this follows. The encoded knowledge that drives inference.

**`r/decide`** — Structured selection: given inputs, determine the applicable
conclusion through a declared decision model.

**`r/hypothesise`** — From Greek *hypotithenai*, to put under, to suppose.
Abductive generation of candidate explanations for observations.

**`r/analogise`** — From Greek *analogia*, proportion, correspondence. Reasoning
by correspondence between cases: this case stands to its conclusion as that
similar case stood to its known outcome.

**`r/check`** — Plain and deliberate: to check is to test a claim against what
is known, returning a verdict on whether it holds. The verification counterpart
to derivation's generation.

**`r/contradict`** — From Latin *contra* + *dicere*, to speak against. The
search for claims that speak against one another — that cannot all be true at once.

**`r/revise`** — From Latin *revisere*, to look at again. When a premise
changes, the conclusions that rested on it must be looked at again: revision is
the chain of custody run backward.

**`r/trace`** — The derivation chain made visible. Not the conclusion but
the path to it.

**`r/argue`** — From Latin *arguere*, to make clear, to prove. The construction
of a case for a position, addressed to a reader who may not yet be persuaded.

---

## Part I: Logical foundations

The foundation of reasoning is the explicit representation of what is known
and what rules govern inference from that knowledge.

---

### `r/model`

Constructs an explicit logical model — a named collection of facts, definitions,
axioms, and constraints that form the epistemic foundation for subsequent
reasoning.

#### Signature

```clojure
(r/model name
  :facts       [{:claim string :source string :confidence :high | :medium | :low} ...]
  :definitions {:term "definition" ...}
  :axioms      ["always-true statement" ...]
  :constraints ["must-hold condition" ...]
  :inherits    parent-model
  :active-in   :session | :block
  :manifest    model-binding)
```

#### Parameters

**`:facts`** — Contingent truths: things believed to be true based on evidence
or observation. Every fact carries a `:source` (where it came from) and a
`:confidence` level (how certain we are). Facts can be wrong; they are not
axioms.

**`:definitions`** — Conceptual definitions that fix the meaning of terms
within the model. Definitions are neither true nor false — they are
stipulations that make subsequent reasoning precise.

**`:axioms`** — Foundational truths accepted without proof within this model.
Used for established principles, legal presumptions, or scientific laws that
are treated as given.

**`:constraints`** — Conditions that must hold across the model. Any reasoning
that would violate a constraint is flagged as inconsistent with the model.

**`:inherits`** — Extends a parent model, adding or overriding specific
elements while inheriting the rest.

#### Design rationale

Reasoning without an explicit model is reasoning in the dark. `r/model` forces
the practitioner to articulate the epistemic foundation before drawing
conclusions from it. This discipline surfaces assumptions that would otherwise
remain invisible, enables sharing of reasoning foundations across invocations,
and makes the basis for every conclusion inspectable.

The distinction between facts and axioms is not merely philosophical — it is
operationally important. A fact can be challenged with new evidence; an axiom
cannot be challenged within the model (though the model itself can be
questioned). A patient's blood pressure reading is a fact; the principle that
correlation does not imply causation is an axiom.

#### Example 1: GDPR compliance model

```clojure
(r/model gdpr-compliance
  :facts [
    {:claim      "Organisation processes personal data of EU residents"
     :source     "Data mapping exercise 2025-Q3"
     :confidence :high}
    {:claim      "Organisation currently has no legal basis documented for newsletter emails"
     :source     "DPO audit finding 2025-08-14"
     :confidence :high}
    {:claim      "Retention period for transaction data is currently 10 years"
     :source     "Data retention policy v2.1"
     :confidence :high}]

  :definitions {
    "personal data"   "Any information relating to an identified or identifiable natural person (Art. 4(1) GDPR)"
    "processing"      "Any operation performed on personal data (Art. 4(2) GDPR)"
    "lawful basis"    "One of the six bases in Art. 6(1) GDPR that makes processing lawful"
    "retention period" "The period for which personal data is kept before erasure or anonymisation"}

  :axioms [
    "Processing of personal data is unlawful without a valid lawful basis (Art. 6(1) GDPR)"
    "Personal data must not be kept longer than necessary for its purpose (Art. 5(1)(e) GDPR)"
    "Data subjects have the right to erasure where data is no longer necessary (Art. 17 GDPR)"]

  :constraints [
    "Every processing activity must have exactly one identified lawful basis"
    "Retention periods must be justified against the stated processing purpose"]

  :active-in :session
  :manifest  gdpr-model)
```

#### Example 2: Eligibility model for an income-support benefit

```clojure
(r/model income-support-eligibility
  :definitions {
    "applicant"        "The person applying for the benefit"
    "residence-status" "The applicant's lawful right to reside in the jurisdiction"
    "asset-limit"      "The asset threshold above which the benefit is denied"}

  :axioms [
    "The Income Support Act governs entitlement to this benefit"
    "Entitlement requires: lawful residence + age 18-67 + assets below threshold + insufficient income"
    "A partner's income and assets are included in the assessment"]

  :facts [
    {:claim "Asset threshold 2025: 7,605 single / 15,210 per couple"
     :source "Income Support Act §34, as amended 2025"
     :confidence :high}]

  :constraints [
    "A person cannot simultaneously receive income support and unemployment insurance"
    "Self-employment income must be assessed over 3 months before granting the benefit"]

  :manifest eligibility-model)
```

---

### `r/rules`

Defines a named, reusable rule set — explicit if-then conditionals that encode
the inferential structure of a domain. Rules are the engine of systematic
reasoning.

#### Signature

```clojure
(r/rules name
  :rules [
    {:name       :rule-name
     :if         "condition in natural language or predicate"
     :then       "conclusion"
     :unless     "exception condition"
     :strength   :definitive | :presumptive | :defeasible
     :source     "origin of the rule"
     :priority   n}
    ...]
  :conflict-resolution :priority | :specificity | :recency
  :active-in   :scope
  :manifest    rule-set-binding)
```

#### Parameters

**`:strength`** — The logical force of the rule:
- `:definitive` — no exceptions; the conclusion always follows when conditions
  are met. Mathematical and physical laws.
- `:presumptive` — the conclusion follows unless rebutted; the burden of proof
  shifts. Legal presumptions work this way.
- `:defeasible` — the conclusion follows by default but can be overridden by
  more specific rules or additional evidence. Most business rules are defeasible.

**`:conflict-resolution`** — What to do when multiple rules apply and produce
different conclusions:
- `:priority` — higher-priority rules win
- `:specificity` — more specific rules win over more general ones
- `:recency` — most recently enacted rules win

**`:unless`** — An exception condition. When present, the rule does not fire
even if its `:if` condition is met, provided the `:unless` condition also holds.
This encodes defeasibility explicitly rather than requiring a separate override
rule.

#### Design rationale

`r/rules` separates the *encoding* of conditional knowledge from its
*application* (`r/derive`, `r/decide`), and the separation is deliberate: the
same rule set is applied in many derivations, audited independently of any one
conclusion, and versioned against the authority it derives from. A rule set is
a reusable artefact, not an inline conditional, which is why it carries a name,
a `:source` per rule, and its own conflict-resolution policy.

The load-bearing design decision is `:strength`, which refuses the fiction that
all rules are absolute. Real inferential knowledge ranges from the exceptionless
(a tax rate fixed by statute) through the rebuttable (a legal presumption that
shifts a burden) to the defeasible (a business default that a more specific rule
overrides). Collapsing these into "if-then" loses exactly the information a
reasoner needs to handle conflict and exception correctly: a `:definitive` rule
that conflicts with another signals a contradiction in the rule set, whereas a
`:defeasible` rule yielding to a `:specificity`-preferred one is normal
operation. By making strength explicit, the rule set tells `r/derive` how
seriously to take each inference and how to resolve clashes — and `:unless` lets
defeasibility be written where the rule is, rather than scattered across
override rules that must be read together to be understood.

#### Example 1: VAT rules

```clojure
(r/rules vat-classification
  :rules [
    {:name     :standard-rate
     :if       "supply of goods or services within the domestic territory"
     :then     "VAT rate is the standard rate (21%)"
     :strength :definitive
     :source   "VAT Act §9"
     :priority 10}

    {:name     :reduced-rate-food
     :if       "supply is food or non-alcoholic beverage for human consumption"
     :then     "VAT rate is the reduced rate (9%)"
     :unless   "supply is a restaurant or catering service"
     :strength :definitive
     :source   "VAT Act Schedule I item a.1"
     :priority 20}

    {:name     :zero-rate-export
     :if       "supply is an export to a country outside the customs union"
     :then     "VAT rate is 0%"
     :strength :definitive
     :source   "VAT Act §9(2)(b)"
     :priority 30}

    {:name     :exempt-healthcare
     :if       "supply is a medical or healthcare service by a licensed provider"
     :then     "supply is VAT exempt"
     :strength :definitive
     :source   "VAT Act §11(1)(g)"
     :priority 30}]

  :conflict-resolution :priority
  :manifest vat-rules)
;; ✓ :reduced-rate-food carries an :unless clause rather than a separate
;;   override rule: catering is the standing exception to the food reduced rate,
;;   and encoding it inline keeps the exception attached to the rule it defeats.
;; ✓ All four rules are :definitive (statute admits no discretion), but they
;;   still conflict — food (9%) vs catering (21%) vs healthcare (exempt) can all
;;   match one supply — so :conflict-resolution :priority is required to decide.
```

#### Example 2: Credit decision rules

```clojure
(r/rules credit-decision
  :rules [
    {:name     :automatic-decline-recent-default
     :if       "applicant has payment default within past 24 months"
     :then     "application is declined"
     :strength :definitive
     :priority 100}

    {:name     :automatic-approve-low-risk
     :if       "credit score > 750 AND requested amount < 3× monthly income AND debt-to-income < 0.30"
     :then     "application is approved at standard rate"
     :strength :definitive
     :priority 50}

    {:name     :refer-to-underwriter
     :if       "credit score between 650 and 750 OR debt-to-income between 0.30 and 0.40"
     :then     "application is referred to underwriter review"
     :strength :definitive
     :priority 40}

    {:name     :decline-insufficient-income
     :if       "monthly income < requested monthly repayment × 1.5"
     :then     "application is declined for affordability"
     :strength :definitive
     :priority 80}]

  :conflict-resolution :priority
  :manifest credit-rules)
```

---

## Part II: Core inference

---

### `r/derive`

The primary inference operation. Given a set of facts and a rule set, derives
the conclusions that necessarily, probably, or plausibly follow — with a
complete derivation chain.

#### Signature

```clojure
(r/derive conclusions
  :from      facts-or-model
  :using     rules-or-rule-set
  :mode      :deductive | :inductive | :abductive | :mixed
  :depth     n
  :threshold confidence-threshold
  :explain   boolean
  :surface   [:conclusions :derivation-chain :open-questions :underdetermined]
  :manifest  derivation-result)
```

#### Parameters

**`:depth`** — How many inferential steps to follow from the initial facts.
Depth 1 applies rules directly to the given facts. Depth 2 also applies rules
to the first-order conclusions. Depth 3 continues. Deep derivation chains
reveal non-obvious implications but also accumulate uncertainty.

**`:threshold`** — Minimum confidence for a conclusion to be included in the
output. Lower thresholds produce more speculative conclusions; higher thresholds
produce sparser but more reliable ones.

**`:surface [:underdetermined]`** — Surface conclusions where the available
facts and rules are insufficient to determine the answer — questions that could
be resolved with additional information. These are as valuable as the derived
conclusions: they reveal what the practitioner needs to find out.

#### Design rationale

`r/derive` is the engine that makes `r/rules` and `r/model` useful. Rules and
facts without inference are merely a database. Inference turns them into a
reasoning system.

The explicit `:mode` parameter is not merely taxonomic — it changes how
conclusions should be interpreted. A deductive conclusion inherits the
certainty of its premises. An inductive conclusion is a generalisation that
new evidence could overturn. An abductive conclusion is a candidate
explanation that competes with others. Without knowing the mode, a conclusion
cannot be correctly used.

The `:explain true` parameter is non-negotiable for high-stakes domains.
A compliance conclusion without its derivation chain cannot be audited. A
credit decision without its reasoning cannot be challenged by the applicant.
In any context where the conclusion matters, the chain matters equally.

#### Example 1: GDPR compliance derivation

```clojure
(r/derive "What GDPR obligations apply to our newsletter processing?"
  :from    gdpr-compliance-model
  :using   (r/rules gdpr-obligations
             :rules [
               {:name :no-lawful-basis-unlawful
                :if   "processing activity has no documented lawful basis"
                :then "processing is unlawful under Art. 6(1) GDPR"
                :strength :definitive}
               {:name :consent-for-marketing
                :if   "processing purpose is direct marketing to individuals"
                :then "appropriate lawful basis is consent (Art. 6(1)(a)) or legitimate interest (Art. 6(1)(f)) subject to balancing test"
                :strength :presumptive}])
  :mode    :deductive
  :depth   2
  :explain true
  :surface [:conclusions :derivation-chain :open-questions])

;; Returns:
{:conclusions [
   {:conclusion  "Newsletter email processing is currently unlawful"
    :confidence  :high
    :strength    :definitive
    :derivation  [
      "Fact: No lawful basis documented for newsletter emails [DPO audit 2025-08-14]"
      "Axiom: Processing without lawful basis is unlawful (Art. 6(1) GDPR)"
      "Rule: no-lawful-basis-unlawful fires"
      "→ Conclusion: newsletter processing is unlawful"]}

   {:conclusion  "To lawfully continue, organisation must establish either consent or legitimate interest basis"
    :confidence  :high
    :strength    :presumptive
    :derivation  [
      "Fact: purpose is direct marketing to individuals [inferred from newsletter nature]"
      "Rule: consent-for-marketing fires"
      "→ Conclusion: consent or legitimate interest required"
      "Note: legitimate interest requires balancing test — not automatic"]}]

 :open-questions [
   "Has a legitimate interest assessment been conducted for newsletter processing?"
   "Are newsletter recipients able to withdraw consent / object? Is the mechanism documented?"
   "What is the legal basis for retaining historical newsletter engagement data?"]

 :underdetermined [
   {:question    "Is legitimate interest available as a basis?"
    :missing-fact "Result of legitimate interest balancing test"
    :impact      "Determines whether consent collection is required or LI basis can be relied upon"}]}
;; ✓ The two conclusions carry different :strength even at the same :high
;;   confidence: the first is :definitive (no-lawful-basis-unlawful admits no
;;   exception), the second :presumptive (the marketing-basis rule shifts a
;;   burden but a balancing test could rebut it). Strength and confidence are
;;   tracked separately — how certain we are of the facts vs. how forceful the
;;   rule is — and collapsing them would misrepresent the second conclusion.
;; ✓ :underdetermined is distinct from :open-questions: an open question is
;;   worth investigating; an underdetermined item names the *specific* missing
;;   fact and the conclusion it gates. The LI balancing test is not curiosity —
;;   it is the hinge the whole consent-vs-LI path turns on.
```

#### Example 2: Eligibility determination

```clojure
(r/derive "Is this applicant eligible for income support?"
  :from {:applicant {:age 34
                     :residence-status :permanent-resident
                     :monthly-income   0
                     :assets           4200
                     :partner          nil}}
  :using eligibility-model
  :mode  :deductive
  :depth 1
  :explain true)

;; Returns:
{:conclusions [
   {:conclusion "Applicant meets the eligibility conditions for income support"
    :confidence :high
    :derivation [
      "Condition 1: Age 18-67 → age 34 ✓"
      "Condition 2: Lawful residence → permanent resident ✓"
      "Condition 3: Assets below threshold → 4,200 < 7,605 (single) ✓"
      "Condition 4: Insufficient income → monthly income 0 ✓"
      "Condition 5: No partner → single threshold applies ✓"
      "→ All eligibility conditions met"]}]

 :open-questions [
   "Has the applicant been self-employed in the past 6 months? (3-month income assessment may apply)"
   "Has the applicant received unemployment insurance in the past 12 months? (Cannot combine with income support)"]}
;; ✓ The derivation is condition-by-condition, each citing the model element it
;;   tests — a deductive conclusion that can be audited line by line, not a bare
;;   "eligible: yes".
;; ✓ The conclusion is :high confidence, yet the derivation still surfaces two
;;   :open-questions. These are not doubts about the conclusion as derived; they
;;   are facts not in evidence that could change it — the self-employment and
;;   benefit-overlap rules in the model fire on facts the input did not supply.
;;   Surfacing them is the difference between "eligible on what you told me" and
;;   "eligible, full stop".
```

---

### `r/decide`

Evaluates a structured decision model — decision table, decision tree, or
scoring model — against a set of inputs, producing the applicable conclusion
and the path through the decision structure that reached it.

#### Signature

```clojure
(r/decide decision-model
  :given   input-map
  :model   :decision-table | :decision-tree | :scoring-model | :rule-set
  :from-candidates [candidate-id ...]   ;; optional: the f/candidate ids this decision evaluates
  :explain boolean
  :surface [:decision :path :alternatives :sensitivity]
  :manifest decision-result)
```

#### Parameters

**`:from-candidates`** — Optional. When a decision evaluates a set of matured
`f/candidate`s from the `foresight` grimoire, name their ids here. This closes the
deliberation loop: the decision records which backlog it grew from, so each
candidate's graded history (its original scores, its dated reassessments)
connects forward to the decision that resolved it — the mirror of `f/hoist`'s
`:into`, which connects the candidate forward to its outcome. Purely a
traceability link; it does not change how the decision is evaluated.

**`:surface [:alternatives]`** — Show which other decision branches were
considered but not taken. Useful for understanding how close the decision
was to a different outcome.

**`:surface [:sensitivity]`** — Show which inputs, if changed, would produce
a different decision. "If credit score had been 755 instead of 745, the
outcome would have been automatic approval." Essential for fairness auditing
and applicant communication.

#### Design rationale

`r/decide` is distinguished from `r/derive` by what it produces and why.
`r/derive` answers an open question — "what follows?" — and may return several
conclusions, open questions, and underdetermined items. `r/decide` evaluates a
*structured decision model* against inputs to reach a *single applicable
outcome*, and its job is to make that outcome's path auditable. The difference
matters operationally: a decision is something acted upon and often something an
affected person can contest, so the construct's value is concentrated in the
`:path` and `:sensitivity` it exposes, not merely in the verdict.

The `:sensitivity` surface is the construct's most consequential feature and the
reason it is more than a rule-runner. A decision that affects a person owes that
person not just the outcome but how close it was and on which input it turned —
"approved" and "approved, but a single point lower on one input would have
declined you" are different facts, and only the second supports a meaningful
appeal or a fairness audit. By computing the minimum change to each input that
would flip the outcome, `r/decide` turns an opaque verdict into an explainable
one. This is the same chain-of-custody discipline the grimoire applies to
derivation, carried into the place where it matters most legally: the decision
that lands on someone.

#### Example: Credit application decision

```clojure
(r/decide credit-rules
  :given   {:credit-score         720
            :monthly-income       4500
            :requested-amount     18000
            :debt-to-income       0.28
            :recent-default       false
            :requested-monthly-repayment 340}
  :model   :rule-set
  :explain true
  :surface [:decision :path :sensitivity])

;; Returns:
{:decision    :refer-to-underwriter
 :confidence  :high
 :path [
   {:rule     :automatic-decline-recent-default
    :fired    false
    :reason   "No recent default — rule does not apply"}
   {:rule     :automatic-approve-low-risk
    :fired    false
    :reason   "Credit score 720 < 750 threshold — auto-approve conditions not met"}
   {:rule     :refer-to-underwriter
    :fired    true
    :reason   "Credit score 720 is in range 650-750 — referral triggered"}]

 :sensitivity [
   {:input     :credit-score
    :change    "Increase to 751+"
    :effect    "Decision changes to :automatic-approve at standard rate"}
   {:input     :debt-to-income
    :change    "Increase to 0.31+"
    :effect    "Referral condition would still hold; no decision change at this threshold"}]}
;; ✓ The :path shows every rule and whether it fired, with the reason — so the
;;   referral is explained by what did NOT trigger (score below the auto-approve
;;   threshold) as much as by what did. A bare ":refer-to-underwriter" hides the
;;   near-miss; the path reveals the applicant was 6 points from auto-approval.
;; ✓ :sensitivity names the minimum change that flips the outcome (score → 751).
;;   This is what an applicant is owed and a fairness audit requires: not just
;;   the decision, but how close it was and on which input it turned.
```

---

### `r/hypothesise`

Abductive reasoning: given an observation or set of observations, generates
candidate explanations ranked by plausibility. Each hypothesis is a coherent
account of what *could* have produced the observed facts.

#### Signature

```clojure
(r/hypothesise observation
  :from           facts-or-model
  :using          domain-knowledge
  :candidates     n
  :rank-by        :plausibility | :simplicity | :explanatory-power | :testability
  :must-explain   [:observation ...]
  :may-not-assume [:excluded-hypothesis ...]
  :output         :ranked-hypotheses
  :manifest       hypotheses-binding)
```

#### Parameters

**`:rank-by`** — The criterion for ordering candidate hypotheses:
- `:plausibility` — most consistent with prior probability and background knowledge
- `:simplicity` — fewest unexplained residuals; Occam's razor
- `:explanatory-power` — accounts for the most observations including peripheral ones
- `:testability` — most amenable to empirical verification or refutation

**`:may-not-assume`** — Hypotheses to exclude from consideration. Useful
when some candidate explanations have already been ruled out by prior
investigation.

#### Design rationale

Abductive reasoning is the form of inference most common in diagnostic,
investigative, and scientific contexts — yet it is the least formalised. A
doctor doesn't derive a diagnosis; they hypothesise the most plausible one.
An engineer doesn't prove a bug's cause; they hypothesise the most likely one.
`r/hypothesise` makes this reasoning explicit, structured, and transparent.

#### Example 1: Incident investigation

```clojure
(r/hypothesise "API error rate increased from 0.1% to 12% at 14:23 UTC"
  :from   {:observations [
             "Error rate spike at 14:23 UTC"
             "Spike is on POST /payments endpoint specifically"
             "GET endpoints unaffected"
             "Database query latency unchanged"
             "Deployment occurred at 14:20 UTC"
             "Error type: NullPointerException in PaymentProcessor.validate()"]}
  :rank-by    :plausibility
  :candidates 3
  :manifest   incident-hypotheses)

;; Returns:
{:hypotheses [
   {:rank        1
    :hypothesis  "The 14:20 deployment introduced a null-handling regression in PaymentProcessor.validate()"
    :plausibility :high
    :evidence-for ["Deployment immediately precedes spike"
                   "Error type points to specific code path"
                   "Scope limited to POST — consistent with write-path code change"]
    :evidence-against ["Deployment was to payment-service v2.3.1, described as a config change only"]
    :testable-via "Review diff of PaymentProcessor.validate() between v2.3.0 and v2.3.1"
    :if-correct  "Rolling back to v2.3.0 should resolve the issue"}

   {:rank        2
    :hypothesis  "A downstream dependency (payment gateway) changed its response format, causing NullPointerException when parsing the new format"
    :plausibility :medium
    :evidence-for ["NullPointerException consistent with unexpected null in parsed response"
                   "External services do change APIs"]
    :evidence-against ["No corresponding gateway incident report"
                       "Timing correlation with deployment is coincidental on this hypothesis"]
    :testable-via "Check payment gateway changelog and compare response format with code expectations"}

   {:rank        3
    :hypothesis  "A subset of payment request payloads is missing a required field, triggering the null exception"
    :plausibility :low
    :evidence-for ["NullPointerException is consistent with missing field"]
    :evidence-against ["Error rate jumped sharply rather than gradually — suggests code change, not data change"
                       "Would expect errors to cluster on specific customers, not uniformly"]
    :testable-via "Sample erroring requests and check for structural differences"}]}
;; ✓ Every hypothesis carries :evidence-against as well as :evidence-for — even
;;   the rank-1 explanation lists the fact that cuts against it (the deploy was
;;   described as config-only). Abduction that reports only confirming evidence
;;   is how investigations anchor on a wrong first guess; surfacing the
;;   disconfirming evidence keeps the ranking honest.
;; ✓ Each hypothesis is paired with how to test it (:testable-via), so the
;;   output is an investigation plan, not a verdict. The rank orders where to
;;   look first; it does not claim to have found the cause.
```

#### Example 2: Diagnostic reasoning

```clojure
(r/hypothesise "Patient presents with fatigue, weight gain, cold intolerance, and constipation"
  :from   {:symptoms  ["fatigue" "weight-gain" "cold-intolerance" "constipation"]
           :patient   {:age 42 :sex :female :family-history [:thyroid-disease]}
           :labs      {:tsh 8.2 :free-t4 0.7}}
  :using  clinical-endocrine-knowledge
  :rank-by :explanatory-power
  :candidates 3)

;; Returns ranked differential diagnoses with explanatory coverage
;; and recommended confirmatory investigations for each
```

---

### `r/analogise`

Analogical reasoning: given a new case and a body of prior cases, finds the
precedents most structurally similar to the new case and derives the conclusion
their similarity supports — together with the points of difference that might
defeat the analogy. The reasoning of precedent, differential diagnosis, and
"we've seen this before."

#### Signature

```clojure
(r/analogise target-case
  :against     [prior-case ...] | case-base
  :similarity  [:dimension ...]          ;; which features make cases comparable
  :weight      {:dimension importance}    ;; relative weight of each dimension
  :infer       :outcome | :treatment | :classification
  :surface     [:nearest-cases :shared-features :distinguishing-features :confidence]
  :min-similarity threshold
  :manifest    analogy-binding)
```

#### Parameters

**`:target-case`** — The new case to reason about, described by the same
features the prior cases are described by. Analogy needs commensurability: the
target and the precedents must be expressible in shared dimensions.

**`:against`** — The precedents: an explicit list of prior cases, or a
`case-base` (a maintained collection). Each prior case carries its features
*and its known outcome* — the outcome is what the analogy transfers to the
target.

**`:similarity`** — Which dimensions make two cases comparable. This is the
crux of analogical reasoning: cases are never identical, so the practitioner
must declare which features matter for the inference. Two contracts are
analogous *on the dimension of indemnity structure* even if they differ in
parties, value, and date.

**`:weight`** — The relative importance of each similarity dimension. Not all
shared features count equally: in legal precedent, similarity on the *material
facts* outweighs similarity on incidental ones. Weighting is what prevents a
superficially-similar but materially-different case from dominating.

**`:surface [:distinguishing-features]`** — The points where the target differs
from its nearest precedents. In analogical reasoning these are as important as
the similarities: a *distinguishing* feature is exactly what an adversary uses
to argue the precedent does not apply ("that case turned on a fact absent
here"). Surfacing them is what makes the analogy defeasible and honest.

#### Design rationale

`r/analogise` fills a genuine gap in the grimoire's account of inference. The
philosophy names three modes — deductive, inductive, abductive — but analogical
reasoning fits none of them cleanly: it does not derive necessarily from rules
(deduction), generalise from a population (induction), or explain an observation
(abduction). It reasons *case-to-case*, transferring a conclusion from a similar
prior situation to the present one. And it is not a marginal mode: it is the
dominant form of reasoning in common-law adjudication (precedent), in clinical
medicine (this presentation resembles cases that turned out to be X), and in
engineering (this failure looks like the incident we had last year). A reasoning
grimoire that targets legal and clinical domains, as this one explicitly does,
is incomplete without it.

The construct's design centres on the truth that **analogies are defeated by
differences, not confirmed by similarities**. A naive case-matcher returns the
nearest neighbour and stops; real analogical reasoning asks whether the
*differences* between the target and the precedent are material enough to break
the inference. This is why `:distinguishing-features` is a first-class output
and why `:weight` exists: the strength of an analogy is not how many features
match but whether the features that matter match and the features that differ
are immaterial. A precedent that agrees on incidentals and differs on the
material fact is not support — it is a distinguishable case, and the construct
must say so.

`r/analogise` pairs naturally with `r/hypothesise`: abduction generates
candidate explanations from scratch, analogy retrieves them from experience, and
the two are complementary routes to the same kind of provisional, defeasible
conclusion. It also feeds `r/argue`: an argument from precedent is an analogy
made persuasive, with the distinguishing features pre-empted as rebuttals.

#### Example 1: Reasoning from contract precedent

```clojure
(r/analogise
  {:case "Vendor SaaS agreement under review"
   :features {:indemnity-cap :uncapped
              :data-processing :vendor-as-processor
              :termination-notice "30 days"
              :liability-carve-outs [:data-breach :ip-infringement]
              :governing-law :domestic}}
  :against    contract-precedent-base
  :similarity [:indemnity-cap :liability-carve-outs :data-processing]
  :weight     {:indemnity-cap 0.5 :liability-carve-outs 0.3 :data-processing 0.2}
  :infer      :outcome
  :surface    [:nearest-cases :shared-features :distinguishing-features :confidence]
  :manifest   contract-analogy)

;; Returns:
{:nearest-cases [
   {:case "Precedent A — 2023 vendor agreement, renegotiated"
    :similarity 0.88
    :shared-features ["uncapped indemnity" "data-breach carve-out" "vendor-as-processor"]
    :outcome "Uncapped indemnity was renegotiated to 12× annual fees after legal review
              flagged unbounded exposure"
    :distinguishing-features ["Precedent A had a mutual cap; target's is one-directional"]
    :weight-on-material-dimension :high}
   {:case "Precedent B — 2024 agreement, signed as-is"
    :similarity 0.71
    :shared-features ["vendor-as-processor" "30-day termination"]
    :outcome "Signed without indemnity change"
    :distinguishing-features ["Precedent B had a CAPPED indemnity — differs on the
                               highest-weighted dimension, so its outcome transfers weakly"]
    :weight-on-material-dimension :low}]
 :inferred-outcome {
   :conclusion "The uncapped indemnity should be renegotiated, following Precedent A"
   :confidence :medium-high
   :basis "Target matches Precedent A on the highest-weighted dimension (indemnity-cap)
           and shares the data-breach carve-out; Precedent B's contrary outcome is
           discounted because it differs precisely on that dimension"}}
;; ✓ Precedent B is MORE recent and shares features, but the analogy discounts it
;;   because it differs on the highest-weighted dimension (it was capped). This is
;;   the whole discipline: the analogy is governed by similarity on what matters
;;   (:weight), not by raw feature overlap or recency.
;; ✓ :distinguishing-features is populated for every nearest case — the inference
;;   carries its own defeaters, so a reviewer can see exactly what would break each
;;   analogy rather than trusting a bare similarity score.
```

#### Example 2: Differential diagnosis by case similarity

```clojure
(r/analogise
  {:case "Current patient presentation"
   :features {:symptoms [:fatigue :joint-pain :photosensitive-rash]
              :age 29 :sex :female
              :labs {:ana :positive :anti-dsdna :elevated}}}
  :against    clinical-case-base
  :similarity [:symptoms :labs]
  :weight     {:labs 0.6 :symptoms 0.4}   ;; serology weighted above symptom overlap
  :infer      :classification
  :surface    [:nearest-cases :distinguishing-features :confidence]
  :min-similarity 0.5
  :manifest   differential)

;; Returns nearest prior cases ranked by weighted similarity, the classification
;; their outcomes support, and — crucially — the features of the current case that
;; distinguish it from each precedent and might point elsewhere.
;; ✓ :min-similarity 0.5 suppresses cases too dissimilar to inform the inference,
;;   rather than padding the ranking with weak matches. Analogy from a remote case
;;   is worse than no analogy — it manufactures false confidence.
```

#### Usage patterns

```clojure
;; Analogy as the retrieval half, abduction as the generation half
(~> incident-observations
  (r/analogise :against past-incident-base :similarity [:symptom-pattern :affected-component]
               :infer :outcome)
  (r/hypothesise :using domain-knowledge))   ;; generate fresh hypotheses the case base lacks

;; Turn a precedent analogy into a persuasive argument, distinguishing features as rebuttals
(~> (r/analogise target-case :against precedent-base :surface [:distinguishing-features])
  (r/argue :format :legal-brief :qualifier :presumptively))
```

---

## Part III: Verification

---

### `r/check`

Verifies logical relationships between claims: does this conclusion follow
from these premises? Are these claims consistent with each other? Does this
claim contradict established facts in the model?

#### Signature

```clojure
(r/check target
  :against    facts-model-or-claims
  :for        :entailment | :consistency | :contradiction | :independence
  :using      rules-or-axioms
  :explain    boolean
  :output     :check-result
  :manifest   check-binding)
```

#### Parameters

**`:for`** — What relationship to verify:
- `:entailment` — does the target *follow* from the given facts/rules?
- `:consistency` — is the target *compatible* with the given facts/rules?
- `:contradiction` — does the target *conflict* with the given facts/rules?
- `:independence` — is the target *neither entailed nor contradicted* by the given facts?

#### Design rationale

`r/check` is the verification counterpart to `r/derive`'s generation: where
`r/derive` produces conclusions, `r/check` interrogates a conclusion someone
already holds. The distinction matters because the two failure modes are
different. A derivation can fail by reaching a wrong conclusion; a check fails
by accepting a claim that does not actually follow — and in audit, compliance,
and review contexts, the claim is usually already asserted and the question is
whether it survives scrutiny.

The four `:for` relationships exist because "is this claim OK?" is ambiguous in
a way that causes real errors. Entailment (does it *follow*?) is a far stronger
demand than consistency (is it *compatible*?), and conflating them is how an
organisation convinces itself that "our processing is lawful" is established
when the premises merely fail to contradict it. `:independence` is the subtlest
and most useful for catching overreach: a claim that is neither entailed nor
contradicted by the model is one the model simply cannot speak to — and saying
so is more honest than forcing a verdict. By making the practitioner name which
relationship they are checking, the construct prevents the silent slide from
"not contradicted" to "proven".

#### Example 1: Policy consistency check

```clojure
(r/check "Our 10-year transaction data retention is proportionate"
  :against gdpr-compliance-model
  :for     :consistency
  :using   (r/rules proportionality
             :rules [{:name :storage-limitation
                      :if   "retention period exceeds what is necessary for the stated purpose"
                      :then "retention violates storage limitation principle (Art. 5(1)(e))"
                      :strength :definitive}])
  :explain true
  :manifest retention-check)

;; Returns:
{:verdict  :check-fails
 :finding  "Claim is not consistent with GDPR storage limitation principle"
 :reasoning [
   "GDPR Art. 5(1)(e) requires data be kept no longer than necessary for the purpose"
   "Transaction data purpose: fraud prevention and accounting"
   "Fraud prevention: typically 3-5 years per industry practice"
   "Accounting: 7 years under applicable commercial-law bookkeeping requirements"
   "10 years exceeds the maximum justified by either purpose"
   "→ Retention period is not consistent with proportionality requirement"]
 :implication "Retention policy must be reduced to ≤7 years or purpose must be re-specified with justification"}
;; ✓ :for :consistency was the right relationship to test: the claim asserts
;;   proportionality, and the check shows the claim is *incompatible* with the
;;   storage-limitation rule — stronger and more useful than merely failing to
;;   entail it. The reasoning bounds the claim against each stated purpose and
;;   shows 10 years exceeds both, so the verdict is grounded, not asserted.
```

#### Example 2: Argument validity check

```clojure
(r/check "Therefore, all our processing is lawful"
  :against {:premises [
             "We have documented consent for newsletter processing"
             "We have documented legitimate interest for analytics"]}
  :for     :entailment
  :explain true
  :manifest lawfulness-check)

;; Returns:
{:verdict   :entailment-fails
 :finding   "Conclusion does not follow from the premises"
 :gap       "Premises establish lawful basis for two specific activities.
             Conclusion claims lawfulness of all processing.
             Processing activities not addressed: HR data, supplier data,
             customer support records, CCTV, website cookies."
 :repair    "Either enumerate all processing activities and confirm basis for each,
             or qualify the conclusion to match the scope of the premises"}
```

---

### `r/contradict`

Actively searches a set of claims or a belief model for internal
contradictions — pairs or groups of claims that cannot all be true simultaneously.

#### Signature

```clojure
(r/contradict belief-set
  :using   rules-or-axioms
  :severity :all | :significant-only
  :explain boolean
  :output  :contradiction-report
  :manifest contradiction-binding)
```

#### Parameters

**`:belief-set`** — The body of claims to audit: a list of assertions, a policy
document's claims, or an accumulated `r/model`. The construct searches *within*
this set for joint impossibility; it does not test against an external standard
(that is `r/check`).

**`:using`** — The rule set that supplies the inferential bridges. Most
contradictions are not word-for-word negations; they emerge only when a rule
connects two independently-plausible claims. Without rules, `r/contradict`
catches only direct contradictions.

**`:severity`** — `:all` reports every contradiction found, including peripheral
ones; `:significant-only` reports just those that affect a derived conclusion or
compliance claim. Use `:significant-only` when auditing a large model where
minor peripheral inconsistencies would drown the findings that matter.

#### Design rationale

`r/contradict` differs from `r/check :for :contradiction` in direction and
intent. `r/check` tests a *specific* claim against a model; `r/contradict`
*searches* a whole belief set for pairs or groups that cannot all be true,
without being told where to look. It is the construct for auditing a body of
claims — a policy document, a set of filings, an accumulated model — for latent
inconsistency that no one asserted but everyone is relying on.

The design reflects that contradictions are rarely surface-level. Two claims
seldom contradict word-for-word; they contradict *given a rule* — "this service
is exempt" and "all our food services are reduced-rate" only conflict once the
rule that catering is excluded from the food rate is brought to bear. That is
why `:using` takes a rule set: the construct needs the inferential bridge to see
that two independently-plausible claims are jointly impossible. A contradiction
finder without rules catches only direct negations; with rules it catches the
inconsistencies that actually cause trouble.

#### Example

```clojure
(r/contradict policy-document-claims
  :using   vat-rules
  :explain true
  :manifest vat-contradictions)

;; Returns:
{:contradictions [
   {:claims [
     "Our catering service is VAT exempt"
     "All our food services qualify for the 9% reduced rate"]
    :contradiction "Catering and restaurant services are explicitly excluded from the
                    food reduced-rate provision (VAT Act Schedule I). The first
                    claim (VAT exempt) and the second (9% reduced rate) cannot
                    both be correct. Catering is standard-rated at 21%."
    :severity :significant
    :resolution "Catering services should be classified at the 21% standard rate.
                 Verify whether any exemption claim has been relied upon in past filings."}]}
;; ✓ Neither claim is false on its face, and they do not contradict word-for-word
;;   — they are jointly impossible only once vat-rules supplies the bridging fact
;;   that catering is excluded from the food rate. This is why :using takes a
;;   rule set: the contradiction lives in the inference, not the surface text.
```

---

### `r/revise`

Belief revision: given a model and a change to its facts — a premise retracted,
corrected, or newly added — determines which previously-derived conclusions
still hold, which must be withdrawn, and which newly follow. The chain of
custody run backward: if conclusions trace to premises, then changing a premise
must propagate to its conclusions.

#### Signature

```clojure
(r/revise model
  :change    {:retract [fact ...] :add [fact ...] :correct {fact new-value}}
  :using     rules-or-rule-set
  :affected  derivation-result        ;; prior conclusions to re-evaluate
  :surface   [:withdrawn :still-holds :newly-follows :now-undetermined]
  :explain   boolean
  :manifest  revised-model)
```

#### Parameters

**`:change`** — The revision to apply:
- `:retract` — remove a fact now believed false or unsupported
- `:add` — introduce a newly-established fact
- `:correct` — replace a fact's value (a retract-and-add in one step, preserving
  the fact's identity and provenance)

**`:affected`** — The prior derivation whose conclusions must be re-evaluated
against the changed model. Supplying it lets `r/revise` report precisely which
existing conclusions the change touches, rather than re-deriving from scratch.

**`:surface`** — The four outcomes of a revision, which are the whole point:
- `:withdrawn` — conclusions that depended on a retracted/corrected fact and no
  longer hold
- `:still-holds` — conclusions with independent support that survive the change
- `:newly-follows` — conclusions the added/corrected fact now makes derivable
- `:now-undetermined` — conclusions that were settled but the change has reopened

#### Design rationale

`r/revise` is the exact inverse of the grimoire's founding principle, and that
is why it belongs here. The whole grimoire insists that every conclusion trace
to its premises through an explicit chain of custody. But a chain of custody is
not only for *building* conclusions — it is what makes it possible to *unbuild*
them safely. If a fact turns out false, the question "what did we conclude that
now falls?" is answerable *only* because the derivations recorded what they
depended on. `r/revise` cashes in the provenance the rest of the grimoire so
carefully maintains. Without it, the chain of custody is write-only — diligently
recorded and never used for the one thing it uniquely enables.

The discipline the construct enforces is that **retraction must propagate, and
propagation is rarely total**. The naive response to a falsified premise is to
discard everything downstream; the correct response is to ask, conclusion by
conclusion, whether *this* conclusion had independent support. A compliance
finding derived from three facts does not collapse because one was corrected if
the other two still entail it. Surfacing `:still-holds` separately from
`:withdrawn` is what distinguishes belief revision from panic: the model gives
up exactly the conclusions that lost their support and no more.

`:now-undetermined` is the subtlest and most valuable outcome. A change does
not only add and remove conclusions; it can return a settled question to open.
A retracted fact that had foreclosed an alternative may reopen it — and a system
that reported only withdrawals would leave the practitioner believing a question
was still answered when it has in fact become live again. This is the truth-
maintenance discipline that mature reasoning systems require and that ad-hoc
re-derivation silently gets wrong.

#### Example: A corrected fact propagates through a compliance model

```clojure
;; The earlier GDPR derivation concluded newsletter processing was unlawful.
;; A late finding: a legitimate-interest assessment DID exist, just unfiled.
(r/revise gdpr-compliance-model
  :change   {:correct {"Organisation has no legal basis documented for newsletter emails"
                       "Organisation has a legitimate-interest assessment for newsletter
                        emails, completed 2025-06-01 but not previously located"}}
  :using    gdpr-obligations
  :affected gdpr-derivation        ;; the prior r/derive result
  :surface  [:withdrawn :still-holds :newly-follows :now-undetermined]
  :explain  true
  :manifest gdpr-revised)

;; Returns:
{:change-applied {:type :correct :fact "newsletter lawful basis"}
 :withdrawn [
   {:conclusion "Newsletter email processing is currently unlawful"
    :why "Depended on the now-corrected fact that no lawful basis was documented;
          a legitimate-interest basis now exists, so the premise is gone"}]
 :still-holds [
   {:conclusion "Retention of historical newsletter engagement data needs a basis"
    :why "Derived independently from the storage-limitation axiom, not from the
          corrected fact — survives the revision untouched"}]
 :newly-follows [
   {:conclusion "Newsletter processing is lawful PROVIDED the legitimate-interest
                 balancing test in the assessment is sound"
    :strength :presumptive
    :why "The corrected fact supplies the basis the consent-for-marketing rule required"}]
 :now-undetermined [
   {:question "Is the legitimate-interest balancing test in the 2025-06-01 assessment
               actually adequate?"
    :why "The change reopens this: lawfulness now turns on the quality of an
          assessment we have not yet evaluated — a question that did not arise
          while the processing was simply unlawful"}]}
;; ✓ The change did NOT collapse the whole model. "Newsletter unlawful" was
;;   withdrawn because it rested on the corrected fact; but "retention needs a
;;   basis" still holds because it traced to a different premise. Revision gives
;;   up exactly what lost support and no more — which is only possible because the
;;   original derivations recorded what each conclusion depended on.
;; ✓ :now-undetermined surfaces the subtle consequence: fixing one fact reopened
;;   a question (is the LI assessment adequate?) that was moot while processing
;;   was unlawful. A system reporting only :withdrawn would have left the
;;   practitioner thinking lawfulness was now settled. It is not — it has moved.
```

#### Usage patterns

```clojure
;; Audit trail: when a fact is corrected, propagate and record what changed
(~> (r/derive compliance-question :from model :using rules :explain true)
  (r/revise :change {:correct corrected-fact} :affected *1 :surface [:withdrawn :newly-follows]))

;; Test the fragility of a conclusion: retract each premise, see what survives
(r/revise model
  :change   {:retract [load-bearing-fact]}
  :affected key-derivation
  :surface  [:withdrawn :still-holds])
;; If a high-stakes conclusion is :withdrawn by retracting a single low-confidence
;; fact, it is fragile and should not be relied on without corroboration.
```

---

## Part IV: Explanation and communication

---

### `r/trace`

Produces a complete, readable derivation chain for a conclusion — the explicit
step-by-step path from premises and rules to the final conclusion. Where
`r/derive` produces conclusions with embedded derivation, `r/trace` is a
dedicated tool for making a specific derivation maximally transparent.

#### Signature

```clojure
(r/trace conclusion
  :from      derivation-result | conclusion-binding
  :format    :step-by-step | :tree | :natural-language
  :audience  :technical | :legal | :general
  :annotate  [:rule-citations :confidence-at-each-step :alternatives-considered]
  :output    :derivation-document
  :manifest  trace-binding)
```

#### Parameters

**`:format`**:
- `:step-by-step` — numbered inference steps, each citing the rule and facts used
- `:tree` — branching structure showing how different streams of evidence
  combine into the conclusion
- `:natural-language` — written as coherent prose, suitable for regulatory
  submissions or explanations to affected parties

**`:audience`** — Shapes vocabulary and level of formality. `:legal` produces
output with rule citations in standard citation format. `:general` produces
plain language explanation of the reasoning without citations.

#### Design rationale

`r/trace` exists because the same derivation must be told to different readers,
and a single rendering serves none of them well. `r/derive` already embeds a
derivation chain — but that chain is structured for machine consumption and
expert audit, and handing it unchanged to an affected person (an applicant, a
patient, a customer) is a failure of explanation, not a fulfilment of it.
`r/trace` takes one fixed derivation and re-expresses it for a chosen audience
without changing what was concluded or why.

The discipline the construct enforces is that the *reasoning is invariant
across renderings*. The applicant's plain-language explanation and the
auditor's cited step-by-step must describe the same inference — the same rules,
the same facts, the same conclusion — differing only in vocabulary and
formality. This is what separates `r/trace` from `e/compose` writing a fresh
summary: `r/trace` is not free to simplify by omitting an inferential step, only
to translate the language in which the step is expressed. An explanation that
drops a load-bearing step for readability has misrepresented the decision, and
in regulated contexts that is the difference between an explanation and a
liability.

#### Example: Explanation to an applicant

```clojure
(r/trace income-support-decision
  :format   :natural-language
  :audience :general
  :annotate [:alternatives-considered]
  :manifest applicant-explanation)

;; Returns plain-language explanation suitable for providing to the applicant:
;; "We reviewed your application for income support on [date].
;;  We looked at four things required by the Income Support Act:
;;
;;  1. Age: You are 34 years old, which is within the eligible range of 18 to 67. ✓
;;  2. Residence status: Your permanent residence permit means you have lawful
;;     residence. ✓
;;  3. Assets: Your total assets of 4,200 are below the threshold of 7,605
;;     for a single person. ✓
;;  4. Income: You currently have no monthly income. ✓
;;
;;  Because all four conditions are met, you are entitled to income support.
;;
;;  We also checked whether you have been self-employed recently. If you have
;;  been self-employed in the past six months, we may need to assess your
;;  income over a three-month period first. Please let us know if this applies."
;;
;; ✓ Every step of the underlying derivation survives the translation — all four
;;   conditions, plus the self-employment open question. Nothing load-bearing was
;;   dropped for readability; only the vocabulary changed from model terms to
;;   plain language. The applicant reads the same decision the auditor would.
```

---

### `r/argue`

Constructs a formal argument for a position — explicit premises, inference
steps, and conclusion — suitable for legal documents, policy submissions,
or structured debate.

#### Signature

```clojure
(r/argue position
  :grounds   [supporting-fact-or-rule ...]
  :rebuttals [anticipated-objection ...]
  :backing   [authority-or-evidence ...]
  :qualifier :necessarily | :probably | :plausibly | :presumptively
  :format    :toulmin | :classical | :legal-brief
  :output    :argument-document
  :manifest  argument-binding)
```

#### Parameters

**`:format`** — The argumentative structure:
- `:toulmin` — Toulmin model: claim, grounds, warrant, backing, qualifier, rebuttal.
  Widely used in legal and policy argumentation.
- `:classical` — Aristotelian: premises, inference, conclusion.
- `:legal-brief` — Legal brief format: question presented, short answer,
  statement of facts, argument.

#### Design rationale

`r/argue` is the persuasive counterpart to the grimoire's analytical
constructs, and the boundary is deliberate. `r/derive` and `r/check` establish
what follows; `r/argue` *advocates* for a position to a reader who may resist
it. The difference is the audience's stance: derivation addresses a neutral
auditor, argument addresses a sceptic or an adversary. An argument must
therefore do something derivation need not — anticipate and answer objections —
which is why `:rebuttals` is first-class rather than optional polish.

The construct's defining honesty is the `:qualifier`. An argument that
overclaims its own force is weak precisely where it sounds strongest: asserting
`:necessarily` for a conclusion that is only `:probably` warranted invites the
one rebuttal that collapses it. By making the qualifier explicit and matching it
to the actual strength of the grounds, `r/argue` produces arguments calibrated
to what they can defend — `:presumptively` when the burden merely shifts,
`:probably` when the evidence is strong but defeasible. This is the same
epistemic discipline `r/derive` applies to mode, carried into advocacy: claim no
more force than the reasoning supports, because an adversary will find the gap.

#### Example: Regulatory submission argument

```clojure
(r/argue "The proposed cookie consent mechanism meets ePrivacy Directive requirements"
  :grounds   [
    "The mechanism requires affirmative action before any non-essential cookies are set"
    "Decline option is presented with equal visual prominence to the accept option"
    "Granular consent is provided per cookie category"
    "Consent is freely given — no service denial for declining non-essential cookies"]
  :rebuttals [
    {:objection "The pre-ticked boxes in the 'statistics' category constitute implied consent"
     :response  "The pre-ticked boxes were removed in version 3.2 (see exhibit B)"}]
  :backing   [
    "WP29 Guidelines on Consent (WP259 rev.01)"
    "EDPB Guidelines 05/2020 on consent"]
  :qualifier :probably
  :format    :legal-brief
  :manifest  cookie-consent-argument)
;; ✓ :qualifier :probably, not :necessarily — the grounds are strong but consent
;;   adequacy is ultimately a regulator's judgement, and claiming necessity would
;;   invite the rebuttal that no mechanism is beyond challenge. The argument
;;   claims exactly the force its grounds support.
;; ✓ The one anticipated :rebuttal is answered inline with evidence (the removed
;;   pre-ticked boxes), pre-empting the objection an adversary would raise rather
;;   than leaving it for them to land.
```

---

## Best practices

### State facts and rules before deriving conclusions

Resist the temptation to jump directly to `r/derive` without first establishing
the model and rules explicitly. The discipline of articulating `r/model` and
`r/rules` surfaces assumptions that would otherwise remain invisible — and
those hidden assumptions are precisely where reasoning goes wrong.

### Make the mode explicit always

Never allow the inference mode to be implicit. Label every conclusion as
deductive, inductive, or abductive. The epistemic status of a conclusion —
how certain it is, how it can be challenged, what would overturn it — depends
entirely on the mode of inference that produced it.

### Surface open questions alongside conclusions

`r/derive` with `:surface [:open-questions]` often produces findings as
valuable as the conclusions themselves. The questions that cannot be answered
with available facts are precisely the questions that need to be investigated.
A derivation that surfaces no open questions is likely a derivation that has
not probed the boundaries of its own completeness.

### Distinguish rules from facts from axioms

A rule is a conditional inference pattern. A fact is a contingent truth. An
axiom is a foundational assumption. Conflating them leads to reasoning that
cannot be audited: when a conclusion is challenged, it must be possible to
identify whether the challenge targets a rule (the inference pattern), a fact
(the empirical claim), or an axiom (the foundational assumption).

### Trace every high-stakes conclusion

In any domain where a conclusion materially affects a person — credit decisions,
eligibility determinations, compliance findings, risk assessments — the
derivation chain is not optional documentation. It is the substance of the
decision. Produce it. Store it. Make it available to those affected.

### Anti-patterns

**Asserting confidently instead of reasoning traceably.** The grimoire's
sharpest distinction is between a conclusion that traces to its premises and an
assertion dressed as one. Producing a bare verdict — "this is non-compliant",
"the applicant is ineligible" — without the derivation chain is not reasoning,
however correct the verdict happens to be. It cannot be audited, challenged, or
revised. If the chain is not produced, the conclusion has not been reasoned.

**Overstating the inference mode.** Labelling an inductive or abductive
conclusion as deductive manufactures false certainty. A risk score is not a
proof; a diagnosis is not a deduction. When `:mode :deductive` is claimed but
the inference is actually probabilistic, the mismatch must be flagged, not
smoothed over — the epistemic status of the conclusion depends on it.

**Treating "not contradicted" as "proven".** Checking a claim for
`:consistency` and concluding it is established confuses compatibility with
entailment. A model that fails to contradict a claim has not endorsed it. Use
`:entailment` when the question is whether the claim *follows*, and report
`:independence` honestly when the model simply cannot speak to it.

**Revising a model by re-deriving from scratch.** When a fact changes, silently
re-running the whole derivation discards the information about *what depended on
what*. Use `r/revise` so the change propagates through the chain of custody:
conclusions that lost their support are withdrawn, conclusions with independent
support are kept, and reopened questions are surfaced. Wholesale re-derivation
hides which conclusions actually moved and why.

**Letting an analogy rest on similarity alone.** A precedent that matches on
many incidental features but differs on the material one is a distinguishable
case, not support. Always surface `:distinguishing-features`; an analogy that
reports only what is shared is the case-based equivalent of asserting without
tracing.

---

## Integration patterns

### Reasoning as the decision layer within orchestrate

Workflow decisions — which branch to take, when to escalate, when an exception
applies — belong in `r/decide` rather than in `o/branch` conditionals. `r/decide`
makes the decision logic explicit, documented, and auditable. `o/branch` routes;
`r/decide` decides.

```clojure
(o/define-workflow :loan-application
  :stages [
    {:name :assess-eligibility
     :operation (r/decide credit-rules
                  :given    application-data
                  :model    :rule-set
                  :explain  true)}

    {:name      :route-decision
     :operation (branch :on eligibility-result
                  :cases {:approved       (conjure issue-offer)
                          :referred        (o/human-approval :reviewers [:underwriter])
                          :declined        (conjure generate-decline-letter)})}])
```

### Domain model as the fact base for reasoning

A domain model produced by `d/explore` or `d/model` becomes the fact base
for `r/model`. The domain's entities, constraints, and relationships are
facts about the world; the reasoning grimoire draws conclusions from them.

```clojure
(def regulation   (d/explore "income-support-act.pdf" :focus [:constraints :rules]))
(def applicant    (d/model "Applicant" :entities {:applicant applicant-data}))

(r/model eligibility-context
  :facts   (d/extract applicant   :what :entities :as :facts)
  :axioms  (d/extract regulation  :what :constraints :as :axioms)
  :manifest eligibility-base)

(r/derive "What is the applicant's eligibility status?"
  :from  eligibility-base
  :mode  :deductive
  :explain true)
```

### Semantics → reasoning pipeline

`s/texan` extracts the argumentative structure of a text. `r/check` evaluates
whether that structure is logically valid. Together they form a complete
argument assessment pipeline.

```clojure
(~> policy-document
  (s/texan     :models [:argumentation :facts-assumptions])
  (r/check     :for :consistency :against regulatory-model :explain true)
  (r/contradict :using domain-rules :explain true)
  (e/compose "Policy Argument Assessment"
    :audience :legal-counsel
    :purpose  :report))
```

### Reasoning traces as eloquence source

A `r/trace` derivation is structured knowledge that `e/compose` can transform
into audience-appropriate communication.

```clojure
(def derivation (r/derive eligibility-conclusion :from model :explain true))

;; For the applicant: plain language
(e/compose "Your Application Outcome"
  :from      (r/trace derivation :format :natural-language :audience :general)
  :audience  :end-user :tone :conversational)

;; For the supervisor: technical trace
(e/compose "Eligibility Decision Record"
  :from      (r/trace derivation :format :step-by-step :annotate [:rule-citations])
  :audience  :compliance-officer :tone :formal)
```

---

## Grimoire metadata

```clojure
{:grimoire    "reasoning"
 :namespace   "r/"
 :version     "1.2.0"
 :description "Explicit logical inference: deductive, inductive, abductive, and
               analogical reasoning with full derivation tracing, belief revision,
               and chain-of-custody provenance"

 :constructs {
   :foundations  [r/model r/rules]
   :inference    [r/derive r/decide r/hypothesise r/analogise]
   :verification [r/check r/contradict r/revise]
   :explanation  [r/trace r/argue]}

 :best-for [
   "Regulatory compliance determination: do our practices satisfy the rules?"
   "Eligibility and entitlement decisions with auditable derivation chains"
   "Business rule evaluation and decision table execution"
   "Incident investigation and root-cause hypothesis generation"
   "Reasoning from precedent and prior cases (legal, clinical, engineering)"
   "Belief revision: propagating a corrected or retracted fact through its conclusions"
   "Policy consistency checking and contradiction detection"
   "Argument construction for legal and regulatory submissions"
   "Decision explainability for affected parties and regulators"]

 :works-with [:core :domain :semantics :orchestrate :eloquence]

 :key-concepts [
   {:term "Deductive reasoning"
    :definition "Inference where the conclusion necessarily follows from the premises.
                 If the premises are true and the rule is valid, the conclusion must
                 be true. No exceptions."}
   {:term "Inductive reasoning"
    :definition "Inference from observed patterns to probable generalisations.
                 The conclusion probably follows, but new evidence can overturn it."}
   {:term "Abductive reasoning"
    :definition "Inference to the best explanation. Given observations, what hypothesis
                 most plausibly accounts for them? The conclusion is a candidate, not
                 a certainty."}
   {:term "Analogical reasoning"
    :definition "Inference case-to-case: transferring a conclusion from a similar prior
                 case to the present one. Governed by similarity on the dimensions that
                 matter and defeated by material differences, not by raw feature overlap.
                 The reasoning of precedent and differential diagnosis."}
   {:term "Belief revision"
    :definition "Propagating a change in the facts — a premise retracted, corrected, or
                 added — through the conclusions that depended on it: withdrawing those
                 that lost support, keeping those independently supported, and reopening
                 questions the change makes undetermined. The chain of custody run backward."}
   {:term "Derivation chain"
    :definition "The explicit path from premises and rules to conclusion. The reasoning
                 itself — not just the result. Every high-stakes conclusion requires one."}
   {:term "Defeasible rule"
    :definition "A rule that holds by default but can be overridden by more specific
                 rules or additional evidence. Most business rules are defeasible."}
   {:term "Open question"
    :definition "A conclusion that cannot be determined from available facts and rules.
                 Surfacing open questions is as important as deriving conclusions."}
   {:term "Sensitivity"
    :definition "Which inputs, if changed, would produce a different decision.
                 Essential for fairness auditing and explaining decisions to affected parties."}]}
```

---

## Implementation notes for LLM processors

### The chain-of-custody requirement

This is the non-negotiable discipline of the reasoning grimoire. Every derived
conclusion must include its derivation chain. Every step in the chain must
cite the specific fact, rule, or axiom that produced it. A conclusion without
provenance is an assertion — and the reasoning grimoire does not produce
assertions.

When `:explain true` is specified, always produce the derivation chain.
When `:explain` is not specified, include a summary derivation by default —
never produce a bare conclusion without at least a one-line justification.

### Mode discipline

Always make the inference mode explicit in the output, whether or not the
practitioner specified it. If the practitioner specifies `:mode :deductive`
but the inference is actually probabilistic, flag the mismatch rather than
producing false certainty.

Epistemic markers by mode:
- Deductive conclusions: "follows necessarily", "must be", "is required by"
- Inductive conclusions: "is probable", "evidence suggests", "pattern indicates"
- Abductive conclusions: "most plausibly explains", "best account of", "consistent with"

### Open question discipline

When facts are insufficient to determine a conclusion, produce the question
rather than an uncertain conclusion. "Is the applicant currently self-employed?"
is more useful than "Eligibility is uncertain (0.6 confidence)." The question
identifies what needs to be investigated; the confidence score does not.

Open questions should:
1. Be specific enough to be answerable by investigation
2. Identify which conclusion they affect
3. Note what the impact of each possible answer would be

### Rule conflict resolution

When multiple rules apply to the same situation and produce different conclusions,
apply the declared `:conflict-resolution` strategy and make the conflict explicit
in the output. Never silently apply one rule over another without surfacing the
conflict. The practitioner must know that a conflict existed and how it was resolved.

### Sensitivity analysis

When `:surface [:sensitivity]` is requested in `r/decide`, identify the inputs
whose change would most plausibly alter the decision. Compute sensitivity for:
- Input values close to a decision threshold
- Required conditions that were borderline
- Rules that almost fired but did not

Report the minimum change needed in each sensitive input to produce a different
outcome. This is not a request for extensive computation — it is a request for
the system's assessment of which inputs are near decision boundaries.

### Contradiction severity

When `r/contradict` finds contradictions, classify their severity:
- `:critical` — the contradiction directly undermines a derived conclusion or
  a compliance claim; immediate resolution required
- `:significant` — the contradiction affects a secondary claim or creates
  ambiguity in interpretation; should be resolved before relying on the model
- `:minor` — the contradiction exists in peripheral claims that do not affect
  current derivations; should be noted but does not block use of the model

### Abductive ranking

When ranking hypotheses in `r/hypothesise`, apply the following hierarchy to
break ties between equally plausible hypotheses:
1. **Consistency with all observations** — hypotheses that explain more
   observations rank higher
2. **Background probability** — more common explanations rank above rare ones
3. **Testability** — hypotheses that can be more easily confirmed or refuted
   rank above those that cannot
4. **Simplicity** — all else being equal, simpler hypotheses are preferred

Always surface the evidence against each hypothesis alongside the evidence for
it. A hypothesis with strong evidence for it and strong evidence against it is
less reliable than one with moderate evidence for and no evidence against.

### Analogical similarity and distinction

When processing `r/analogise`, weight similarity by the declared `:weight` map,
not by raw feature count. A precedent that matches on three incidental features
and differs on the one high-weighted dimension is a *weaker* analogy than one
that matches on the high-weighted dimension alone — and the output must rank
them accordingly, even when this contradicts surface similarity or recency.

Always populate `:distinguishing-features` for every nearest case, even when not
explicitly requested for high-stakes inferences. An analogy is defeasible by its
differences, and a case-match that reports only shared features misrepresents
the inference's strength. When the target differs from a precedent on a
high-weighted dimension, say so explicitly and discount that precedent's
contribution — never let a materially-distinguishable case drive the conclusion
on the strength of incidental overlap.

Respect `:min-similarity`: a case below the threshold must be excluded entirely,
not included with a low score. Analogy from a remote case is worse than no
analogy, because it lends the false authority of precedent to what is really a
guess.

### Belief revision must propagate, not re-derive

When processing `r/revise`, evaluate each prior conclusion in `:affected`
individually against the changed model. Do not discard all downstream
conclusions because one premise changed, and do not re-derive the model from
scratch — both destroy the dependency information the revision exists to use. A
conclusion goes in `:withdrawn` only if it depended on the changed fact and has
no independent support; it goes in `:still-holds` if other premises still entail
it; it goes in `:newly-follows` if the change supplies a premise a rule now
fires on.

Always compute `:now-undetermined`. A change can return a settled question to
open — most often when a retracted fact had foreclosed an alternative that is
now live again. Omitting this outcome is a correctness failure, not a
simplification: it leaves the practitioner believing a question is answered when
the revision has reopened it. Treat `:correct` as a paired retract-and-add that
preserves the fact's identity and provenance, so the audit trail shows the fact
was revised rather than deleted and recreated. 