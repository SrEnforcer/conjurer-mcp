# semantics.md — Conjurer Semantics Grimoire

The spellbook for meaning. Human communication embeds intent in layers that
resist naive extraction. A policy document is simultaneously a legal
instrument, a political position, an administrative procedure, and a power
relation. A contract is simultaneously a commercial agreement, a risk
allocation, a relationship definition, and a future constraint. The `semantics`
grimoire treats interpretation as what it actually is: a structured, perspectival,
dialectical activity — not a passive reading-off of what texts "contain."

---

## Philosophy

### The interpretive predicament

Every act of reading is an act of interpretation. There is no view from nowhere —
every analysis proceeds from a position, applies assumptions, and produces an
understanding that another position, with different assumptions, might challenge.
This is not a deficiency to be overcome; it is the nature of meaning.

The question for a semantic analysis framework is not "how do we produce
objective interpretations?" — that is impossible. The question is "how do we
produce *honest* interpretations?" — ones that make their assumptions visible,
trace their reasoning transparently, and acknowledge what alternative positions
could coherently claim.

The `semantics` grimoire is built on this epistemological honesty. Every
analytical claim maintains visible connections to evidence. Every interpretive
choice is made explicit rather than left as invisible background assumption.
Counter-perspectives are generated systematically — not as rhetorical gestures
toward balance, but as genuine alternative readings that illuminate what the
primary interpretation depends on.

### Meaning is perspectival without being arbitrary

Multiple valid interpretations can coexist. A labour economist and a management
consultant reading the same organisational policy will extract different primary
meanings — not because one is wrong, but because they bring different frameworks
that make different aspects salient. Both can be coherent. Both can be defended.
Both can be wrong about specific factual claims while being right about
structural patterns.

This is not relativism. Interpretations are not all equally good. Some are more
coherent, better evidenced, more attentive to the text, more aware of their
own assumptions, more honest about what they cannot determine. The semantics
grimoire provides the tools to distinguish better from worse interpretations
while acknowledging that "better" is itself a standard that different analytical
traditions define differently.

### Dialectical refinement as method

Understanding does not deepen through accumulation of confirmatory readings.
It deepens through encounter with alternatives that reveal what a primary reading
depends on, what it occludes, and where it is more fragile than it appears.
The `s/critique` and `s/viewpoint` constructs operationalise this dialectical
method. Generating a counter-perspective is not a politeness gesture — it is
the primary mechanism by which analytical understanding improves.

### Four design principles

**Perspectival pluralism with rigour** — Multiple interpretations can coexist;
each is assessed on its own coherence and evidentiary grounding.

**Semantic transparency through provenance** — Every claim traces to evidence,
applied model, and interpretive choice. Reasoning is visible, not concealed.

**Structured interpretation as method** — Codified analytical models (argumentation,
framing, rhetoric, ethics) provide systematic lenses that direct attention and
organise findings.

**Dialectical refinement** — Counter-perspectives are not negations but
principled alternatives that reveal what primary readings depend on.

---

## Naming rationale

**`s/`** — The namespace alias. Short for `semantics`.

**Texan** — "Text analysis" compressed into a distinctive term. Evokes both
"text" and "scan" to suggest systematic examination. Not generic enough to
be confused with other analytical constructs.

**Viewpoint** — A specific interpretive position, characterised by assumptions,
values, and theoretical commitments. Deliberately spatial: different positions
see different aspects.

**Distill** — Reduction to essential semantic content while preserving
argumentative structure. Like physical distillation: the volatile essentials
are captured; the inert is left behind.

**Chronicle** — Temporal semantic extraction: timeline, causality, periodisation.
From *chronos* (time) — the analysis of how a text's content unfolds through
time.

**Critique** and **synthesise** — Named plainly for what they do: the first
takes an analysis or text apart to find where it is weak; the second puts
multiple analyses together without erasing where they genuinely conflict. The
pairing is deliberate — they are the analytic and synthetic moments of the same
dialectical method.

**Counter-manifest** — A *manifestation* is Conjurer's term for what a spell
produces; a *counter-manifest* is the deliberately-produced opposite — a
complete alternative reading conjured from different commitments, not a mere
objection to the first.

**Detect-manipulation** — Named without metaphor, because the subject demands
plainness. The construct asks whether a text engages the reader's reasoning or
circumvents it; dressing that question in figurative language would be its own
small evasion.

---

## Part I: Primary analysis

---

### `s/texan`

Comprehensive semantic extraction through systematic application of analytical
models. The primary entry point for structured textual interpretation.

#### Signature

```clojure
(s/texan source
  :from              :text | :url | :file | :document
  :models            [:argumentation :framing :rhetoric :ethics :sentiment
                      :style :logical :contextual :power :facts-assumptions
                      :temporal :stakeholder | :all | custom-model-vector]
  :depth             :shallow | :moderate | :comprehensive
  :locale            :nl | :en | :de | :fr | ...
  :perspective       :neutral | :critical | :sympathetic | viewpoint-object
  :generate-counter  boolean
  :trace-reasoning   boolean
  :surface           [:claims :evidence :tensions :gaps :presuppositions]
  :output            :edn | :json | :markdown-report
  :manifest          analysis-binding)
```

#### Parameters

**`:models`** — Analytical lenses to apply. Each model generates distinct
semantic facets:
- `:argumentation` — claim structure, premise-conclusion relations, logical
  validity, burden of proof allocation, argument patterns (straw man, ad hominem,
  appeal to authority)
- `:framing` — what is foregrounded versus backgrounded; which actors are
  agents versus patients; which problems are named and which go unnamed;
  metaphor systems at work
- `:rhetoric` — persuasive strategies; ethos (credibility construction), pathos
  (emotional appeals), logos (rational argument); audience adaptation; register
- `:ethics` — explicit normative claims; implicit value commitments; stakeholders
  present and absent; distributive effects; whose interests are served
- `:sentiment` — emotional valence, intensity, and targets; shifts in affective
  register across the text
- `:style` — lexical register, syntactic complexity, hedging patterns, passive
  versus active voice, nominalisation, technical density
- `:logical` — deductive and inductive structure; assumption dependency;
  logical gaps; counterfactual implications
- `:contextual` — intertextual references, assumed background knowledge, genre
  conventions being honoured or violated
- `:power` — whose voice is authorised; whose knowledge counts; institutional
  positioning; silences and exclusions
- `:facts-assumptions` — distinguishing empirical claims from assumptions;
  what would have to be true for the argument to hold
- `:temporal` — temporal structure; causality claims; periodisation; projections
  and their epistemic status
- `:stakeholder` — who has interests in this text; how each stakeholder is
  positioned; whose interests are advanced or threatened

**`:surface`** — What to make explicit in the output beyond the model's
primary findings:
- `:claims` — every assertoric claim, separated from evidence
- `:evidence` — evidence offered for each claim
- `:tensions` — internal contradictions or unresolved conflicts
- `:gaps` — what the text does not address that the topic demands
- `:presuppositions` — what the text assumes without arguing for

#### Design rationale

`s/texan` is the grimoire's flagship because it embodies its central claim:
that interpretation is not reading-off but construction, and that honest
construction shows its work. Three design decisions follow from this.

First, **models are selected, not assumed**. A text has no single "correct"
analysis; it has as many analyses as there are coherent lenses to apply. By
making `:models` an explicit choice, the construct forces the practitioner to
name the interpretive stance rather than pretending to a view from nowhere. A
rhetorical analysis and an ethical analysis of the same speech are different
artefacts, and the construct refuses to conflate them.

Second, **the counter-perspective is structural, not decorative**. When
`:generate-counter true`, the output carries a principled alternative reading
as a first-class field — because, per the grimoire's dialectical principle, an
interpretation that has not survived contact with a good-faith alternative is
provisional. The counter-perspective is the quality mechanism, not a courtesy.

Third, **provenance is the difference between analysis and assertion**. With
`:trace-reasoning true`, every claim carries its chain back to the textual
evidence and the model that produced it. This is what makes a `s/texan` result
auditable: a reader can follow any conclusion to its ground, or reject the
ground and watch the conclusion fall. An analysis whose claims float free of
their evidence is not an analysis — it is an opinion with formatting.

#### Example: Policy document analysis

```clojure
(s/texan "https://www.epa.gov/climate-policy-2025"
  :from             :url
  :models           [:argumentation :framing :stakeholder :ethics]
  :depth            :comprehensive
  :locale           :en
  :perspective      :neutral
  :generate-counter true
  :trace-reasoning  true
  :surface          [:claims :gaps :presuppositions]
  :manifest         climate-analysis)

;; Returns:
{:source {:url "..." :retrieved "2025-11-03"}

 :argumentation {
   :main-claim     "Carbon neutrality by 2035 is achievable and necessary"
   :premises [
     {:claim    "Current emission trajectory exceeds Paris Agreement commitments"
      :evidence "National emissions inventory 2024"
      :strength :high}
     {:claim    "Renewable transition creates net employment"
      :evidence "Department of Energy projection, unverified by third party"
      :strength :medium}]
   :logical-gaps [
     "No mechanism specified for heavy industry transition"
     "Agricultural sector exemptions not justified"]
   :burden-of-proof :not-fully-discharged}

 :framing {
   :primary-frame   "Technical challenge with engineering solutions"
   :foregrounded    ["efficiency gains" "technology innovation" "economic opportunity"]
   :backgrounded    ["distribution of costs" "fossil fuel industry adjustment"]
   :agents          ["government" "technology sector" "renewable investors"]
   :patients        ["environment" "future generations"]
   :notable-absence "Low-income households bear higher energy cost burden — not addressed"}

 :stakeholder {
   :named   ["industry" "local governments" "citizens"]
   :absent  ["agricultural sector" "fossil fuel workers" "energy-poor households"]
   :benefits {:industry "Transition subsidies and regulatory certainty"
              :local-governments "Renewable infrastructure investment"}
   :risks   {:unaddressed "Regressive impact of energy cost increases"}}

 :presuppositions [
   {:presupposed "Technological solutions will scale as projected"
    :status :contested}
   {:presupposed "Economic growth and emission reduction are compatible"
    :status :contested}
   {:presupposed "Public acceptance of transition costs is achievable"
    :status :empirically-verifiable}]
 ;; ✓ Presuppositions carry a :status — contested vs. verifiable — rather than
 ;;   being listed flat. The reader learns not just what the text assumes but
 ;;   whether the assumption is safe to grant.

 :provenance [
   {:claim "Renewable transition creates net employment"
    :traces-to {:evidence "Department of Energy projection (appendix C)"
                :model    :argumentation
                :choice   "Treated as :medium strength because the projection
                           is single-source and not independently verified"}}
   {:claim "Low-income households bear higher energy cost burden"
    :traces-to {:evidence "Not in text — inferred from absence"
                :model    :framing
                :choice   "Flagged as :notable-absence, not as a stated claim;
                           the text's silence is the finding, not a quotation"}}]
 ;; ✓ Because :trace-reasoning was true, every consequential claim carries a
 ;;   chain back to its evidence, the model that produced it, and the
 ;;   interpretive choice made. The second entry shows the discipline at its
 ;;   sharpest: an absence is reported as an inference about silence, never
 ;;   dressed up as something the text said.

 :counter-perspective {
   :position "Policy is technically optimistic and socially incomplete"
   :argument "The employment projections cite unverified modelling; the
              agricultural sector receives exemptions without justification;
              and the cost burden on low-income households — documented in
              energy-poverty literature — is entirely absent from the analysis."
   :grounding "Distributive justice framework; empirical scepticism of
               unverified projections"}}
;; ✓ The counter-perspective does not negate the main claim. It grants the
;;   emission target and challenges the instrument and the distribution — the
;;   mark of a counter-perspective a rigorous analyst could defend, not a
;;   reflexive contradiction.
```

---

### `s/viewpoint`

Produces an explicit interpretation of a text from a specific stakeholder
position, role, or analytical framework. Not a neutral reading but a
perspectival one — the interpretation a particular kind of reader would
actually produce.

#### Signature

```clojure
(s/viewpoint source
  :as         :role-keyword | viewpoint-definition
  :focus      [:interests :risks :opportunities :obligations :blind-spots]
  :compare-to [:other-viewpoint ...]
  :output     :edn | :markdown-report
  :manifest   viewpoint-binding)
```

#### Parameters

**`:as`** — The interpretive position:
Built-in roles: `:regulator`, `:compliance-officer`, `:legal-counsel`,
`:affected-party`, `:journalist`, `:auditor`, `:risk-manager`, `:beneficiary`,
`:critic`, `:advocate`, `:engineer`, `:executive`, `:ethicist`

Custom viewpoint definition:
```clojure
{:role        "Data protection regulator"
 :priorities  [:data-subject-rights :controller-obligations :enforcement]
 :framework   :data-protection-law
 :blind-spots "May underweight data-driven public interest arguments"}
```

#### Design rationale

`s/viewpoint` exists because the neutral reading is often the least useful one.
A contract does not need to be understood "objectively" so much as it needs to
be understood *the way the counterparty's lawyer will understand it*, and *the
way the regulator will understand it*, and *the way the affected customer will
understand it* — because those are the readings that will actually be acted on.
A viewpoint is not a bias to be corrected; it is the reading a real,
consequential reader will produce, and anticipating it is a practical necessity.

The construct deliberately includes `:blind-spots` in custom viewpoint
definitions. A perspective is defined as much by what it cannot see as by what
it foregrounds: the risk manager who sees every downside and no opportunity,
the advocate who sees every harm and no trade-off. Naming the blind spot keeps
a viewpoint honest about being a viewpoint rather than masquerading as the
whole picture — which is exactly what `:compare-to` then exploits, by setting
partial readings against each other so their complementary blindnesses cancel.

#### Example

```clojure
(s/viewpoint vendor-data-processing-agreement
  :as [:compliance-officer :legal-counsel :affected-party]
  :focus  [:risks :obligations :gaps]
  :compare-to :all
  :manifest dpa-perspectives)

;; Three perspectives, each seeing different things in the same document:
;; compliance-officer: foregrounds audit-trail requirements, documentation gaps
;; legal-counsel:      foregrounds liability exposure, ambiguous indemnity clauses
;; affected-party:     foregrounds rights claims, enforcement mechanisms, redress
;;
;; compare-to :all surfaces the cross-perspective structure:
;; - Convergence: all three flag the absent breach-notification timeline
;; - Divergence: counsel reads the broad data-use clause as acceptable
;;   (standard market language); the affected-party reads the same clause as
;;   the document's central risk
;; ✓ The same clause is a non-issue from one position and the headline risk
;;   from another. That disagreement is the finding — it tells the practitioner
;;   exactly where the document's interpretation will be contested.
```

---

### `s/critique`

Systematically identifies weaknesses, gaps, unverified assumptions, and
logical vulnerabilities in an analysis or document.

#### Signature

```clojure
(s/critique target
  :dimensions [:logical-consistency :evidential-support :scope-completeness
               :assumption-validity :internal-contradictions :missing-stakeholders]
  :severity   :all | :significant-only
  :constructive boolean
  :output     :critique-report
  :manifest   critique-binding)
```

#### Parameters

**`:constructive`** — When true, each identified weakness is accompanied by
a specific suggestion for how it could be addressed, strengthened, or better
justified. The critique becomes a revision guide rather than an evaluation.

#### Example

```clojure
(s/critique risk-assessment-report
  :dimensions [:evidential-support :scope-completeness :assumption-validity]
  :severity   :significant-only
  :constructive true)

;; Returns:
{:target "risk-assessment-report"
 :overall-verdict "Methodologically incomplete; risks are understated"
 :findings [
   {:dimension   :evidential-support
    :finding     "Section 3.2 claims 'low probability' for supply chain disruption
                  but cites no data source for the probability estimate"
    :severity    :significant
    :suggestion  "Either cite a methodology (historical frequency analysis,
                  expert elicitation) or qualify as 'assessed as low' rather
                  than asserting low probability"}

   {:dimension   :scope-completeness
    :finding     "Cyber risk assessment covers only external threats; insider
                  threat (the primary vector in financial services breaches
                  per DBIR 2024) is absent"
    :severity    :significant
    :suggestion  "Add insider threat section covering: privileged access misuse,
                  unintentional exposure, social engineering of employees"}

   {:dimension   :assumption-validity
    :finding     "Business continuity plan assumes 4-hour recovery window;
                  the cited IT infrastructure has SLA of 8-hour RTO"
    :severity    :significant
    :suggestion  "Either renegotiate IT SLA or revise BCP recovery window
                  to be consistent"}]}
```

---

### `s/synthesise`

Integrates multiple perspectives or analyses into a coherent unified understanding,
preserving genuine tensions while resolving spurious conflicts.

#### Signature

```clojure
(s/synthesise analyses
  :identify    [:convergences :divergences :productive-tensions :spurious-conflicts]
  :resolve     :productive-tensions | :spurious-conflicts | :both | :none
  :preserve    [:genuine-disagreements]
  :frame-as    :balanced-assessment | :strongest-case | :research-summary
  :output      :synthesis-report
  :manifest    synthesis-binding)
```

#### Design rationale

The distinction between genuine disagreement and spurious conflict is central
to synthesis. A genuine disagreement exists when two analyses produce
incompatible claims that cannot both be true — they reflect different values,
different frameworks, or different factual judgments. A spurious conflict exists
when two analyses appear to disagree but are actually addressing different
aspects of the same question.

Genuine disagreements should be preserved — synthesis that collapses them into
artificial consensus misrepresents the actual state of knowledge. Spurious
conflicts should be resolved — they are clarifications, not real tensions.

---

## Part II: Targeted extraction

---

### `s/distill`

Compresses a text to its essential semantic content while preserving its
argumentative structure. Different from summarisation: `s/distill` preserves
the logical skeleton of the argument, not just the main points.

#### Signature

```clojure
(s/distill source
  :preserve   [:argument-structure :key-claims :evidence-links :qualifications]
  :target-length :fraction | :word-count
  :for        :audience-keyword
  :output     :distilled-text | :structured-outline
  :manifest   distilled-binding)
```

#### Design rationale

Summarisation asks "what are the main points?" Distillation asks "what is the
argumentative structure?" A distilled text can be expanded back into the
original's logic without loss. A summary cannot. For legal, policy, and
technical documents where argument structure is the content, distillation is
the appropriate operation.

#### Example

```clojure
(s/distill "procurement-policy-v4.pdf"
  :preserve    [:argument-structure :key-claims :qualifications]
  :target-length (/ 1 5)    ;; Reduce to 20% of original length
  :for         :executive
  :output      :structured-outline)

;; Returns structured outline preserving logical skeleton:
;; Main claim: New procurement thresholds reduce administrative burden while maintaining control
;; ├── Sub-claim: Purchases below $50K permit direct award
;; │   └── Qualification: Unless a framework agreement is available
;; ├── Sub-claim: $50K–$250K require three-quote procedure
;; │   └── Evidence: Comparable to prior policy; no change in risk exposure
;; └── Sub-claim: Above $250K require formal competitive tender
;;     └── Qualification: Emergency exceptions require Director approval
```

---

### `s/compare`

Produces a structured semantic comparison of two or more texts — identifying
where they agree, where they diverge, what each says that the others do not,
and what contradictions exist between them.

#### Signature

```clojure
(s/compare texts
  :dimensions  [:claims :positions :evidence :framing :gaps]
  :focus       "natural-language description of what the comparison is for"
  :output      :comparison-matrix | :comparison-report
  :manifest    comparison-binding)
```

#### Design rationale

`s/compare` is distinct from running `s/texan` on each text and reading the
results side by side. Independent analyses do not align: each names its claims
in its own terms, organises around its own structure, and leaves the reader to
do the cross-walking by hand. `s/compare` does the alignment as its primary
work — it establishes which claim in text A corresponds to which in text B
*before* asking how they relate, so that "they disagree" can be distinguished
from "they are talking about different things."

The construct's value concentrates in the asymmetries: what each text says that
the others do not. Convergences are reassuring but rarely actionable;
divergences and unique content are where decisions live. A practitioner
comparing a draft against a standard, or two regulations against each other, is
almost always looking for the delta — and the construct is built to surface the
delta rather than bury it in a symmetric matrix.

#### Example

```clojure
(s/compare [federal-privacy-act-text state-privacy-law-text]
  :dimensions  [:claims :positions :gaps]
  :focus       "Where does the state law diverge from the federal baseline,
                and where does it impose additional obligations?"
  :manifest    privacy-law-comparison)

;; Returns:
{:texts ["federal-privacy-act" "state-privacy-law"]
 :convergences [
   "Both require risk assessments for high-risk automated decision systems"
   "Both establish a supervisory authority with enforcement powers"]
 :divergences [
   {:topic       "Prohibited practices"
    :federal-act "Prohibits social scoring by government agencies"
    :state-law   "Includes the social-scoring prohibition; additionally bans
                  emotion recognition in employment settings"}
   {:topic       "Small-business exemptions"
    :federal-act "Lighter-touch requirements for entities under 25 employees"
    :state-law   "No small-business exemption — full requirements apply to all"}]
 :unique-to-state   ["Mandatory human review for algorithmic benefit decisions"
                     "Quarterly reporting cycle for high-risk system registrations"]
 :unique-to-federal ["Regulatory-sandbox provisions absent from the state law"]}
;; ✓ The :focus framed the comparison as a delta-hunt ("where does it diverge,
;;   where does it add"), so the output leads with divergences and unique
;;   content rather than a symmetric agree/disagree grid. The convergences are
;;   reported but kept brief — they are context, not the answer.
```

---

### `s/chronicle`

Extracts the temporal structure of a text — timeline of events, causal chains,
periodisation, and the epistemic status of past, present, and future claims.

#### Signature

```clojure
(s/chronicle source
  :extract     [:timeline :causality :periodisation :projections]
  :distinguish [:stated :inferred :projected :speculative]
  :output      :chronological-model | :timeline-report
  :manifest    chronicle-binding)
```

#### Design rationale

Historical documents, policy narratives, and strategic plans are temporally
structured — they make claims about how things came to be, how they currently
stand, and how they will develop. `s/chronicle` makes this temporal structure
explicit: what happened when, what caused what, what is projected with what
confidence, and what epistemic status each temporal claim carries.

#### Example

```clojure
(s/chronicle "digital-transformation-strategy.pdf"
  :extract     [:timeline :causality :projections]
  :distinguish [:stated :inferred :projected :speculative])

;; Returns:
{:past [
   {:period "2018-2021"
    :events ["Legacy system implementation" "Initial digitalisation failures"]
    :causality "Budget shortfalls caused delayed migration; vendor lock-in resulted from 2019 decision"
    :epistemic-status :stated}]
 :present [
   {:state "Hybrid infrastructure with legacy and modern systems operating in parallel"
    :epistemic-status :stated}]
 :projections [
   {:horizon "2026"
    :claim   "Full cloud migration completed"
    :basis   "Current migration velocity extrapolated linearly"
    :epistemic-status :projected
    :confidence-note "Linear extrapolation assumes no further procurement delays — contested by CIO in Q3 update"}
   {:horizon "2028"
    :claim   "$12M annual savings realised"
    :basis   "Third-party consultancy analysis cited in appendix B"
    :epistemic-status :speculative
    :confidence-note "Savings projections in comparable migrations have achieved 40-60% of forecast"}]}
;; ✓ The two projections carry different epistemic statuses: the 2026 migration
;;   is :projected (grounded in observed velocity), the 2028 savings :speculative
;;   (grounded in a citation whose comparables historically underdeliver). The
;;   construct refuses to flatten "likely" and "hoped-for" into one timeline.
```

---

## Part III: Advanced composition

---

### `s/counter-manifest`

Constructs a principled alternative interpretation of a text, grounded in a
different analytical framework, value system, or set of factual assumptions.
Not a refutation but a coherent alternative reading that a reasonable analyst
with different commitments could defend.

#### Signature

```clojure
(s/counter-manifest primary-analysis
  :from-position   viewpoint-definition
  :grounds         [:different-values :different-framework :different-facts]
  :must-acknowledge [:what-primary-analysis-gets-right]
  :output          :counter-analysis
  :manifest        counter-binding)
```

#### Design rationale

Counter-manifest is stronger than critique. Critique identifies weaknesses.
Counter-manifest constructs an alternative — a complete, self-consistent
reading that someone with different commitments would defend. This is the
most productive form of intellectual challenge: not "you are wrong" but "here
is how someone else, with different but defensible commitments, would read
this."

#### Example

```clojure
(s/counter-manifest primary-policy-analysis
  :from-position   {:role     "Fiscal conservative economist"
                    :values   [:fiscal-discipline :market-efficiency :private-sector-primacy]
                    :framework :public-choice-theory}
  :grounds         [:different-values :different-framework]
  :must-acknowledge [:empirical-findings-primary-cites]
  :manifest        fiscal-counter-reading)

;; Returns a complete alternative reading:
;; Acknowledges: the emission reduction target is empirically grounded
;; Challenges: the instrument choice (regulation vs. carbon pricing)
;; Alternative claim: Carbon pricing would achieve targets at lower economic cost
;;   while avoiding the regulatory capture risk inherent in sector-specific exemptions
;; Grounding: Public choice theory predicts lobbying for exemptions;
;;            economic theory favours price signals over command-and-control
```

---

### `s/detect-manipulation`

Examines a text for manipulation: rhetorical moves that aim to produce belief
or action by circumventing the reader's reasoning rather than engaging it. Where
`s/critique` asks "is this argument sound?" and `s/texan :models [:rhetoric]`
asks "how does this persuade?", `s/detect-manipulation` asks the sharper
question: "is this persuasion operating in good faith, and if not, how?"

#### Signature

```clojure
(s/detect-manipulation source
  :scan        [:logical-fallacies :emotional-exploitation :coercive-framing
                :information-asymmetry :social-pressure :false-urgency
                :presupposition-loading :false-dichotomy]
  :context     :commercial | :political | :interpersonal | :legal | :general
  :calibration :conservative | :balanced | :sensitive
  :explain     boolean
  :distinguish-from-legitimate boolean
  :output      :manipulation-report
  :manifest    manipulation-binding)
```

#### Parameters

**`:scan`** — Which manipulation classes to look for:
- `:logical-fallacies` — fallacies deployed *to persuade*, not merely present
  (straw man, ad hominem, motte-and-bailey, slippery slope offered as inevitable)
- `:emotional-exploitation` — affect engineered to displace judgment: fear
  without proportion, guilt without basis, manufactured outrage
- `:coercive-framing` — choices framed so that the desired option appears as
  the only reasonable one; consequences of dissent overstated
- `:information-asymmetry` — selective disclosure; burying material facts;
  technically-true statements engineered to mislead
- `:social-pressure` — bandwagon ("everyone is switching"), authority borrowed
  without relevance, manufactured consensus
- `:false-urgency` — artificial time pressure ("offer ends today", "act now")
  designed to prevent reflection
- `:presupposition-loading` — claims smuggled in as presuppositions so they are
  accepted without ever being asserted or defended ("when did you stop…")
- `:false-dichotomy` — a spectrum of options compressed into two, one of them
  unacceptable

**`:context`** — The setting calibrates what counts as manipulation. Urgency in
a commercial offer is suspect; urgency in a safety notice may be warranted.
Emotional appeal in a charity appeal is expected; the same appeal in a financial
prospectus is a red flag. The context is not an excuse — it is the baseline
against which a move is judged manipulative or appropriate.

**`:calibration`** — How readily to flag. `:conservative` flags only clear,
deliberate manipulation; `:sensitive` flags anything that *could* operate
manipulatively even if innocently meant; `:balanced` is the default. Calibration
exists because the false-positive cost is real: labelling ordinary persuasion as
manipulation is itself a distortion.

**`:distinguish-from-legitimate`** — When true, every flagged move is paired with
the legitimate technique it resembles, and the report explains what tips it from
one to the other. This is what keeps the construct from becoming a paranoia
engine — most manipulative moves are corruptions of legitimate ones, and naming
the line is more useful than raising an alarm.

#### Design rationale

The grimoire already analyses rhetoric and argumentation, but those constructs
are descriptive: they tell you *how* a text persuades and *whether* its
arguments are valid. Neither answers the question a reader most often actually
has when something feels off — *is this text trying to get around me?* That is a
distinct analytical object. A perfectly valid argument can be deployed
manipulatively (a true fact disclosed at a moment engineered to panic), and a
technically fallacious passage can be entirely innocent (a tired writer's loose
phrasing). Manipulation is about the *relationship between the move and the
reader's agency*, not about validity in the abstract.

The decisive design commitment is `:distinguish-from-legitimate`. Manipulation
detection done badly is corrosive: it teaches the reader to see bad faith
everywhere, which is itself a failure of interpretation and a distinctly
unpleasant way to read the world. Almost every manipulative technique is a
legitimate one pushed past a line — urgency becomes false urgency, emphasis
becomes selective disclosure, emotional resonance becomes emotional
exploitation. The analytically useful act is not "this is manipulation" but
"this resembles a legitimate appeal and here is precisely where it crosses
over." That keeps the construct honest, keeps it teachable, and keeps it from
flattering the reader's suspicion.

The construct is calibrated rather than binary because the cost of error runs
both ways. A reader who misses real manipulation is exploited; a reader who
cries manipulation at ordinary persuasion is unreachable. `:calibration` lets
the practitioner set the threshold to the stakes — `:conservative` for analysing
a colleague's good-faith memo, `:sensitive` for vetting a high-pressure sales
script or a disinformation sample.

#### Example 1: A high-pressure sales email

```clojure
(s/detect-manipulation sales-email-text
  :scan        [:false-urgency :social-pressure :false-dichotomy
                :emotional-exploitation]
  :context     :commercial
  :calibration :balanced
  :explain     true
  :distinguish-from-legitimate true
  :manifest    sales-email-scan)

;; Returns:
{:source "sales-email-text"
 :context :commercial
 :overall "Multiple coordinated pressure techniques; persuasion is operating
           against the reader's deliberation, not through it"
 :findings [
   {:class    :false-urgency
    :instance "'This price is only guaranteed for the next 2 hours'"
    :why      "The two-hour window is unconnected to any real constraint; its
               function is to prevent the comparison-shopping that would weaken
               the pitch"
    :resembles "Legitimate scarcity (a genuinely limited stock or a real
                contract deadline)"
    :crosses-over-when "The deadline is manufactured for the pitch rather than
                        arising from an actual external constraint"
    :severity :high}

   {:class    :false-dichotomy
    :instance "'Either you secure your family's future today, or you leave it
               to chance'"
    :why      "Compresses a continuum of financial-planning choices into two
               options, one of them framed as reckless"
    :resembles "Legitimate contrast between action and inaction"
    :crosses-over-when "The middle ground (deliberate, unhurried planning) is
                        erased rather than acknowledged"
    :severity :high}

   {:class    :social-pressure
    :instance "'Thousands of smart families have already switched'"
    :why      "Bandwagon appeal substituting popularity for a reason to act"
    :resembles "Legitimate social proof (verifiable adoption data relevant to
                the decision)"
    :crosses-over-when "The number is unverifiable and the relevance to the
                        reader's situation is asserted, not shown"
    :severity :medium}]

 :legitimate-elements [
   "The product's stated features are described without exaggeration"
   "Pricing is disclosed rather than hidden"]
 ;; ✓ The report names what the text does honestly as well as what it does not.
 ;;   A manipulation scan that finds only manipulation is not analysing — it is
 ;;   confirming a prior.
 :calibration-note "At :conservative calibration the :social-pressure finding
                    would not be flagged; the bandwagon language is mild"}
;; ✓ Every finding pairs the manipulative move with the legitimate technique it
;;   imitates and names the precise crossover point. The reader leaves able to
;;   recognise the pattern next time, not merely warned about this instance.
```

#### Example 2: Distinguishing warranted urgency from manufactured urgency

```clojure
;; The same scan, run on a safety recall notice, must NOT flag its urgency
(s/detect-manipulation product-recall-notice
  :scan        [:false-urgency :emotional-exploitation]
  :context     :general
  :calibration :balanced
  :distinguish-from-legitimate true
  :manifest    recall-scan)

;; Returns:
{:source "product-recall-notice"
 :context :general
 :overall "No manipulation detected. Urgency and emotional weight are
           proportionate to a genuine safety hazard"
 :findings []
 :assessed-but-cleared [
   {:class    :false-urgency
    :instance "'Stop using this product immediately'"
    :verdict  :legitimate
    :why      "The urgency tracks a real, documented hazard; the instruction is
               the proportionate response, not a device to prevent reflection"}
   {:class    :emotional-exploitation
    :instance "'to protect you and your family from injury'"
    :verdict  :legitimate
    :why      "Invokes a real risk the notice exists to communicate; emotion is
               commensurate with the stakes, not engineered to displace judgment"}]}
;; ✓ The construct clears moves that look manipulative in isolation but are
;;   warranted in context. The :context and the proportionality test do the
;;   work: identical surface language ('immediately', 'your family') is
;;   manipulation in the sales pitch and responsible communication here.
```

#### Usage patterns

```clojure
;; Pair with critique: is the argument sound AND is it offered in good faith?
(~> contract-cover-letter
  (s/critique :dimensions [:logical-consistency :evidential-support])
  (s/detect-manipulation :scan [:presupposition-loading :coercive-framing]
                         :context :legal :distinguish-from-legitimate true))

;; Vet a disinformation sample at high sensitivity
(s/detect-manipulation suspect-article
  :scan :all
  :context :political
  :calibration :sensitive
  :explain true)
```

---

### `s/semantic-profile`

Generates a "semantic fingerprint" of a text — characterising its argumentative
complexity, conceptual density, rhetorical sophistication, and stylistic
signatures. Enables comparison across documents and detection of anomalies.

#### Signature

```clojure
(s/semantic-profile source
  :dimensions  [:argumentative-complexity :conceptual-density :rhetorical-sophistication
                :hedging-patterns :claim-density :evidence-quality]
  :compare-to  [baseline-text ...]
  :output      :profile-report
  :manifest    profile-binding)
```

#### Design rationale

`s/semantic-profile` answers a different question from the analytical
constructs: not "what does this text mean?" but "what *kind* of text is this?"
It is reconnaissance, not interpretation. Before committing to a comprehensive
`s/texan` — which is expensive — a profile tells the practitioner whether the
investment is warranted and where to aim it: a document that profiles as
low-complexity, high-hedging, and low-claim-density is procedural boilerplate
that a shallow pass will exhaust, while one that profiles as high-complexity
with dense, weakly-evidenced claims is where deep analysis pays off.

The construct's second use is anomaly detection through `:compare-to`. A
contract that profiles far from its template, a report that hedges far more than
its peers, a submission whose claim-density spikes in one section — these
divergences are signals worth following, and a profile surfaces them cheaply
before any close reading. The profile is to semantic analysis what triage is to
diagnosis: fast, coarse, and decisive about where to spend the expensive
attention.

#### Example

```clojure
(s/semantic-profile "contract-final.pdf"
  :dimensions  [:argumentative-complexity :hedging-patterns :claim-density]
  :compare-to  [standard-nda-template]
  :manifest    contract-profile)

;; Returns:
{:profile {
   :argumentative-complexity :low
   :note "Predominantly definitional and procedural; few inferential steps"
   :hedging-patterns {
     :frequency :high
     :style     "Predominantly epistemic hedging ('may', 'where applicable', 'subject to')"
     :note      "High hedging is appropriate for contracts; signals well-drafted uncertainty management"}
   :claim-density :moderate}
 :vs-template {
   :divergences [
     "Section 7.3 removes standard limitation-of-liability cap — significant deviation"
     "IP assignment clause is broader than template default — requires counsel review"
     "Governing-law clause changed from the template default — cross-border implications"]}}
;; ✓ The profile never reads the contract closely — it characterises shape and
;;   flags where this instance departs from its template. Those three divergences
;;   are the agenda for the close reading that follows, not its conclusion.
```

---

## Best practices

### Choose models that serve the purpose

Applying all analytical models to every text is expensive and produces
information the practitioner may not need. A compliance analysis needs
`:ethics`, `:facts-assumptions`, and `:contextual`. A rhetorical analysis
of a speech needs `:rhetoric`, `:framing`, and `:sentiment`. Choose models
that serve the analytical purpose. Use `:all` only for comprehensive research
where multiple facets genuinely matter.

### Counter-perspectives are primary deliverables

A `s/texan` result without a counter-perspective is a preliminary finding.
Always use `:generate-counter true` for consequential analyses. The counter-
perspective reveals what the primary reading depends on — and what it gets
right by showing what a good-faith alternative must acknowledge.

### Preserve the inferred-stated distinction

Never present an inference as a statement. When a text implies something
without stating it, the analysis must mark that implication as inferred. In
legal and policy contexts, the difference between "the regulation states" and
"the regulation implies" is the difference between a binding obligation and a
contested interpretation.

### Profile before deep analysis

For long documents, use `s/semantic-profile` first to characterise the text
before committing to comprehensive analysis. A document that profiles as
low-complexity with high hedging and low claim-density may not warrant
comprehensive `s/texan` treatment — a shallow or moderate analysis may suffice.

### Distinguish manipulation from persuasion deliberately

When using `s/detect-manipulation`, set `:distinguish-from-legitimate true` for
any analysis a person will read and act on. A bare list of "manipulation found
here" trains suspicion without discernment; pairing each flag with the
legitimate technique it resembles teaches the reader to see the line, which is
the actual goal. Reserve `:calibration :sensitive` for adversarial material
(disinformation samples, high-pressure scripts); using it on good-faith text
manufactures false positives that discredit the whole analysis.

### Anti-patterns

**Presenting a viewpoint as the analysis.** `s/viewpoint :as :critic` produces
the reading a critic would give — partial by design. Treating that partial
reading as the document's meaning, rather than as one position among several,
inverts the construct's purpose. A viewpoint is honest only when its
partiality is visible; strip the `:blind-spots` and it becomes propaganda with
a citation.

**Counter-perspective as reflexive contradiction.** Generating a
counter-perspective that merely negates the primary reading ("the analysis is
wrong") satisfies the letter of `:generate-counter true` while defeating its
purpose. A counter-perspective that does not acknowledge what the primary
reading gets right is not an alternative interpretation — it is a contrarian
reflex, and the implementation notes reject it on quality grounds.

**Collapsing genuine disagreement into consensus.** Using `s/synthesise` to
manufacture agreement where analyses genuinely conflict misrepresents the state
of knowledge. The construct distinguishes spurious conflict (resolve it) from
genuine disagreement (preserve it) precisely so that synthesis does not become
false reconciliation. A synthesis with no preserved tensions, drawn from
sources that plainly disagree, is a warning sign, not a success.

**Manipulation-hunting as a worldview.** Running `s/detect-manipulation` at
`:sensitive` calibration on ordinary good-faith text, and treating every
flagged resemblance as bad faith, corrupts interpretation as surely as missing
real manipulation does. The construct is a scalpel for suspect material, not a
lens for all reading.

---

## Integration patterns

### Semantics as the interpretation layer

The semantics grimoire typically operates on outputs from the domain grimoire
or on raw documents that feed into domain models.

```clojure
;; Analyse a regulation to extract domain knowledge
(~> "gdpr-art-5.pdf"
  (s/texan      :models [:argumentation :ethics :facts-assumptions]
                :generate-counter true)
  (s/distill    :preserve [:argument-structure :key-claims])
  (d/model "GDPR Article 5"
    :from-analysis true))
```

### Perspective as quality mechanism

```clojure
;; Multi-perspective review of a contract before signing
(parallel contract-review
  :operations [
    (as :legal-counsel      (s/viewpoint contract :as :legal-counsel
                              :focus [:risks :obligations]))
    (as :compliance-officer (s/viewpoint contract :as :compliance-officer
                              :focus [:regulatory-gaps]))
    (as :commercial-lead    (s/viewpoint contract :as :executive
                              :focus [:opportunities :constraints]))]
  :combine-results :synthesise)
```

### Good faith as a gate before action

```clojure
;; Before acting on a persuasive document, check both soundness and good faith
(~> proposal-document
  (s/texan               :models [:argumentation :rhetoric :framing]
                         :generate-counter true)
  (s/detect-manipulation :scan [:false-urgency :coercive-framing
                                :presupposition-loading]
                         :context :commercial
                         :distinguish-from-legitimate true)
  (s/synthesise          :frame-as :balanced-assessment))
;; The argument may be valid AND offered in bad faith; this pipeline catches
;; both, then synthesises a single assessment that weighs them together.
```

---

## Grimoire metadata

```clojure
{:grimoire    "semantics"
 :namespace   "s/"
 :version     "2.1.0"
 :description "Structured semantic extraction, perspectival analysis,
               dialectical reasoning, and textual interpretation"

 :constructs {
   :primary-analysis   [s/texan s/viewpoint s/critique s/synthesise]
   :targeted-extraction [s/distill s/compare s/chronicle]
   :advanced           [s/counter-manifest s/detect-manipulation s/semantic-profile]}

 :best-for [
   "Policy and regulatory document analysis with competing stakeholder interests"
   "Legal document interpretation with multiple analytical lenses"
   "Multi-perspective synthesis with preserved tensions"
   "Argumentative structure extraction and logical gap identification"
   "Comparative analysis of multiple documents on a shared topic"
   "Temporal structure extraction from strategic and historical documents"
   "Counter-perspective generation for contested interpretations"
   "Manipulation and bad-faith-rhetoric detection in commercial, political, and legal text"]

 :works-with [:core :domain :eloquence]

 :key-concepts [
   {:term "Perspectival analysis"
    :definition "Interpretation from a specific analytical position, making its
                 assumptions explicit and acknowledging what other positions
                 would legitimately see differently"}
   {:term "Provenance chain"
    :definition "The traceable path from claim to evidence to model to
                 interpretive choice. Every analytical claim has one."}
   {:term "Counter-perspective"
    :definition "A principled alternative interpretation grounded in different
                 but defensible commitments. Not a refutation — a coherent
                 alternative reading."}
   {:term "Distillation"
    :definition "Reduction to argumentative skeleton while preserving logical
                 structure. Different from summarisation, which captures main
                 points but not argument form."}
   {:term "Semantic profile"
    :definition "Statistical and structural characterisation of a text's
                 argumentative complexity, rhetorical features, and stylistic
                 signatures — a semantic fingerprint."}
   {:term "Chronicle"
    :definition "The temporal structure of a text: timeline, causal claims,
                 projections, and the epistemic status of past, present,
                 and future assertions."}
   {:term "Manipulation"
    :definition "Persuasion that aims to produce belief or action by
                 circumventing the reader's reasoning rather than engaging it.
                 Distinct from invalid argument (which may be innocent) and from
                 legitimate persuasion (which a manipulative move usually
                 imitates and pushes past a line)."}]}
```

---

## Implementation notes for LLM processors

### Model application discipline

Apply only the specified `:models`. Do not add additional models because they
seem relevant. The practitioner's model selection is an analytical choice;
adding unrequested models changes the analysis's scope.

When `:models :all` is specified, apply every available model and organise
findings by model. Flag where models produce convergent or divergent findings
on the same textual element.

### The stated/inferred boundary

This is the most important disciplinary boundary in semantic analysis. A
textual element marked `:stated` must have a direct quote or clear paraphrase
from the source. A textual element marked `:inferred` must have explicit
reasoning showing why the text implies it. Never mark something `:stated`
without sourcing it. Never mark something `:inferred` without showing the
inference chain.

### Counter-perspective quality

A counter-perspective is not adequate if it:
- Simply negates the primary analysis ("the primary analysis is wrong")
- Introduces factual claims not supportable from the text or cited sources
- Does not acknowledge what the primary analysis correctly identifies
- Is grounded in a position no reasonable analyst would hold

A good counter-perspective is one that a rigorous analyst with different but
defensible commitments could defend to a peer review.

### Presupposition identification

Presuppositions are what a text assumes without arguing for. Common signals:
- Definite descriptions that presuppose existence ("The economic benefits...")
- Factive verbs that presuppose truth of their complements ("...has succeeded in...")
- Conventional implicatures ("even the critics acknowledge...")
- Generic statements that presuppose type generalisation ("Citizens want...")

Mark presuppositions with `:presupposed true` and note whether they are
contested, uncontested, or empirically verifiable.

### Manipulation detection discipline

`s/detect-manipulation` is the highest-stakes construct in the grimoire for
false positives, and the implementation must be correspondingly disciplined.

Judge the move in its context, not in the abstract. Identical surface language
is manipulative in one setting and responsible in another: "act immediately" is
false urgency in a sales pitch and proportionate instruction in a safety recall.
Always apply the `:context` and a proportionality test — does the intensity of
the appeal match the reality of the stakes? — before flagging.

Never flag a move without naming the legitimate technique it resembles when
`:distinguish-from-legitimate` is set. Most manipulation is a corruption of a
legitimate move; the analytically useful output is the crossover point, not the
alarm. A finding that cannot name what it resembles is probably not manipulation.

Report what the text does honestly alongside what it does not. A scan that
returns only findings, with no `:legitimate-elements` and no
`:assessed-but-cleared`, has almost certainly been run as confirmation rather
than analysis. Surface the cleared moves explicitly.

Respect calibration. At `:conservative`, flag only clear, deliberate
manipulation. At `:sensitive`, surface anything that could operate
manipulatively, but mark the weaker findings as calibration-dependent (as in the
sales-email example's `:calibration-note`) so the reader can tell a strong
finding from a sensitive-only one. Do not silently apply `:sensitive` thresholds
under a `:balanced` request.

Do not infer intent you cannot support. The construct describes how a move
*functions* with respect to the reader's agency, not what the author secretly
wanted. Prefer "this functions to prevent reflection" over "the author intends
to deceive"; the former is observable in the text, the latter is mind-reading.

### Depth calibration

At `:depth :shallow`: primary claim, main evidence, key framing device. No
counter-perspective. One to two sentences per dimension.

At `:depth :moderate`: full argumentative structure, main framing choices,
key stakeholders, major gaps, counter-perspective at moderate detail.

At `:depth :comprehensive`: every claim sourced, every presupposition named,
every inference made explicit, full counter-perspective with grounding, gap
analysis across all specified dimensions, tensions within the primary analysis
identified.