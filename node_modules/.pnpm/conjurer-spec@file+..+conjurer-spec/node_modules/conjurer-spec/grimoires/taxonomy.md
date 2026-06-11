# taxonomy.md — Conjurer Taxonomy Grimoire

The spellbook for classification. Every other grimoire works with things;
`taxonomy` works with the *kinds* of things — the categories a domain is carved
into, the rules that decide what belongs where, and the discipline of carving
well. It provides a complete vocabulary for defining, building, applying,
aligning, validating, navigating, and evolving systems of categories.

---

## Philosophy

### Why classification deserves its own grimoire

Classification looks simple and is not. To say "this belongs in that category"
is to make a claim with consequences: a data field classified as personal data
falls under a regulation; a support ticket classified as a defect routes to a
different team than one classified as a feature request; a transaction
classified as high-risk is held for review. The category is not a label stuck
on after the fact — it is a decision that determines what happens next. A
system's taxonomy is the shape of its judgement.

Other grimoires touch classification glancingly. `domain` extracts a taxonomy
as one facet of a domain model; `data` validates a value against an enum;
`reasoning` decides a case against rules. But none of them treats the
*category system itself* as the object of work — and category systems have
their own properties, failure modes, and lifecycle that deserve dedicated
constructs. A taxonomy can be incoherent (its categories overlap so an item
fits two), incomplete (an item fits none), or unstable (it changes and orphans
everything classified under the old shape). These are not domain problems or
data problems; they are classification problems, and they recur identically
across every domain. That recurrence is what justifies a grimoire: the
discipline of building a category system well is the same whether the things
being classified are legal documents, biological species, or API errors.

### What principles govern the design

**Two kinds of category system, kept distinct.** The deepest decision in
classification is *enumerative* versus *faceted*. An enumerative taxonomy is a
tree: every item has one place, found by descending through criteria (a
library's shelf number). A faceted taxonomy is a coordinate space: an item is
described by independent dimensions and has no single "location" (a garment is
*red* and *cotton* and *size-M* and *summer*, all at once). Most real
classification fails because someone forced faceted reality into an enumerative
tree, producing an explosion of leaf categories like
`red-cotton-summer-medium`. The grimoire separates `t/define`/`t/build`
(enumerative) from `t/facet` (faceted) so the practitioner must choose the
right shape rather than defaulting to a tree.

**Two directions of construction.** A taxonomy can be *declared* — imposed
top-down from a purpose and a set of criteria (`t/define`) — or *built* —
grown bottom-up by finding the structure latent in a pile of items
(`t/build`). Declaration encodes intent; construction discovers what is there.
Both are legitimate, and confusing them is a common error: declaring a taxonomy
when you do not yet know your data produces categories that fit your
assumptions rather than your items.

**Honest about exhaustiveness and exclusivity.** The textbook ideal is a
taxonomy that is *exhaustive* (everything fits somewhere) and *mutually
exclusive* (nothing fits in two places). Real taxonomies routinely violate
both, and pretending otherwise is how bad data enters a system silently. The
grimoire makes both properties explicit, checkable (`t/validate`), and — when
they cannot hold — gracefully handled: `:unclassifiable` is a first-class
outcome, and `t/classify` surfaces confidence and alternatives rather than
forcing a false placement.

**Classification is fallible and must show its reasoning.** Placing an item is
an act of judgement, and judgement can be wrong, borderline, or contested. So
`t/classify` does not return a bare label; it returns a placement with a
confidence, the alternatives it considered, and the boundary cases it was
unsure about. A classifier that hides its uncertainty is more dangerous than
one that admits it.

### Naming rationale

**`t/`** — The namespace prefix. One letter, because classification threads
through everything and earns brevity.

**Taxonomy** — From Greek *taxis* (arrangement) and *nomia* (method, law):
literally "the law of arrangement." A taxonomy is not just an arrangement but a
*principled* one, governed by criteria that say why each thing sits where it
does.

**Facet** — From Old French *facette*, "little face" — one of the many flat
faces of a cut gem. A faceted taxonomy views an item through several
independent faces at once, each a separate dimension of description.

**Crosswalk** — From the mapping tradition: a table that translates the
categories of one scheme into another. When a taxonomy evolves, the crosswalk
is what keeps everything classified under the old scheme reachable from the new.

---

## Part I: Defining and building taxonomies

A taxonomy comes into being one of two ways: it is declared from a purpose and
a set of criteria, or it is built inductively from the items it must organise.
This part covers both, and the faceted alternative to the enumerative tree.

---

### `t/define`

Declares a taxonomy top-down: its root, the criteria that distinguish
categories, the categories themselves, the rules for membership, and what
happens to items that fit nowhere. Use `t/define` when you know the structure
you intend to impose.

#### Signature

```clojure
(t/define name
  :purpose       "what this taxonomy is for — the decision it informs"
  :root          "the universe of things being classified"
  :criteria      [{:name :criterion :question "what distinguishes categories at this level"} ...]
  :levels        n | :variable
  :categories    [category-definition ...]
  :membership    :rules | :examples | :both
  :exhaustive    boolean
  :exclusive     boolean
  :unclassifiable :reject | :other-bucket | :flag-for-review
  :standard      "external standard this taxonomy conforms to, if any"
  :version       "semver"
  :manifest      taxonomy-binding)
```

#### Parameters

**`:purpose`** — The decision the taxonomy exists to inform. This is not
decoration: the purpose is the criterion for whether a category distinction is
worth making. Two items belong in different categories if and only if the
purpose would treat them differently. A taxonomy without a stated purpose
cannot be evaluated, because there is no standard against which a category is
useful or redundant.

**`:criteria`** — The questions that distinguish categories, level by level. In
a well-formed enumerative taxonomy each level applies one criterion (a single
principle of division), so that descending the tree is a sequence of clean
questions. Mixing criteria at one level ("split by region *and* by product") is
the classic defect that produces overlap.

**`:categories`** — The category definitions. Each carries a name, a
definition, optionally a parent (for nesting), and membership guidance
(`:rules`, `:examples`, or both). Definitions must be sharp enough that a
borderline item can be adjudicated.

**`:exhaustive`** / **`:exclusive`** — Declared claims about the taxonomy's
shape: does every item fit somewhere (`:exhaustive`), and does nothing fit in
two places (`:exclusive`)? These are checkable by `t/validate`. Declaring them
truthfully matters more than declaring them favourably — a taxonomy honestly
marked non-exhaustive is safer than one falsely marked exhaustive.

**`:unclassifiable`** — What to do with an item that fits no category:
`:reject` (refuse it — appropriate when the taxonomy must be exhaustive by
contract), `:other-bucket` (collect it in a catch-all — pragmatic but watch the
bucket grow), or `:flag-for-review` (surface it for a human — appropriate when
unclassifiable items signal the taxonomy needs to evolve).

#### Design rationale

`t/define` exists for the case where classification is an act of *intent*: a
regulator, an architect, or a domain owner decides how a space *should* be
carved, ahead of and independent of the items that will flow through it. The
construct's design enforces the discipline that makes such a taxonomy coherent
rather than ad hoc.

The decisive commitment is requiring `:criteria` as a first-class element
rather than letting categories be a flat list of names. A list of categories is
just a set of buckets; it says nothing about *why* those buckets and not
others, or how to place a new item the author did not anticipate. Criteria make
the principle of division explicit, which is what lets the taxonomy answer
questions about items it has never seen — and what lets `t/validate` check that
each level divides on one principle. A taxonomy whose categories cannot be
traced to criteria is unmaintainable: every new item is a fresh argument.

The `:exhaustive`, `:exclusive`, and `:unclassifiable` parameters together
encode the grimoire's honesty principle. The construct refuses to let the
author pretend a taxonomy is total when it is not. If `:exhaustive true` is
declared, `t/validate` will hold it to that claim; if items will inevitably
escape the scheme, the author must say what happens to them. There is no silent
default that drops an unclassifiable item on the floor.

#### Example 1: A GDPR data-sensitivity taxonomy

```clojure
(t/define "Data Sensitivity Classification"
  :purpose "Determine handling, retention, and access rules for each data field
            under GDPR"
  :root    "Any data field processed by the system"
  :criteria [
    {:name :personal      :question "Does the field relate to an identifiable person?"}
    {:name :special-category :question "Is it a special category under GDPR Art. 9?"}]
  :levels 2
  :categories [
    {:name "Non-personal"
     :definition "Data that does not relate to an identifiable natural person"
     :examples ["aggregate metrics" "product catalogue" "server region"]
     :handling {:retention :unrestricted :access :general}}
    {:name "Personal"
     :definition "Data relating to an identifiable natural person (GDPR Art. 4)"
     :parent nil
     :examples ["email" "ip-address" "device-id"]
     :handling {:retention :purpose-limited :access :need-to-know :erasure true}}
    {:name "Special category"
     :definition "Personal data revealing the categories listed in GDPR Art. 9"
     :parent "Personal"
     :examples ["health record" "biometric template" "trade-union membership"]
     :handling {:retention :strict :access :explicit-consent :encryption :required}}]
  :membership :both
  :exhaustive true
  :exclusive  false      ;; special category is a sub-type of personal — overlap is intended
  :unclassifiable :flag-for-review
  :standard   "GDPR (Regulation 2016/679)"
  :version    "1.0.0"
  :manifest   data-sensitivity)

;; Returns a taxonomy definition usable by t/classify, t/validate, t/browse.
;; ✓ :exclusive is false, declared honestly: "Special category" nests under
;;   "Personal", so a health record is legitimately both. Forcing :exclusive
;;   true here would be a lie that t/validate would later flag — the grimoire
;;   would rather the author admit the nesting up front.
;; ✓ Each :criterion is one clean question; the two levels divide on two
;;   distinct principles (is-it-personal, then is-it-special), never mixed.
;; ✓ :unclassifiable :flag-for-review, not :other-bucket: a field that fits
;;   nowhere under a regulatory taxonomy is a signal a human must see, not noise
;;   to sweep into a catch-all.
```

#### Example 2: A support-ticket triage taxonomy

```clojure
(t/define "Support Ticket Triage"
  :purpose "Route incoming tickets to the right team and priority queue"
  :root    "Any inbound customer support ticket"
  :criteria [
    {:name :nature   :question "Is the system misbehaving, or is the user asking for something?"}
    {:name :severity :question "How much is the user blocked?"}]
  :categories [
    {:name "Defect — critical"   :definition "Production is broken for many users; no workaround"
     :routes-to :on-call :sla "PT1H"}
    {:name "Defect — standard"   :definition "Something is wrong but a workaround exists"
     :routes-to :engineering :sla "P2D"}
    {:name "Feature request"     :definition "The system works as built; the user wants new behaviour"
     :routes-to :product :sla "P5D"}
    {:name "How-to question"     :definition "The system works; the user needs guidance using it"
     :routes-to :support :sla "P1D"}]
  :membership :examples
  :exhaustive true
  :exclusive  true
  :unclassifiable :other-bucket   ;; "uncategorised" queue, reviewed daily
  :version "2.3.0"
  :manifest ticket-triage)

;; ✓ Here :exclusive true is truthful and enforceable: a ticket is a defect OR
;;   a request OR a question — the nature criterion genuinely partitions. The
;;   contrast with Example 1 is the lesson: declare exclusivity only when the
;;   criteria actually partition, not as a default.
;; ✓ :other-bucket suits a high-volume operational taxonomy where an
;;   uncategorised queue reviewed daily is more practical than rejecting tickets.
```

#### Usage patterns

```clojure
;; Define, then immediately validate the declared shape before relying on it
(~> (t/define "Risk Tiers" :purpose "..." :criteria [...] :categories [...]
              :exhaustive true :exclusive true)
  (t/validate :checks [:exhaustiveness :exclusivity :criterion-consistency]))

;; Derive a taxonomy's categories from a domain model's extracted taxonomy
(t/define "Product Lines"
  :purpose    "Pricing and feature gating"
  :categories (d/extract product-domain :what :taxonomy :as :categories)
  :manifest   product-lines)
```

---

### `t/build`

Constructs a taxonomy inductively — bottom-up from a collection of existing
items or from domain knowledge — rather than declaring it top-down. Use
`t/build` when you have the things but not yet the categories, and want the
structure that is actually latent in the data.

#### Signature

```clojure
(t/build name
  :from           items | domain-model | corpus
  :purpose        "the decision the resulting taxonomy should inform"
  :guidance       "natural-language steer on what dimensions matter"
  :seed-categories [category ...]    ;; optional starting points to grow from
  :merge-threshold similarity        ;; how similar before two categories merge
  :depth          n | :auto
  :validate       boolean            ;; run t/validate on the result
  :manifest       taxonomy-binding)
```

#### Parameters

**`:from`** — The raw material: a collection of items to find structure in, a
domain model whose entities suggest categories, or a corpus of documents.
Induction needs enough items to reveal structure; a handful produces a taxonomy
that overfits the examples.

**`:guidance`** — A steer on which dimensions matter for the purpose. The same
items can be organised many ways (cluster customers by industry, by size, by
behaviour); guidance tells the construct which organisation serves the purpose.
Without it, induction picks whatever dimension is statistically loudest, which
may not be the useful one.

**`:seed-categories`** — Optional categories the practitioner already knows
should exist. Induction grows around them rather than from nothing — a hybrid
of declaration and discovery, useful when some structure is known and the rest
must be found.

**`:merge-threshold`** — How similar two emergent categories must be before
they are merged into one. Low thresholds produce many fine categories; high
thresholds produce few coarse ones. This is the main dial controlling the
granularity of the result.

#### Design rationale

`t/build` is the inductive counterpart to `t/define`'s deduction, and the pair
embodies the grimoire's "two directions of construction" principle. The reason
both exist as separate constructs — rather than one construct with a flag — is
that they fail in opposite ways and the practitioner needs to feel which risk
they are taking. Declaration risks imposing categories the data does not
support; induction risks discovering categories that fit the present items but
not the purpose. Naming them distinctly keeps the choice conscious.

The construct's emphasis on `:purpose` and `:guidance` reflects a hard truth
about inductive classification: there is no such thing as the "natural"
categorisation of a set of items. Items can be clustered along any of countless
dimensions, and which clustering is *correct* depends entirely on what the
categories are *for*. A purely data-driven `t/build` that ignored purpose would
find the dimension of greatest variance, which is frequently irrelevant
(customers vary most by signup date; nobody wants a taxonomy of signup cohorts).
By making purpose and guidance central, the construct is steered toward the
useful structure rather than the merely salient one.

`:validate true` is offered as a convenience because an inductively-built
taxonomy especially needs checking: induction can produce categories that
overlap, leave gaps, or divide inconsistently, precisely because no human
imposed the discipline of clean criteria. Building and validating in one step
makes that check the default rather than an afterthought.

#### Example: Building a taxonomy of API errors from logs

```clojure
(t/build "API Error Taxonomy"
  :from     (data/transform error-logs :operations [{:op :keep-fields [:status :message :endpoint]}])
  :purpose  "Group errors so on-call engineers can triage by likely cause and owner"
  :guidance "Organise by root cause and responsible layer (client, gateway, service,
             dependency), not by HTTP status code alone"
  :seed-categories ["Client error" "Server error"]   ;; known top-level split
  :merge-threshold 0.80
  :depth    :auto
  :validate true
  :manifest error-taxonomy)

;; Returns:
{:taxonomy "API Error Taxonomy"
 :built-from {:item-count 84210 :distinct-messages 312}
 :categories [
   {:name "Client error / malformed request"
    :parent "Client error"
    :evidence-count 41200
    :signature "4xx with validation messages"
    :examples ["missing required field" "invalid date format"]}
   {:name "Client error / authentication"
    :parent "Client error"
    :evidence-count 8800
    :examples ["expired token" "missing credentials"]}
   {:name "Server error / dependency timeout"
    :parent "Server error"
    :evidence-count 12050
    :signature "5xx correlated with downstream latency spikes"
    :examples ["payment gateway timeout" "geocoder unavailable"]}
   {:name "Server error / unhandled exception"
    :parent "Server error"
    :evidence-count 1430
    :flagged "Low volume but high diagnostic value — likely real bugs"}]
 :validation {:exhaustive true :exclusive :mostly
              :note "0.3% of errors matched two categories — see boundary cases"}}
;; ✓ The taxonomy is organised by root cause and layer, as :guidance asked —
;;   NOT by raw status code. A naive induction would have produced "400", "401",
;;   "500" categories that tell on-call nothing about who fixes what.
;; ✓ :seed-categories anchored the top-level Client/Server split the team
;;   already knew; induction grew the useful sub-structure beneath it.
;; ✓ :validate true ran t/validate inline: exclusivity is :mostly, honestly
;;   reported, with the 0.3% overlap surfaced rather than hidden.
```

#### Usage patterns

```clojure
;; Build from items, refine the result by hand, then lock the version
(~> raw-product-catalogue
  (t/build "Product Categories" :purpose "Site navigation and search facets"
           :guidance "Shopper mental model, not warehouse layout")
  (t/evolve :changes [{:rename {:from "Misc" :to "Seasonal & Gifts"}}]))

;; Build a candidate taxonomy, then align it to an industry standard to find gaps
(t/build "Internal Incident Types" :from incident-history :purpose "..."
         :manifest internal-incidents)
(t/align internal-incidents itil-incident-taxonomy :purpose "Standards gap analysis")
```

---

### `t/facet`

Defines a *faceted* classification: several independent, orthogonal dimensions
along which an item is described simultaneously, rather than a single tree in
which it occupies one place. Use `t/facet` when items genuinely have multiple
independent attributes and no single hierarchy captures them.

#### Signature

```clojure
(t/facet name
  :purpose     "what the faceted classification is for"
  :facets      {:facet-name {:values [value ...] | :open
                             :criterion "what this dimension captures"
                             :cardinality :one | :many}}
  :constraints [{:rule "cross-facet constraint" :facets [:a :b]} ...]
  :manifest    faceted-binding)
```

#### Parameters

**`:facets`** — The independent dimensions. Each facet has its own values (a
fixed set, or `:open` for free growth), a criterion describing what it captures,
and a `:cardinality` — `:one` if an item takes exactly one value on this facet
(a garment has one primary material) or `:many` if it can take several (a film
has many genres). Facets must be *orthogonal*: knowing an item's value on one
facet should tell you nothing about its value on another. Non-orthogonal facets
are a sign the structure is really a tree in disguise.

**`:constraints`** — Cross-facet rules, for the cases where facets are *mostly*
independent but a few combinations are impossible or forbidden ("a *digital*
product cannot have a *shipping-weight*"). Constraints are the exception;
needing many of them suggests the facets are not as orthogonal as assumed.

#### Design rationale

`t/facet` exists because the single most damaging mistake in classification is
forcing multi-dimensional reality into a one-dimensional tree. When an item has
several independent attributes — a wine has a *region*, a *grape*, a *vintage*,
a *style* — an enumerative taxonomy must pick an order to nest them
(region-then-grape-then-vintage…), and every choice of order is wrong for some
query, while the leaf categories multiply combinatorially. Faceted
classification refuses the false choice: each dimension stands alone, an item is
a *tuple* of facet values, and any dimension can be the one you filter or browse
by.

The construct enforces orthogonality as the defining discipline because that is
exactly what separates a real facet from a smuggled hierarchy. If two facets are
correlated — if knowing the value of one largely determines the other — they are
not independent dimensions; they are one dimension, or a parent-child pair that
belongs in a tree. The `:criterion` field on each facet forces the author to
articulate what the dimension captures, which makes accidental correlation
visible. The `:constraints` mechanism then handles the honest minority of cases
where orthogonality *almost* holds, without abandoning the faceted model for the
sake of a few impossible combinations.

#### Example: Faceted classification of a clothing catalogue

```clojure
(t/facet "Apparel Classification"
  :purpose "Power product search and filtering; one product, many filter dimensions"
  :facets {
    :category   {:values ["top" "bottom" "dress" "outerwear" "footwear" "accessory"]
                 :criterion "What kind of garment it is"
                 :cardinality :one}
    :material   {:values ["cotton" "wool" "linen" "synthetic" "leather" "blend"]
                 :criterion "Primary fabric"
                 :cardinality :many}
    :season     {:values ["spring" "summer" "autumn" "winter" "all-season"]
                 :criterion "Intended wearing season"
                 :cardinality :many}
    :formality  {:values ["casual" "smart-casual" "formal" "athletic"]
                 :criterion "Occasion register"
                 :cardinality :one}
    :colour     {:values :open
                 :criterion "Dominant colour"
                 :cardinality :many}}
  :constraints [
    {:rule "footwear cannot have :material 'linen'" :facets [:category :material]}]
  :manifest apparel-facets)

;; An item is now a tuple, not a tree-location:
;; {:category "outerwear" :material ["wool" "blend"] :season ["autumn" "winter"]
;;  :formality "smart-casual" :colour ["navy"]}
;;
;; ✓ Each facet is orthogonal: knowing a garment is "wool" tells you nothing
;;   about its :formality or :season. An enumerative tree would have forced a
;;   nesting order and produced leaves like outerwear/wool/winter/smart-casual —
;;   one rigid path per combination, useless for filtering by colour alone.
;; ✓ :cardinality is per-facet: a garment has exactly one :category but may be
;;   :many materials (a wool-blend coat). The model matches reality rather than
;;   forcing single-valued everything.
;; ✓ The lone :constraint handles the one near-impossible combination without
;;   abandoning the faceted model — the exception that proves the facets are
;;   otherwise genuinely independent.
```

#### Usage patterns

```clojure
;; Classify items against a faceted scheme — result is facet coordinates
(t/classify catalogue-items :using apparel-facets :mode :best-fit)

;; Browse by filtering on any subset of facets, in any combination
(t/browse apparel-facets
  :where {:season "winter" :formality "formal"}
  :return :matching-items)
```

---

## Part II: Applying and relating taxonomies

A taxonomy is built to be used: items are placed within it, it is mapped against
other taxonomies, and it is checked for coherence. This part covers
classification, alignment, and validation.

---

### `t/classify`

Places items within a taxonomy, returning not bare labels but placements with
confidence, the alternatives considered, and the boundary cases that were
genuinely hard to call.

#### Signature

```clojure
(t/classify items
  :using            taxonomy
  :mode             :strict | :best-fit | :multi-label
  :explain          boolean
  :surface          [:classification :confidence :alternatives :boundary-cases]
  :on-unclassifiable :reject | :other | :flag | :nearest
  :manifest         classification-binding)
```

#### Parameters

**`:items`** — One item or a collection. Each is placed independently; the
result preserves the item alongside its placement.

**`:mode`** — How placement works:
- `:strict` — an item goes in exactly one category; if it fits none, the
  `:on-unclassifiable` rule applies. Appropriate for exclusive, exhaustive
  taxonomies.
- `:best-fit` — the single most appropriate category, even if imperfect, always
  with a confidence so the imperfection is visible.
- `:multi-label` — an item may receive several categories (the natural mode for
  faceted taxonomies and for non-exclusive enumerative ones).

**`:explain`** — When true, every placement carries its reasoning: which
criteria led to the category, which evidence in the item satisfied them. Without
it, the result is placements only.

**`:surface`** — Which facets of the result to include. `:boundary-cases` is the
distinctive one: items the classifier placed but was unsure about, where a small
change in the item would flip the category. These are where a taxonomy's
definitions are tested and where misclassification concentrates.

**`:on-unclassifiable`** — What to do with an item fitting no category, which
may override the taxonomy's own `:unclassifiable` default for this run:
`:nearest` places it in the closest category but flags the stretch, useful when
some placement is better than none but the weakness must be recorded.

#### Design rationale

`t/classify` is the construct that turns a taxonomy from a document into an
instrument, and its design is dominated by one commitment: **classification is
fallible, so the result must carry its own uncertainty.** A classifier that
returns `"category-B"` and nothing else forces every downstream consumer to
treat a confident placement and a coin-flip placement identically — which is how
a 51%-confident guess ends up triggering an irreversible action. By returning
confidence, alternatives, and boundary cases as first-class output, the
construct lets the consumer decide how much weight a placement can bear.

`:boundary-cases` deserves special note because it is the construct's most
useful and least obvious output. The items a classifier is *unsure* about are
worth more than the items it is sure about: they are where the taxonomy's
category definitions are vague, where two categories abut, and where the next
misclassification will happen. Surfacing them turns classification into a
feedback signal for improving the taxonomy itself — the boundary cases of today
are the `t/evolve` refinements of tomorrow.

The three `:mode` values exist because forcing one placement model on every
taxonomy is the same error `t/facet` guards against at the schema level. A
strict, exclusive taxonomy wants `:strict`; a faceted or overlapping one wants
`:multi-label`; an imperfect-but-must-decide situation wants `:best-fit`.
Matching the classification mode to the taxonomy's actual shape is the
difference between honest and procrustean placement.

#### Example: Classifying data fields for GDPR handling

```clojure
(t/classify [{:field :email}
             {:field :dna-profile}
             {:field :ip-address}
             {:field :favourite-colour}]
  :using   data-sensitivity      ;; the taxonomy from t/define Example 1
  :mode    :strict
  :explain true
  :surface [:classification :confidence :alternatives :boundary-cases]
  :on-unclassifiable :flag
  :manifest field-classification)

;; Returns:
{:classified [
   {:item {:field :email}
    :category "Personal"
    :confidence :high
    :reasoning "Email identifies a natural person (GDPR Art. 4); not a special category"}
   {:item {:field :dna-profile}
    :category "Special category"
    :confidence :high
    :reasoning "Genetic data is explicitly named in GDPR Art. 9(1)"
    :handling {:retention :strict :encryption :required :access :explicit-consent}}
   {:item {:field :ip-address}
    :category "Personal"
    :confidence :medium
    :alternatives [{:category "Non-personal" :why "Static vs dynamic IP matters; CJEU
                    Breyer ruling treats dynamic IPs as personal only with means to identify"}]
    :boundary-case true}
   {:item {:field :favourite-colour}
    :category "Non-personal"
    :confidence :medium
    :boundary-case true
    :note "Non-personal alone, but could become personal if linked to an identifier"}]
 :boundary-cases [
   {:field :ip-address    :issue "Personal status depends on identifiability context"}
   {:field :favourite-colour :issue "Standalone non-personal; personal in combination"}]
 :flagged-unclassifiable []}
;; ✓ Placements are not bare labels: :ip-address comes back "Personal" but only
;;   :medium confidence, with the legally-contested alternative spelled out. A
;;   downstream system can route the high-confidence fields automatically and
;;   send the boundary cases to a human — exactly the discrimination a bare
;;   label would have destroyed.
;; ✓ :boundary-cases collects the two genuinely hard fields. These are the
;;   candidates for sharpening the taxonomy's definitions via t/evolve.
```

#### Usage patterns

```clojure
;; Classify, then route by confidence: automate the sure ones, review the rest
(~> incoming-fields
  (t/classify :using data-sensitivity :mode :strict :surface [:confidence :boundary-cases])
  (r/decide :route {:high :auto-apply-handling :medium :human-review :low :human-review}))

;; Multi-label classification against a faceted taxonomy
(t/classify product-items :using apparel-facets :mode :multi-label)
```

---

### `t/align`

Maps one taxonomy onto another — surfacing equivalences, gaps, conflicts, and
categories that cannot be mapped at all. The construct for reconciling an
internal scheme with a standard, comparing two vocabularies, or planning a
migration between classification systems.

#### Signature

```clojure
(t/align taxonomy-a taxonomy-b
  :purpose   "what the alignment is for"
  :direction :a-to-b | :b-to-a | :bidirectional
  :method    :by-definition | :by-examples | :by-membership | :hybrid
  :surface   [:equivalences :gaps :conflicts :unmappable]
  :produce   :crosswalk | :gap-report | :alignment-map
  :manifest  alignment-binding)
```

#### Parameters

**`:direction`** — Which way the mapping runs. `:a-to-b` answers "for each
category in A, what is its counterpart in B?" — appropriate when B is a standard
A must conform to. `:bidirectional` builds a two-way crosswalk and is necessary
when data flows both ways.

**`:method`** — How correspondence is judged: by comparing category
*definitions*, by comparing their *example* members, by comparing how actual
items are *classified* under each, or a `:hybrid` of these. Definition-matching
is fast but can miss that two differently-worded categories cover the same items;
membership-matching is grounded in reality but needs classified items to compare.

**`:surface`** — What to report. The four outcomes are the whole point of
alignment: `:equivalences` (clean matches), `:gaps` (a category in one with no
counterpart in the other), `:conflicts` (a category in A that maps to *part* of
two categories in B, or vice versa — the messy partial overlaps), and
`:unmappable` (categories with no honest correspondence at all).

**`:produce`** — The deliverable: a `:crosswalk` (a translation table), a
`:gap-report` (what is missing on each side — the usual output for compliance
gap analysis), or a full `:alignment-map`.

#### Design rationale

`t/align` exists because taxonomies do not live alone: an organisation's
internal categories must be reconciled with regulatory standards, partner
schemes, and predecessor systems, and the reconciliation is rarely clean. The
construct's design centres on refusing to pretend it is. The naive approach to
mapping two taxonomies produces a tidy table of A-category → B-category pairs;
the honest approach admits that real schemes overlap partially, leave each
other's gaps, and contain categories that simply have no counterpart. The four
`:surface` outcomes exist so that the partial and the unmappable are reported as
prominently as the clean matches — because in practice the gaps and conflicts are
where the work and the risk are.

`:conflicts` is the analytically richest output and the reason a bare mapping
table is insufficient. When category A₁ corresponds to *part* of B₁ and *part*
of B₂, that is not a mapping failure to be smoothed over — it is a structural
finding: the two taxonomies divide the space on different criteria, and any data
migrated across the seam will need a decision rule, not a lookup. Surfacing
conflicts turns alignment from a clerical task into the analysis it actually is.

The construct is also the foundation of safe taxonomy migration: a
`:bidirectional` crosswalk produced by `t/align` is exactly what `t/evolve`
preserves so that items classified under an old scheme remain reachable from a
new one. Alignment and evolution are two halves of managing classification
change across time and across systems.

#### Example: Aligning an internal scheme to a regulatory standard

```clojure
(t/align internal-data-taxonomy gdpr-data-taxonomy
  :purpose   "GDPR compliance gap analysis: where does our internal scheme fail
              to capture a regulatory distinction?"
  :direction :a-to-b
  :method    :hybrid
  :surface   [:equivalences :gaps :conflicts :unmappable]
  :produce   :gap-report
  :manifest  gdpr-gap-report)

;; Returns:
{:alignment "internal-data-taxonomy → GDPR"
 :equivalences [
   {:internal "PII"          :gdpr "Personal" :confidence :high}
   {:internal "Public data"  :gdpr "Non-personal" :confidence :high}]
 :gaps [
   {:in :gdpr-not-internal "Special category (Art. 9)"
    :impact "Internal scheme does not distinguish health/biometric/genetic data —
             these are handled identically to ordinary PII, under-protecting them"
    :severity :critical}]
 :conflicts [
   {:internal "Sensitive"
    :maps-to-parts-of ["Personal" "Special category"]
    :issue "Internal 'Sensitive' mixes ordinary personal data with Art. 9 data on a
            different criterion (business-confidentiality, not regulatory-sensitivity).
            Cannot map cleanly — needs a splitting rule."}]
 :unmappable [
   {:internal "Commercially confidential"
    :why "A business-secrecy category with no GDPR counterpart; orthogonal to the
          personal-data axis entirely"}]
 :recommendation "Add a 'Special category' distinction to the internal taxonomy
                  (closes the critical gap); split 'Sensitive' along the regulatory
                  criterion rather than the confidentiality one."}
;; ✓ The critical finding is a GAP, not an equivalence: the internal scheme has
;;   no concept of Art. 9 special-category data, which means health data is being
;;   under-protected. A tidy mapping table would have hidden this by forcing
;;   "Sensitive" to stand in for "Special category".
;; ✓ The :conflict on "Sensitive" names the real structural problem — the two
;;   taxonomies divide on different criteria — and says what is needed (a split),
;;   rather than papering over the partial overlap.
```

#### Usage patterns

```clojure
;; Produce a bidirectional crosswalk to support data flowing both ways
(t/align scheme-v1 scheme-v2 :direction :bidirectional :produce :crosswalk
         :manifest v1-v2-crosswalk)

;; Align internal incidents to ITIL, feed the gaps into taxonomy evolution
(~> (t/align internal-incidents itil-taxonomy :produce :gap-report)
  (t/evolve internal-incidents :changes derived-from-gaps :produce-crosswalk true))
```

---

### `t/validate`

Checks a taxonomy for the properties that make it coherent: exhaustiveness,
exclusivity, consistent criteria, and reachability. The quality gate for a
taxonomy before it is trusted to classify.

#### Signature

```clojure
(t/validate taxonomy
  :checks  [:exhaustiveness :exclusivity :criterion-consistency
            :reachability :balance :definition-sharpness]
  :against sample-items            ;; optional: test the taxonomy on real items
  :strict  boolean
  :output  :validation-report)
```

#### Parameters

**`:checks`** — The properties to verify:
- `:exhaustiveness` — does every item in the domain fit somewhere? Tested
  against `:against` items if supplied, or assessed structurally.
- `:exclusivity` — does any item fit in more than one category where the
  taxonomy claims to be exclusive?
- `:criterion-consistency` — does each level divide on a single criterion, or
  are criteria mixed within a level (the classic source of overlap)?
- `:reachability` — can every category actually be reached by descending the
  criteria? An unreachable category is dead — no item will ever be routed to it.
- `:balance` — are items spread across categories, or do 99% land in one? A
  wildly unbalanced taxonomy is often a sign the wrong criterion was chosen.
- `:definition-sharpness` — are category definitions precise enough to
  adjudicate borderline items, or are they so vague that placement is arbitrary?

**`:against`** — An optional sample of real items. Structural checks assess the
taxonomy's form; testing against real items reveals whether the form survives
contact with the data — gaps and overlaps that only appear in practice.

**`:strict`** — When true, any failed check fails validation. When false,
failures are reported as warnings and the report is advisory.

#### Design rationale

`t/validate` operationalises the grimoire's honesty principle: a taxonomy's
claimed properties (`:exhaustive`, `:exclusive` from `t/define`) are assertions,
and assertions should be checkable. The construct exists so that "this taxonomy
is exhaustive and exclusive" is a testable claim rather than a hopeful label.

The most valuable and least obvious check is `:criterion-consistency`, because
it catches the root cause of most taxonomy defects rather than their symptoms.
Overlap and gaps are *symptoms*; mixing two criteria at one level is the
*disease*. A taxonomy that splits customers by "region and size" at one level
will inevitably produce a customer who is in two categories (large *and*
European) — and fixing the overlap case-by-case never works because the
structure itself is malformed. By checking that each level divides on one
principle, `t/validate` finds the structural fault that produces the surface
errors.

`:reachability` and `:balance` together catch the taxonomy that is technically
valid but practically useless — categories no item reaches, or a single category
swallowing everything. These are not coherence failures in the logical sense;
they are *design* failures, and a validator that checked only logical properties
would pass a taxonomy that no one can actually use. Including them reflects the
grimoire's stance that a taxonomy is judged by its purpose, not only by its form.

#### Example: Validating a taxonomy against real data

```clojure
(t/validate ticket-triage           ;; from t/define Example 2
  :checks  [:exhaustiveness :exclusivity :criterion-consistency :balance]
  :against last-quarter-tickets      ;; 12,000 real tickets
  :strict  true
  :output  :validation-report)

;; Returns:
{:taxonomy "Support Ticket Triage"
 :verdict  :fail
 :checks {
   :exhaustiveness {:status :pass
                    :detail "All 12,000 tickets placed; 47 went to :other-bucket (0.4%)"}
   :exclusivity    {:status :pass
                    :detail "No ticket matched two categories — nature criterion partitions cleanly"}
   :criterion-consistency {:status :pass
                           :detail "Each level divides on one criterion (nature, then severity)"}
   :balance        {:status :fail
                    :detail "61% of tickets land in 'How-to question'; 'Defect — critical' holds 0.8%"
                    :assessment "Not necessarily wrong — but the dominance of how-to questions
                                 suggests a documentation gap, and may warrant sub-dividing that
                                 category for finer routing"}}
 :recommendations [
   "Consider sub-dividing 'How-to question' by feature area to route to the right
    support specialist — at 61% it is doing too much work as a single bucket"
   "Review the 47 other-bucket tickets monthly; if a pattern emerges, add a category"]}
;; ✓ The taxonomy is logically sound (exhaustive, exclusive, consistent criteria)
;;   but fails :balance under :strict — and the report is careful to say imbalance
;;   is not automatically a defect, only a signal worth investigating. The
;;   validator informs judgement rather than replacing it.
;; ✓ Testing :against 12,000 real tickets is what surfaced the imbalance;
;;   a purely structural check would have passed this taxonomy.
```

#### Usage patterns

```clojure
;; Gate: a taxonomy must pass strict validation before it is allowed to classify
(~> candidate-taxonomy
  (t/validate :checks [:exhaustiveness :exclusivity :criterion-consistency] :strict true)
  ;; only reached if validation passes
  (t/classify backlog-items :using candidate-taxonomy))
```

---

## Part III: Navigating and evolving taxonomies

A taxonomy in use must be queried and, over time, changed. This part covers
browsing and the disciplined evolution that keeps historical classifications
reachable.

---

### `t/browse`

Queries and navigates a taxonomy — finding categories, traversing paths,
filtering by facet, and retrieving the items classified under a category. The
read interface to a taxonomy.

#### Signature

```clojure
(t/browse taxonomy
  :find    "what to look for" | category-name | :all
  :where   {:facet value ...}        ;; for faceted taxonomies
  :include [:definition :examples :children :siblings :path :item-count]
  :depth   n | :all
  :return  :categories | :matching-items | :path | :subtree
  :output  :browse-results)
```

#### Parameters

**`:find`** — The query: a search string matched against category names and
definitions, a specific category to centre on, or `:all` to list the taxonomy.

**`:where`** — For faceted taxonomies, a filter expressed as facet-value pairs.
`{:season "winter" :formality "formal"}` returns the items (or category region)
matching that coordinate combination — the natural query mode for a faceted
scheme, where any combination of dimensions can be a query.

**`:return`** — The shape of the result: the matching `:categories` themselves,
the `:matching-items` classified under them, the `:path` from root to a category
(its full lineage of criteria), or the whole `:subtree` beneath a category.

#### Design rationale

`t/browse` is the deliberately humble read counterpart to the rest of the
grimoire's write operations, and its design is mostly about serving both shapes
of taxonomy through one interface. An enumerative taxonomy is navigated by
*path* — descending from root through criteria — so `:return :path` and
`:return :subtree` and traversal by parent/child are its natural verbs. A
faceted taxonomy has no paths; it is navigated by *coordinate*, filtering on
facet values, so `:where` is its natural verb. By offering both through one
construct, `t/browse` lets a consumer query whichever kind of taxonomy it holds
without changing tools.

The `:include :path` option matters more than it appears to: a category's path
from the root *is* its meaning, because the path is the sequence of criteria
that defines it. "Server error / dependency timeout" means what it means because
of the two criteria descended to reach it. Returning the path returns the
definition-by-construction, which is often more useful than the category's prose
definition alone.

#### Example: Navigating an enumerative and a faceted taxonomy

```clojure
;; Enumerative: find a category and see its place in the tree
(t/browse error-taxonomy           ;; from t/build
  :find    "timeout"
  :include [:definition :path :siblings :item-count]
  :return  :categories)

;; Returns:
{:matches [
   {:category "Server error / dependency timeout"
    :path     ["API Error" "Server error" "dependency timeout"]
    :definition "5xx errors correlated with downstream latency spikes"
    :siblings ["unhandled exception" "resource exhaustion"]
    :item-count 12050}]}
;; ✓ The :path is the category's real definition: it IS a server error that IS a
;;   dependency timeout. The prose definition restates what the path already says.

;; Faceted: filter by a coordinate combination
(t/browse apparel-facets           ;; from t/facet
  :where  {:season "winter" :formality "formal" :material "wool"}
  :return :matching-items)

;; Returns the items at that facet coordinate — no path involved, because a
;; faceted taxonomy has coordinates, not paths.
;; ✓ The same construct serves both shapes: :path/:siblings for the tree,
;;   :where for the coordinate space.
```

#### Usage patterns

```clojure
;; Generate a navigable category menu for a UI from the taxonomy
(t/browse product-categories :find :all :depth 2 :return :subtree :include [:children :item-count])

;; Look up exactly how an item would be handled by finding its category's rules
(~> (t/classify {:field :biometric-template} :using data-sensitivity)
  (t/browse data-sensitivity :find :classified-category :include [:definition]))
```

---

### `t/evolve`

Manages change to a taxonomy over time — adding, splitting, merging, renaming,
and deprecating categories — while producing the crosswalk that keeps everything
classified under the old shape reachable from the new one.

#### Signature

```clojure
(t/evolve taxonomy
  :changes          [{:add | :split | :merge | :rename | :deprecate change-spec} ...]
  :produce-crosswalk boolean
  :notify-affected  boolean
  :version          "semver for the evolved taxonomy"
  :manifest         evolved-binding)
```

#### Parameters

**`:changes`** — The operations to apply:
- `:add` — introduce a new category (with its definition and place)
- `:split` — divide one category into several; requires a rule for routing the
  old category's members into the new ones
- `:merge` — combine several categories into one
- `:rename` — change a category's name, preserving its identity and members
- `:deprecate` — retire a category without deleting it; existing classifications
  remain valid but nothing new is routed there

**`:produce-crosswalk`** — When true, emit a translation table from old
categories to new. This is the parameter that makes evolution *safe*: without a
crosswalk, every item classified under the old taxonomy is orphaned the moment
the new one ships. With it, an old classification can always be translated to its
new equivalent.

**`:notify-affected`** — When true, identify what depends on the changed
categories — classified datasets, downstream rules, consuming systems — so the
blast radius of the change is known before it lands.

#### Design rationale

`t/evolve` exists because a taxonomy is a living artefact, and the dangerous
moment in its life is change. A category system that never changed would not
need this construct; real ones change constantly — new kinds of thing appear, a
coarse category proves too broad, two categories turn out to be one — and each
change threatens to invalidate every classification ever made under the old
shape. The construct's entire reason for being is to make that change
*non-destructive*.

The load-bearing commitment is `:produce-crosswalk`. The naive way to evolve a
taxonomy is to edit it in place; the result is that yesterday's classifications
now refer to categories that no longer exist or have changed meaning, silently.
This is the taxonomy equivalent of a breaking schema change with no migration —
and it has the same consequence: historical data becomes uninterpretable. By
making the crosswalk a first-class output, `t/evolve` ensures that the path from
old to new is always recorded, so that a `:split` (the most dangerous change,
because one old category becomes ambiguous across several new ones) carries the
rule needed to reclassify its members, and a `:rename` preserves identity rather
than appearing to delete-and-create.

`:deprecate` rather than delete reflects the same lesson the `data` grimoire's
contract evolution and tombstoning teach: a retired category is not the same as
a category that never existed. Items were classified under it; reports
referenced it; "this was a Class-B incident in 2023" remains a fact even after
Class-B is retired. Deprecation keeps the old category interpretable for
historical data while routing nothing new to it.

#### Example: Splitting an overgrown category with a crosswalk

```clojure
;; The t/validate report flagged "How-to question" as 61% of tickets — split it
(t/evolve ticket-triage
  :changes [
    {:split "How-to question"
     :into  ["How-to — billing" "How-to — integrations" "How-to — account settings"]
     :rule  "Route by the feature area named in the ticket; ambiguous → 'account settings'"}
    {:add "Defect — security"
     :definition "A defect with security or data-exposure implications"
     :parent "Defect" :routes-to :security-on-call :sla "PT30M"}
    {:deprecate "Feature request"
     :reason "Feature requests now captured in the product portal, not support"
     :keep-for-historical true}]
  :produce-crosswalk true
  :notify-affected   true
  :version           "3.0.0"          ;; splits and deprecations are breaking → major bump
  :manifest          ticket-triage-v3)

;; Returns:
{:taxonomy "Support Ticket Triage"
 :version  "3.0.0"
 :evolved-from "2.3.0"
 :changes-applied 3
 :crosswalk [
   {:from "How-to question" :to ["How-to — billing" "How-to — integrations"
                                 "How-to — account settings"]
    :type :split
    :reclassification-rule "Route by feature area; ambiguous → account settings"
    :note "Old classifications must be re-run through the rule; not a 1:1 mapping"}
   {:from "Feature request" :to "Feature request (deprecated)"
    :type :deprecate
    :note "Historical tickets keep the category; no new tickets routed here"}]
 :affected [
   {:dependency "Routing rules in support system" :impact "Must handle 3 new how-to queues"}
   {:dependency "Q2 ticket report"  :impact "How-to breakdown changes shape; add crosswalk note"}
   {:dependency "12,000 classified tickets" :impact "How-to tickets need re-running through split rule"}]}
;; ✓ The :split produced a crosswalk with a RECLASSIFICATION RULE, not a 1:1 map —
;;   because one old category becoming three is inherently ambiguous, and the
;;   rule is what resolves the ambiguity for every historical ticket. This is the
;;   exact failure a naive in-place edit would have caused: 12,000 tickets
;;   stranded under a category that no longer exists.
;; ✓ "Feature request" was DEPRECATED, not deleted: historical tickets keep their
;;   classification and remain interpretable, while nothing new routes there.
;; ✓ :notify-affected surfaced the full blast radius — routing rules, a report,
;;   and 12,000 classified items — before the change ships, not after it breaks them.
;; ✓ Version bumped 2.3.0 → 3.0.0: a split and a deprecation are breaking changes
;;   to anything that consumed the old categories.
```

#### Usage patterns

```clojure
;; Evolve in response to validation findings, then re-validate the result
(~> ticket-triage
  (t/evolve :changes split-overgrown-category :produce-crosswalk true)
  (t/validate :checks [:balance :exhaustiveness] :strict true))

;; Apply a crosswalk to re-classify historical data after evolution
(~> historical-classifications
  (t/classify :using (:crosswalk ticket-triage-v3)))   ;; translate old → new
```

---

## Best practices

### Choose the shape before the categories

The first decision is enumerative or faceted, and it precedes naming any
category. If items have one dominant principle of division and belong in one
place, use `t/define` or `t/build`. If items have several independent attributes
and any of them might be the one you query by, use `t/facet`. Choosing a tree
for faceted reality is the most expensive mistake in classification, and it is
made before a single category is named.

### Let the purpose decide what distinctions matter

Every category distinction should earn its place by mattering to the taxonomy's
purpose. Two items belong in different categories if and only if the purpose
treats them differently. A distinction the purpose ignores is noise; a
distinction the purpose needs but the taxonomy lacks is a gap. State the purpose
first, and measure every category against it.

### Validate against real items, not only structure

A taxonomy can be structurally flawless and practically useless. Run
`t/validate` with `:against` a real sample before trusting it: structural checks
catch logical incoherence, but only contact with real items reveals the gaps, the
overlaps, and the one category that swallows everything.

### Surface confidence; never launder a guess into a fact

When classifying, always carry confidence and boundary cases forward. A
`:best-fit` placement at medium confidence is a different thing from a strict
placement at high confidence, and collapsing them lets a coin-flip trigger an
irreversible action. Route the confident placements automatically and the
boundary cases to review.

### Anti-patterns

**Forcing faceted reality into an enumerative tree.** When items have several
independent attributes, nesting them in a hierarchy forces an arbitrary order
and explodes the leaf categories (`red-cotton-summer-medium`). The symptom is a
tree where the same concept reappears under many branches, or where users
complain they cannot find things because they would have looked under a different
top-level split. Use `t/facet`; let the item be a coordinate, not a location.

**Mixing criteria at one level.** Splitting categories by two principles at once
(by region *and* by size) guarantees overlap: an item is large *and* European and
fits two categories. The overlap cannot be fixed case-by-case because the
structure is malformed. One criterion per level; if two matter, they are two
levels or two facets.

**Declaring exhaustive or exclusive without meaning it.** Marking a taxonomy
`:exhaustive true` because it feels complete, then dropping unclassifiable items
silently, is how bad data enters a system. Declare these properties only when
`t/validate` can hold the taxonomy to them, and always specify
`:unclassifiable` handling.

**Evolving a taxonomy in place without a crosswalk.** Editing categories
directly orphans every classification made under the old shape — the
classification equivalent of a breaking schema change with no migration. Always
`t/evolve` with `:produce-crosswalk true` so historical classifications remain
translatable, and `:deprecate` rather than delete so retired categories stay
interpretable for old data.

---

## Integration patterns

### Taxonomy as the bridge between domain and decision

A taxonomy turns a `domain` model's distinctions into placements that
`reasoning` can act on. The domain grimoire extracts the categories; taxonomy
formalises and applies them; reasoning decides what each placement means.

```clojure
;; Domain extracts the raw taxonomy; t/define formalises it; t/classify applies it
(def regulatory-domain (d/explore "regulation.pdf" :focus [:taxonomy :constraints]))

(def sensitivity-taxonomy
  (t/define "Data Sensitivity"
    :purpose    "Determine handling rules"
    :categories (d/extract regulatory-domain :what :taxonomy :as :categories)
    :exhaustive true))

(~> system-data-fields
  (t/classify :using sensitivity-taxonomy :mode :strict :surface [:confidence :boundary-cases])
  (r/decide :handling-rules :per-category))
```

### Classification feeding data validation

A taxonomy's categories can become an enum constraint in a `data/schema`, and a
classification result can be validated as data.

```clojure
;; Use a taxonomy's categories as the valid values for a schema field
(data/schema :ticket
  :fields {:triage-category {:type :enum
                             :values (t/browse ticket-triage :find :all :return :categories)}})
```

### Taxonomy evolution paired with data contracts

When a taxonomy that classifies shared data evolves, the change is a schema
evolution from the `data` grimoire's perspective — and the crosswalk is the
migration.

```clojure
;; A taxonomy split is a breaking change to consumers of the classified data
(~> ticket-triage
  (t/evolve :changes category-split :produce-crosswalk true :notify-affected true)
  ;; the crosswalk becomes the migration applied to historical classifications
  (data/expect :expectations [{:expect :referential :field :triage-category
                               :params {:exists-in evolved-categories}}]))
```

---

## Grimoire metadata

```clojure
{:grimoire    "taxonomy"
 :namespace   "t/"
 :version     "1.0.0"
 :description "Definition, construction, application, alignment, validation,
               navigation, and evolution of classification systems —
               enumerative and faceted"

 :constructs {
   :definition  [t/define t/build t/facet]
   :application [t/classify t/align t/validate]
   :lifecycle   [t/browse t/evolve]}

 :best-for [
   "Defining classification schemes with explicit criteria and membership rules"
   "Building taxonomies inductively from items, logs, or domain knowledge"
   "Faceted (multi-dimensional) classification where items have independent attributes"
   "Classifying items with confidence, alternatives, and boundary-case surfacing"
   "Aligning an internal scheme to a standard for compliance gap analysis"
   "Validating taxonomies for exhaustiveness, exclusivity, and criterion consistency"
   "Evolving taxonomies safely with crosswalk preservation across versions"]

 :works-with [:domain :data :reasoning :core]

 :key-concepts [
   {:term "Taxonomy"
    :definition "A principled system of categories governed by criteria that
                 determine what belongs where. Distinct from a flat list of
                 labels: a taxonomy can explain and defend each placement."}
   {:term "Enumerative taxonomy"
    :definition "A tree in which each item occupies one place, reached by
                 descending through criteria. One principle of division per level."}
   {:term "Faceted taxonomy"
    :definition "A set of independent, orthogonal dimensions along which an item
                 is described simultaneously. An item is a tuple of facet values,
                 not a location in a tree."}
   {:term "Criterion"
    :definition "The question that distinguishes categories at one level of a
                 taxonomy. A well-formed level divides on exactly one criterion;
                 mixing criteria at a level is the root cause of overlap."}
   {:term "Exhaustiveness"
    :definition "The property that every item in the domain fits some category.
                 A checkable claim, not an assumption."}
   {:term "Mutual exclusivity"
    :definition "The property that no item fits more than one category. Real
                 taxonomies often violate it (via nesting or overlap); the
                 violation must be declared, not hidden."}
   {:term "Boundary case"
    :definition "An item a classifier placed but was unsure about, where a small
                 change would flip the category. Boundary cases reveal where
                 category definitions are vague and where misclassification concentrates."}
   {:term "Crosswalk"
    :definition "A translation table between the categories of two taxonomies, or
                 between the old and new versions of one. What keeps historical
                 classifications reachable after a taxonomy changes."}]}
```

---

## Implementation notes for LLM processors

### Define versus build

When processing `t/define`, treat the practitioner's `:categories` and
`:criteria` as authoritative — this is declared intent, and the processor's job
is to formalise and check it, not to second-guess the structure. When processing
`t/build`, the processor *discovers* structure, and must steer that discovery by
`:purpose` and `:guidance` rather than by raw statistical salience. The single
most common `t/build` error is organising items by their highest-variance
dimension when that dimension is irrelevant to the purpose; always prefer the
dimension the purpose cares about, even when another varies more.

### Criterion consistency is the root-cause check

Across `t/define`, `t/build`, and `t/validate`, treat single-criterion-per-level
as the governing discipline. When a level appears to divide on two criteria at
once, flag it — this is the structural fault that produces overlap and gaps
downstream, and catching it at definition time is far cheaper than catching its
symptoms at classification time. For faceted taxonomies the analogous check is
orthogonality: if two facets are strongly correlated, report them as candidates
for merging or for re-modelling as a parent-child pair.

### Classification must carry uncertainty

`t/classify` must never return a bare category when the placement is uncertain.
Always attach a confidence, and when confidence is below high, populate
`:alternatives` with the runner-up categories and the reason each was plausible.
Populate `:boundary-cases` with any item where a small change in its attributes
would change its category. Treat an empty `:boundary-cases` on a large, varied
input set as suspicious — real data almost always contains borderline items, and
their absence usually means the classifier failed to look for them.

In `:strict` mode, an item fitting no category triggers `:on-unclassifiable`;
never force such an item into the nearest category silently. `:nearest` placement
is permitted only when explicitly requested, and even then must set a flag
recording the stretch.

### Alignment must report partial and unmappable correspondences

`t/align` must not reduce two taxonomies to a tidy one-to-one table. Report
`:gaps` (a category present in one taxonomy, absent in the other) and
`:conflicts` (a category mapping to parts of several categories in the other) as
prominently as clean `:equivalences`. A conflict is a structural finding — the
two taxonomies divide on different criteria — and must be reported as such, with
a note on what splitting or merging rule a migration would need. Categories with
no honest counterpart go in `:unmappable`; never invent a forced mapping to make
the table look complete.

### Evolution must preserve reachability

When processing `t/evolve` with `:produce-crosswalk true`, every change must
appear in the crosswalk. A `:split` is the highest-risk change: one old category
maps to several new ones, so the crosswalk entry must carry the reclassification
*rule*, not a one-to-one mapping, because old members must be re-routed
individually. A `:rename` preserves category identity and all members — represent
it as identity-preserving, never as delete-plus-create. A `:deprecate` retains
the category for historical classifications and routes nothing new to it; never
treat deprecation as deletion. Splits, merges, and deprecations are breaking
changes to anything consuming the old categories and warrant a major version bump.

### Unclassifiable handling is never silent

Across `t/define` and `t/classify`, an item that fits no category must always be
handled by an explicit rule (`:reject`, `:other-bucket`, `:flag-for-review`, or
`:nearest`). The processor must never drop an unclassifiable item without
recording it. When a taxonomy is declared `:exhaustive true` and an item proves
unclassifiable against real data, that is a validation finding to surface, not an
error to suppress — it means either the taxonomy or the exhaustiveness claim is
wrong.

---

*Classification is the shape of a system's judgement. A taxonomy built with clean
criteria, honest about its gaps, and evolved without orphaning its past is a
system that can explain why it treats each thing the way it does — which is the
difference between a judgement and a guess.*