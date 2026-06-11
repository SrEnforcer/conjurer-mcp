# exhume.md — Conjurer Exhumation Grimoire

The spellbook for archaeology. Every other grimoire moves intent *forward* —
from a charter through targets to materialised code. `exhume` runs the flow
*backward*: it reads a codebase that already exists, recovers the intent buried
in it, and emits Conjurer specification from artefacts that were never written
in Conjurer. It is how a project with a past enters the language.

---

## Philosophy

### Why recovery deserves its own grimoire

Conjurer's whole ecosystem flows in one direction. A `charter` states intent;
`target` declares what to build; `handover` packages it; materialisation
produces code. Spec becomes artefact. But software does not begin at the
charter. Most real projects begin with a codebase that already exists — a prior
attempt, an inherited system, a working tool whose design lives only in its
source — and that accumulated work is the opposite of a charter: it is intent
*solidified into artefact*, with the reasoning that produced it left behind.

No forward construct can read it. `d/explore` extracts a domain model, but from
documents and described knowledge, not from a TypeScript repository. `w/analyze`
reverse-engineers, but only websites, into design systems. `data/profile`
recovers structure, but from datasets. Each is an extraction tool aimed at a
different substrate, and none of them has source code, build configuration,
test suites, or git history as its subject. More fundamentally, the *direction*
is unmodelled: the lexicon can turn a specification into code, but nothing turns
code back into a specification. `exhume` is that inverse, and the inverse is a
genuinely different discipline — not because code is just another input type,
but because recovering intent from a finished artefact is a distinct intellectual
act with its own evidence, its own failure modes, and its own irreducible
uncertainty.

That uncertainty is the heart of the grimoire. When you read a charter, you read
what someone *meant*. When you read code, you read what someone *did*, and you
must infer what they meant — and the inference is always partial. A function
name suggests a purpose but does not state one; a git message claims a reason
but may not be the real one; a module boundary reveals a decision but not why it
was made or what was rejected. Recovery is reading tea leaves with rigour. It
deserves a grimoire precisely because doing it *honestly* — marking what is
attested versus inferred, never dressing a guess as a finding — is a skill the
forward constructs never need and the rest of the lexicon does not encode.

### What principles govern the design

**Artefact is evidence of intent, not intent itself.** This is the founding
commitment, and every construct enforces it. The code is a witness, not a
confession. What the code demonstrably *does* is **attested** — it can be read
directly and is as reliable as the reading. What the author *meant* by it is
**inferred** — reconstructed from naming, structure, comments, and history, and
only ever probable. `exhume` never collapses the two. Every recovered claim
carries its evidential status, so a practitioner can tell the load-bearing fact
from the educated guess and know which to trust when they conflict.

**Recovery emits into the lexicon, it does not terminate in a report.** The
point of exhuming a codebase is not to describe it but to *bring it into
Conjurer* — to produce a charter someone can continue from, an `asset`
recording its real conventions, a `target` describing its modules, a domain
model the rest of the grimoires can work with. `exhume`'s outputs are Conjurer
specification, which is what makes it the true inverse of materialisation rather
than just another analysis tool. Its capstone, `x/charter`, closes the loop:
spec → code → spec.

**Confidence is first-class and graded, never binary.** Recovered intent ranges
from near-certain (a pure function's behaviour, read off its body) to frankly
speculative (why a decision was made, inferred from a terse commit). The
grimoire grades this explicitly — `:attested`, `:strongly-inferred`,
`:speculative` — rather than presenting recovery as fact. A recovery that hides
its own uncertainty is worse than no recovery, because it launders a guess into
a premise the practitioner then builds on.

**Recover what is there; do not improve, judge, or invent.** `exhume` reports
the codebase as it is, including its inconsistencies, its dead code, and its
contradictions between what comments claim and what code does. It does not
silently correct, editorialise, or recommend — those are forward acts (`refine`,
`d/evolve`) for after recovery. The discipline is the archaeologist's: document
the dig faithfully; interpretation and restoration come later, as separate,
visible steps.

### Naming rationale

**`exhume`** — From Latin *ex* (out of) + *humus* (the ground): to unearth what
was buried. The metaphor is exact. The intent that produced a codebase is not
gone — it is *interred* in the artefact, and recovery is the careful unearthing
of it. The word carries the right caution, too: what you exhume is what was left
behind, partial and weathered, never the living original.

**`x/`** — The namespace prefix. The unknown, marking the spot — fitting for a
grimoire whose subject is what has not yet been recovered.

**`survey`** — From Old French *surveeir*, to look over. The first, broad pass
over the site before any digging.

**`recover`** — To get back something lost. The domain model was never written
down; recovery gets it back from where it was implicit.

**`infer`** — From Latin *inferre*, to bring in, to conclude. Conventions are
not declared in code; they are inferred from how the code is consistently
written.

**`reconstruct`** — To build again from remains. The decision log was never
kept; it is reconstructed from the traces decisions leave.

---

## Part I: Survey and recovery

The recovery arc begins with a cheap, broad orientation, then deepens: the
domain model, the conventions, the decisions. This part covers the first three.
The capstone that emits a `.cnj` from all of them is Part II.

---

### `x/survey`

Produces a first-pass map of a codebase — its languages, structure, entry
points, scale, and apparent purpose — cheaply, before any deeper recovery. The
orientation pass that tells a practitioner what they are looking at and where
the deep work will be.

#### Signature

```clojure
(x/survey source
  :scope      :repository | :directory | :package
  :detect     [:languages :structure :entry-points :dependencies :scale
               :test-coverage :apparent-purpose]
  :depth      :shallow | :standard
  :note       [:reusable :dead-code :inconsistencies]   ;; surface signals worth flagging
  :manifest   survey-binding)
```

#### Parameters

**`:source`** — What to survey: a path to a repository, a directory, or a single
package. The survey reads breadth-first — it does not descend into every
function, only enough to map the territory.

**`:detect`** — What to map. `:apparent-purpose` is the interpretive one and is
marked as inferred; the rest (`:languages`, `:structure`, `:entry-points`,
`:dependencies`, `:scale`) are largely attested — they can be read directly from
the files and manifests.

**`:note`** — Optional signals to flag for the practitioner's judgement, not to
act on: `:reusable` (code that looks salvageable for a new effort), `:dead-code`
(unreferenced, apparently unused), `:inconsistencies` (places where the codebase
contradicts itself). These are observations, not recommendations.

#### Design rationale

`x/survey` exists because deep recovery is expensive and most of a codebase does
not need it. Reading every module to recover a domain model is wasteful when a
breadth-first pass can show that the model lives in three of forty files. The
survey is the archaeologist's initial walk over the site — where are the
structures, how big is the dig, what era is this — before a single trench is
opened. It makes the rest of the arc targeted rather than exhaustive.

The construct's discipline is that **the survey is mostly attested and says so**.
Languages, file structure, dependency manifests, line counts, test presence —
these are read directly and are reliable. The construct keeps `:apparent-purpose`
visibly separate as the one inferred field, so the practitioner is not misled
into trusting a guess about *what the project is for* as if it were as solid as
the file count. This sets the honesty pattern the whole grimoire follows, at the
cheapest possible depth.

`:note` is deliberately framed as flagging, not deciding. The temptation in
surveying an old codebase is to start recommending what to keep and what to cut —
but that is judgement the practitioner must own, and dressing observations as
recommendations is exactly the overreach the grimoire forbids. The survey points
at reusable code and dead code; it does not tell you to reuse or delete.

#### Example: Surveying a prior codebase before reuse

```clojure
(x/survey "../old-conjurer-mcp"
  :scope    :repository
  :detect   [:languages :structure :entry-points :dependencies :scale :apparent-purpose]
  :note     [:reusable :dead-code]
  :depth    :standard
  :manifest old-mcp-survey)

;; Returns:
{:source "../old-conjurer-mcp"
 :attested {
   :languages    {:typescript 0.94 :json 0.05 :markdown 0.01}
   :scale        {:files 38 :total-lines 6200 :largest "src/index.ts (4080 lines)"}
   :structure    {:layout :flat :note "Almost all logic in one src/index.ts"}
   :entry-points ["src/index.ts (stdio server bootstrap)"]
   :dependencies {:runtime ["@modelcontextprotocol/sdk"] :dev ["typescript" "esbuild"]}
   :test-coverage {:present false}}
 :inferred {
   :apparent-purpose {:claim "An MCP server exposing the Conjurer spec to an agent"
                      :confidence :strongly-inferred
                      :evidence "SDK dependency, stdio bootstrap, spec file reads"}}
 :notes {
   :reusable  ["EDN parser (src/index.ts ~L900-1300) — self-contained, no god-file
                coupling; strong reuse candidate"
               "Tool input schemas — directly portable"]
   :dead-code ["src/index.ts ~L3800-4080 — an unreferenced second formatter"]}}
;; ✓ The single 4080-line index.ts is reported as an attested fact, not judged —
;;   the practitioner already knows it's the anti-pattern to fix; the survey just
;;   locates it. :apparent-purpose is the one inferred field and is marked as such.
;; ✓ :notes flag the EDN parser as reusable and a block as dead, but as
;;   observations for the practitioner's decision — the survey does not say
;;   "extract the parser" or "delete lines 3800-4080".
```

#### Usage patterns

```clojure
;; Survey first, then aim deep recovery only where the survey points
(~> (x/survey "../legacy-system" :detect [:structure :apparent-purpose])
  (x/recover-model :focus (:domain-bearing-modules *1)))

;; Survey to decide reuse before starting a fresh project
(x/survey "../old-conjurer-mcp" :note [:reusable :dead-code])
;; → feeds the practitioner's keep/discard decision; does not make it
```

---

### `x/recover-model`

Recovers a domain model from source code — the entities, their relationships,
the operations performed on them, and the invariants the code enforces — marking
each recovered element as attested or inferred. The code-facing twin of
`d/explore`.

#### Signature

```clojure
(x/recover-model source
  :from        [:types :functions :schemas :tests :api-surface]
  :recover     [:entities :relationships :operations :invariants :vocabulary]
  :focus       [module-or-path ...]        ;; narrow to where the model lives
  :confidence  :grade-each                 ;; attach an evidential grade per element
  :emit        :domain-model | :d-explore-compatible
  :manifest    recovered-model)
```

#### Parameters

**`:from`** — Which artefacts to read the model out of. Each is differently
reliable: `:types` and `:schemas` are strong evidence of entities (a type
*is* a declared shape); `:tests` are strong evidence of *intended behaviour*
(a test asserts what should be true); `:functions` reveal operations;
`:api-surface` reveals what the system offers outward. The construct weights
recovery by source reliability.

**`:recover`** — What to extract: `:entities` (the things), `:relationships`
(how they connect), `:operations` (what is done to them), `:invariants` (rules
the code enforces — often the most valuable and most buried), `:vocabulary` (the
names the codebase actually uses, which become a recovered ubiquitous language).

**`:confidence :grade-each`** — Attach an evidential grade to every recovered
element. An entity read from a type declaration is `:attested`; a relationship
inferred from how two functions are called together is `:strongly-inferred`; an
invariant guessed from a single validation check is `:speculative`. This is the
construct's core honesty mechanism.

**`:emit`** — `:d-explore-compatible` produces a model in the same shape
`d/explore` returns, so the recovered model drops directly into the rest of the
`domain` grimoire's constructs (`d/refine`, `d/model`, `d/evolve`).

#### Design rationale

`x/recover-model` is the code-facing counterpart to `d/explore`, and the
pairing is deliberate: a domain model is a domain model whether it was extracted
from a regulation PDF or a TypeScript repo, so the recovered model emits in
`d/explore`'s shape and joins the same downstream flow. What differs is the
*evidence* — and the difference is the whole design. A document *describes* a
domain in prose meant to be read; code *enacts* a domain in structures meant to
run. Recovering a model from enactment means reading intent off mechanism, which
is harder and less certain, so the construct's machinery is mostly about
grading that certainty rather than just extracting.

The reliability ordering across `:from` sources is the load-bearing insight.
Not all code is equally trustworthy evidence of intent. A *type declaration* is
near-direct evidence of an entity — someone wrote down that shape on purpose. A
*test* is strong evidence of intended behaviour — it asserts what the author
believed should hold. A *function body*, by contrast, shows what happens but not
why, and an inference drawn from call patterns alone is weaker still. By reading
preferentially from the strongest sources and grading what it draws from weaker
ones, the construct recovers a model whose every element advertises how much
weight it can bear.

`:invariants` deserves special note as the most valuable and most buried
recovery. The rules a system enforces — an order total can never be negative, a
subscription belongs to exactly one account — are rarely stated anywhere; they
live implicitly in validation checks, guard clauses, and database constraints.
Recovering them turns scattered enforcement into explicit domain knowledge, which
is often the single most useful output of exhuming a mature codebase, because
those invariants are the hard-won domain truths the original authors learned and
never wrote down.

#### Example: Recovering the model from a billing service

```clojure
(x/recover-model "../old-conjurer-mcp/src"
  :from       [:types :functions :tests :api-surface]
  :recover    [:entities :relationships :operations :invariants :vocabulary]
  :confidence :grade-each
  :emit       :d-explore-compatible
  :manifest   recovered-mcp-model)

;; Returns a domain model in d/explore's shape, every element graded:
{:entities [
   {:name "GrimoireSymbol"
    :attributes [:name :grimoire :namespace :synopsis :key-params]
    :confidence :attested
    :evidence   "Declared as an interface in types.ts; matches index.edn records"}
   {:name "CnjDocument"
    :attributes [:charter :assets :targets :sections]
    :confidence :attested
    :evidence   "Type declaration + parser output shape"}
   {:name "SpecSource"
    :attributes [:path :grimoire-files :index]
    :confidence :strongly-inferred
    :evidence   "No single type, but consistently constructed across spec-reading functions"}]
 :operations [
   {:name "lookup" :on "GrimoireSymbol" :confidence :attested
    :evidence "Exported function with a test asserting exact-match retrieval"}]
 :invariants [
   {:rule "A symbol name is unique across the whole catalog"
    :confidence :strongly-inferred
    :evidence "Lookup treats the index as a flat Map keyed by name; no collision handling"}
   {:rule "index.edn is read once and never mutated at runtime"
    :confidence :attested
    :evidence "Index built in constructor; no mutating methods exist"}]
 :vocabulary ["grimoire" "symbol" "construct" "charter" "spec-source"]}
;; ✓ Every element carries its grade and its evidence. "GrimoireSymbol" is
;;   :attested (a real type declaration); "SpecSource" is :strongly-inferred
;;   (no type, but a consistent construction pattern). The practitioner can
;;   trust the first as fact and treat the second as a well-supported guess.
;; ✓ The uniqueness invariant is :strongly-inferred from how lookup is written,
;;   not asserted as fact — the code behaves as if names are unique, but nothing
;;   declares it, so the recovery says exactly that.
;; ✓ :emit :d-explore-compatible means this drops straight into d/refine or
;;   d/model for forward work.
```

#### Usage patterns

```clojure
;; Recover a model from code, then refine it with human knowledge the code lacks
(~> (x/recover-model legacy-src :recover [:entities :invariants])
  (d/refine :add-context "Business rules the code enforces but never documents"))

;; Recover, then validate the recovered model for internal coherence
(~> (x/recover-model "../service/src" :emit :d-explore-compatible)
  (d/validate :checks [:completeness :consistency]))
```

---

### `x/infer-conventions`

Infers the coding standards a codebase *actually* follows — naming, structure,
error handling, testing patterns — from how it is consistently written, and
emits them as an `asset`. Recovers the practised standard, which is often not the
documented one.

#### Signature

```clojure
(x/infer-conventions source
  :observe     [:naming :file-structure :error-handling :testing
                :imports :typing :comments]
  :threshold   consistency-ratio          ;; how consistent before it counts as a convention
  :distinguish [:convention :accident :drift]
  :emit        :asset | :convention-report
  :manifest    inferred-conventions)
```

#### Parameters

**`:observe`** — Which dimensions of practice to read: naming schemes, how files
are organised, how errors are handled, how tests are structured, import style,
typing discipline, comment habits. Each is inferred from repetition across the
codebase.

**`:threshold`** — The consistency ratio at which a practice counts as a
convention rather than a coincidence. If 95% of functions use `camelCase`, that
is a convention; if it is 55%, that is drift or an unsettled style, not a rule.
The threshold tunes how strict the inference is.

**`:distinguish`** — Separate genuine `:convention` (consistent practice) from
`:accident` (a one-off that is not really a rule) and `:drift` (a convention
that is being abandoned — old code follows it, new code does not). This keeps the
inferred standard from canonising noise.

**`:emit :asset`** — Produce a Conjurer `asset` declaration capturing the
inferred standard, ready to register in a `.cnj`. The codebase's real,
practised conventions become an enforceable asset for future work.

#### Design rationale

`x/infer-conventions` exists because the conventions a codebase follows and the
conventions it documents are usually different, and the *practised* one is the
truth. A style guide says what someone once intended; the code says what the team
actually does, accreted over time. Recovering the practised standard — and
emitting it as an `asset` — lets a new effort built on or beside the old code
inherit its real conventions rather than an aspirational document that the code
itself stopped following.

The construct's defining discipline is `:distinguish`, because consistency is
not the same as intent. A practice can be consistent by *accident* (everyone
copied the first example) or consistent because it is *abandoned-but-not-removed*
(old code is uniform, new code diverges — drift). Treating every consistent
pattern as a deliberate convention would canonise accidents and freeze drift into
false rules. By separating convention from accident from drift, the construct
recovers the standard that is actually *meant*, and flags the parts of the
codebase that are quietly moving away from it.

The `:threshold` makes the inference honest about its own basis. A convention
claimed from 95% consistency is reliable; one claimed from 60% is really a
report that the codebase has no settled rule there. Surfacing the ratio turns
"the codebase uses X" into "the codebase uses X in 95% of cases" — which tells
the practitioner whether they are recovering a rule or papering over disagreement.

#### Example: Inferring conventions from a prior codebase

```clojure
(x/infer-conventions "../old-conjurer-mcp/src"
  :observe     [:naming :file-structure :error-handling :typing :testing]
  :threshold   0.85
  :distinguish [:convention :accident :drift]
  :emit        :asset
  :manifest    recovered-conventions)

;; Returns an asset declaration plus what was rejected and why:
{:asset
 (asset :recovered-mcp-conventions
   :type        :code-standard
   :description "Conventions inferred from the prior conjurer-mcp codebase, as
                 actually practised (not from any style document)"
   :language    :typescript
   :enforces    ["camelCase for functions and variables (98% consistent)"
                 "Explicit return types on exported functions (91%)"
                 "Errors returned as Result-like unions, not thrown (88%)"]
   :prohibits   ["Default exports (0 found — consistently named exports)"]
   :active-in   :project)

 :rejected [
   {:practice "All logic in one file"
    :as :accident
    :why "Consistent (one file) but not a convention — an artefact of never
          having split, not a deliberate rule. Do not canonise."}
   {:practice "JSDoc comments on functions"
    :as :drift
    :why "Present on 70% of older functions, near-absent on newer ones —
          a convention being abandoned, below the 0.85 threshold"}]}
;; ✓ The emitted asset captures the REAL practised standard (camelCase, explicit
;;   return types, Result-unions) at stated consistency ratios — ready to register
;;   in a .cnj so new work inherits the codebase's actual conventions.
;; ✓ :distinguish did its job: "all logic in one file" is consistent but rejected
;;   as :accident (not a rule, just unsplit), and JSDoc is flagged as :drift
;;   rather than enforced — the inference refuses to canonise noise or a dying habit.
```

#### Usage patterns

```clojure
;; Infer the old codebase's conventions, register them, then improve deliberately
(~> (x/infer-conventions "../old-src" :emit :asset)
  ;; the practitioner edits the asset to drop the bad parts before registering
  )

;; Compare practised conventions against a documented standard to find the gap
(x/infer-conventions "../src" :observe [:naming :error-handling] :emit :convention-report)
```

---

### `x/recover-stack`

Recovers a project's *declared and enforced* technical standard from its manifest
and configuration files — what it depends on, what it runs and builds on, and
what it enforces — and emits the assets and infrastructure assumptions that
standard implies. The complement to `x/infer-conventions`: where that infers the
*practised* style from how code is written, `x/recover-stack` reads the
*declared* standard directly from the files that configure and enforce it.

#### Signature

```clojure
(x/recover-stack source
  :sources     [:manifest :build-config :enforcement-config :lockfile
                {:role :keyword :package "name" :entry "path" :registry :keyword}]
  :recover     [:dependencies :runtime :build-settings :enforced-rules
                :embodied-standards :version-constraints]
  :ecosystem   :auto | :node | :python | :dotnet | :rust | :go | ...
  :distinguish [:runtime :dev :declared :enforced :implicit]
  :detect-drift boolean              ;; flag where enforced config and actual code disagree
  :emit        [:asset :assume-infrastructure :stack-report]
  :manifest    recovered-stack)
```

#### Parameters

**`:sources`** — Which declaration files to read, named abstractly because every
ecosystem uses different ones. The construct resolves the concrete files from the
`:ecosystem`:
- `:manifest` — the dependency/project manifest (`package.json`,
  `pyproject.toml`, `Cargo.toml`, `*.csproj`, `go.mod`)
- `:build-config` — compile/build configuration (`tsconfig.json`,
  `pyproject.toml [build-system]`, `Directory.Build.props`)
- `:enforcement-config` — the linters and formatters that *enforce* the standard
  (`.eslintrc`/`tslint.json`, `.prettierrc`, `.editorconfig`, `ruff.toml`,
  `.flake8`, `rustfmt.toml`, `.golangci.yml`)
- `:lockfile` — the resolved dependency graph (`package-lock.json`, `poetry.lock`,
  `Cargo.lock`) for exact versions and the transitive set

A source entry may also be a **map**, for when part of the standard does not live
in the project at all but in an external package the project depends on — a shared
team config, a published lint base, a tsconfig base. The map names the role, the
package, the file within it, and where it resolves:
`{:role :eslint-base :package "@team/eslint-config" :entry "dist/base.js"
:registry :npm}`. This matters because a project's *real* enforced standard is
often inherited rather than local: a `.eslintrc` that only says `extends:
"@team/eslint-config"` enforces a whole ruleset that lives elsewhere, and
recovering only the local file would miss the standard entirely. The map form lets
`x/recover-stack` follow the declaration to where the standard actually lives.

**`:recover`** — What to extract: `:dependencies` (the libraries chosen),
`:runtime` (language, version, platform), `:build-settings` (compile target,
module system, strictness), `:enforced-rules` (the lint/format/type rules the
config mandates — read as `:enforces`/`:prohibits`), `:embodied-standards` (a
dependency that *is* a standard — e.g. a prelude or style package — recovered as
a standard, not mere import noise), and `:version-constraints` (pinning as a
decision).

**`:ecosystem`** — The language ecosystem, so the construct knows which concrete
files map to the abstract `:sources`. `:auto` detects from the files present.
This is what keeps the construct language-agnostic: the *recovery intent* is the
same across Node, Python, .NET, Rust, Go; only the file names differ.

**`:distinguish`** — Separate `:runtime` from `:dev` dependencies (a test runner
is not a shipped dependency), `:declared` (what the config says) from `:enforced`
(what a linter actually blocks), and both of those from `:implicit` — a standard
the project follows without declaring or enforcing it anywhere (an unwritten
convention the code uniformly obeys). The three form an evidence gradient:
`:enforced` is firmest (a build fails without it), `:declared` is firm (written
down but not mechanically checked), `:implicit` is weakest (practised but
nowhere stated, and so closest to what `x/infer-conventions` recovers). A rule
documented but not enforced is weaker evidence of standard than one a linter
fails the build on; an implicit one is weaker still.

**`:detect-drift`** — When true, flag places where the *enforced* configuration
and the *actual* code disagree — the lint config forbids `console.log` but the
code uses it. This is the bridge to `x/infer-conventions`: declared standard
versus practised reality, surfaced as a finding rather than silently resolved.

**`:emit`** — The forward constructs the recovered standard maps onto, and a
manifest+config legitimately holds all three kinds of information:
- `:asset` — the embodied and enforced standard as a `:code-standard` asset, with
  `:enforces`/`:prohibits` read from the enforcement config
- `:assume-infrastructure` — the runtime/build/tooling choices as an
  `assume :infrastructure` block
- `:stack-report` — the flat, graded inventory

#### Design rationale

`x/recover-stack` exists because a project's technical standard is *declared*,
not just *practised* — and the declaration is the strongest evidence there is.
The prior constructs recover the standard indirectly: `x/infer-conventions`
guesses it from how code is consistently written, grading by a consistency
threshold. But most of that standard is sitting in plain sight, written down
explicitly, in the manifest and config files — `"strict": true` in a tsconfig,
a `no-console` rule in a linter, a prelude package in the dependencies. Reading
it there is `:attested`, not inferred; a configured-and-enforced rule is a far
firmer recovery than a pattern observed at 80% consistency. Leaving that
declaration unread, as the grimoire did before this construct, meant recovering
the weakest evidence of the standard while ignoring the strongest.

The construct earns its place — rather than being folded into
`x/infer-conventions` or `x/reconstruct-decisions` — because the manifest and
config are a genuinely distinct source with their own structure and their own
recovery questions, and because dependencies and configuration kept appearing in
those other constructs only *incidentally*: a library surfaced as evidence for a
decision, an import pattern as a convention. That incidental treatment is exactly
the gap this construct closes. A dependency that embodies a coding standard, a
tsconfig that sets strictness, a linter that enforces a rule — these are not
side-evidence for something else; they *are* the declared standard, and they
deserve a construct whose explicit responsibility is to recover them as such.

The design's deepest symmetry is with the forward flow. A `.cnj` declares its
standard forward in two places: an `asset` (with `:enforces`/`:prohibits`) and
an `assume :infrastructure` block. `x/recover-stack` recovers exactly those two
from a codebase's manifest and config — the enforcement config becomes the
asset's enforced rules, the runtime and build choices become the infrastructure
assumption. It is the precise inverse of forward standard-declaration, which is
the surest sign it belongs in the grimoire: where materialisation turns an asset
into a configured project, `x/recover-stack` turns a configured project back into
an asset.

`:detect-drift` reflects that the *declared* standard and the *practised* one
are different recoveries that can disagree, and the disagreement is information.
When the linter forbids what the code does, neither `x/recover-stack` (which
read the rule) nor `x/infer-conventions` (which read the practice) is wrong —
the *project* is inconsistent, and recovering that inconsistency as a finding is
more honest than letting either construct's answer silently win. This is the
grimoire's "recover the discrepancy" anti-pattern applied to standards.

#### Example: Recovering the stack from a TypeScript project

```clojure
(x/recover-stack "../old-conjurer-mcp"
  :sources      [:manifest :build-config :enforcement-config :lockfile]
  :recover      [:dependencies :runtime :build-settings :enforced-rules
                 :embodied-standards :version-constraints]
  :ecosystem    :auto              ;; detects Node from package.json
  :distinguish  [:runtime :dev :declared :enforced]
  :detect-drift true
  :emit         [:asset :assume-infrastructure :stack-report]
  :manifest     recovered-mcp-stack)

;; Returns the two forward declarations plus a graded report and drift findings:
{:asset
 (asset :recovered-mcp-standard
   :type        :code-standard
   :description "Declared and enforced standard recovered from manifest + config"
   :recovered-from :recovered-mcp-stack
   :confidence  :attested              ;; read directly from config, not inferred
   :language    :typescript
   :enforces    ["Strict type checking (tsconfig: strict true, noUncheckedIndexedAccess true)"
                 "Result/Option flow via @tsfpp/prelude (a dependency that embodies
                  the TSF++ standard — recovered as a standard, not import noise)"
                 "No floating promises (eslint: no-floating-promises error)"]
   :prohibits   ["console logging (eslint: no-console error)"
                 "implicit any (tsconfig: noImplicitAny true)"]
   :active-in   :project)

 :assume-infrastructure
 (assume :recovered-mcp-infrastructure
   :infrastructure {:runtime :node
                    :language :typescript
                    :module-system :esm        ;; tsconfig: module nodenext
                    :bundler :esbuild           ;; devDependency + build script
                    :test :vitest})            ;; devDependency

 :stack-report {
   :runtime-deps ["@modelcontextprotocol/sdk" "zod" "@tsfpp/prelude"]
   :dev-deps     ["typescript" "esbuild" "vitest" "eslint" "@typescript-eslint/*"]
   :embodied-standards [{:dep "@tsfpp/prelude" :standard "TSF++"
                         :confidence :attested
                         :note "The coding standard itself, shipped as a dependency"}]}

 :drift [
   {:finding "eslint enforces no-console, but src/http-bridge.ts logs to console"
    :enforced "no-console: error"
    :practice "console.error used in 3 places"
    :note "Declared standard and practice disagree — recover as finding, do not resolve"}]}
;; ✓ THE GAP YOU HIT, CLOSED: @tsfpp/prelude is now recovered as an embodied
;;   standard (TSF++), :attested, not just cited as evidence for a style guess.
;;   The tsconfig strictness and eslint rules become the asset's :enforces/
;;   :prohibits — read directly, far firmer than inferring them from code.
;; ✓ :distinguish split runtime deps (sdk, zod, prelude) from dev deps (the
;;   toolchain) — the test runner is correctly NOT a shipped dependency.
;; ✓ :detect-drift caught that the enforced no-console rule is violated in the
;;   code — surfaced as a finding, the bridge to x/infer-conventions, not hidden.
```

#### Usage patterns

```clojure
;; Recover the declared standard (this construct) AND the practised one (infer),
;; then reconcile — drift between them is the finding worth acting on
(~> "../old-src"
  (x/recover-stack :emit [:asset] :detect-drift true)        ;; declared + enforced
  (x/infer-conventions :emit :asset))                        ;; practised
;; two assets: what the project says it does, and what it actually does

;; Language-agnostic: the same call recovers a Python project's stack
(x/recover-stack "../py-service"
  :ecosystem :python    ;; resolves pyproject.toml, ruff.toml, .flake8
  :emit [:asset :assume-infrastructure])
```

---

## Part II: Reconstruction and emission

The deepest recovery — the reasoning behind the code — and the capstone that
assembles everything recovered into a `.cnj` the practitioner can continue from.

---

### `x/reconstruct-decisions`

Reconstructs the decision log behind a codebase — what was chosen and, where
recoverable, why — from git history, comments, structural evidence, and code
that bears the marks of a decision. Recovers the reasoning that a charter's
`:decisions` would have recorded, marked rigorously by confidence.

#### Signature

```clojure
(x/reconstruct-decisions source
  :from        [:git-history :comments :structure :code-shape :dependencies]
  :recover     [:what :why :alternatives-rejected :when]
  :confidence  :grade-each
  :emit        :charter-decisions | :decision-report
  :manifest    reconstructed-decisions)
```

#### Parameters

**`:from`** — The traces decisions leave: `:git-history` (commit messages,
the shape of how code arrived), `:comments` (especially "we do X because Y" and
"TODO/HACK/FIXME" markers), `:structure` (a boundary drawn is a decision made),
`:code-shape` (a retry wrapper means someone decided failures happen), and
`:dependencies` (choosing a library is a decision).

**`:recover`** — `:what` was decided (usually recoverable), `:why` (often only
partially — the hardest and most valuable), `:alternatives-rejected` (rarely
recoverable, occasionally visible in comments or reverted commits), and `:when`
(from git, usually attested).

**`:confidence :grade-each`** — Decisions are the *least* certain recovery,
because intent behind a choice is the most deeply buried thing in a codebase.
The grading here matters most: `:what` and `:when` are often `:attested`; `:why`
is usually `:strongly-inferred` at best and frequently `:speculative`.

**`:emit :charter-decisions`** — Produce entries in the shape a charter's
`:decisions` log expects (`{:date ... :decision ...}`), so the reconstructed
reasoning drops straight into a recovered `.cnj` — with confidence preserved so
the practitioner knows which entries are solid and which are educated guesses.

#### Design rationale

`x/reconstruct-decisions` recovers the rarest and most valuable thing a codebase
contains: the *reasoning* that produced it. A charter records decisions with
their rationale precisely because that reasoning is what is otherwise lost — and
in an existing codebase, it *has* been lost, surviving only as traces. The
construct exists to reconstruct it, and it is the hardest construct in the
grimoire because intent behind a choice is the deepest layer of the dig.

The design's central honesty is that **`:why` is almost never attested**. The
code attests *what* was decided — the boundary exists, the library is imported,
the retry wraps the call. But *why* — what problem this solved, what was tried
first, what trade-off was accepted — is rarely written down, and when it is
(a commit message, a comment), the stated reason may not be the real one.
The construct therefore grades `:why` conservatively and separates it sharply
from `:what`. A reconstructed decision that says "chose Postgres (attested) —
likely for transactional guarantees (speculative)" is honest; one that states
the why as fact is fiction. This is the grimoire's attested/inferred principle
at its most consequential, because a falsely-confident reconstructed rationale
will mislead every future decision that trusts it.

`:alternatives-rejected` is included despite being the least recoverable element
because, on the rare occasions it *can* be recovered — a reverted commit, a
"we used to do X but" comment — it is disproportionately valuable. Knowing what
was tried and abandoned saves a successor from repeating it. The construct looks
for these traces and marks them honestly as the rare finds they are.

#### Example: Reconstructing decisions from a prior codebase

```clojure
(x/reconstruct-decisions "../old-conjurer-mcp"
  :from       [:git-history :comments :structure :code-shape :dependencies]
  :recover    [:what :why :alternatives-rejected :when]
  :confidence :grade-each
  :emit       :charter-decisions
  :manifest   reconstructed-mcp-decisions)

;; Returns charter-shaped decision entries, each graded:
{:decisions [
   {:date "2026-03-12"
    :decision "Used the official @modelcontextprotocol/sdk for the server"
    :what-confidence :attested
    :why-confidence  :strongly-inferred
    :why "Likely to avoid hand-rolling the JSON-RPC/stdio protocol; the SDK was
          added in the initial commit alongside the bootstrap"
    :evidence "package.json + initial commit message 'mcp server skeleton'"}
   {:date "2026-03-20"
    :decision "Built a custom EDN parser rather than using an existing library"
    :what-confidence :attested
    :why-confidence  :speculative
    :why "Possibly no satisfactory TS EDN library, or a desire for zero
          dependencies — NOT stated anywhere; inferred only from its presence"
    :alternatives-rejected {:claim "May have tried an npm EDN package first"
                            :confidence :speculative
                            :evidence "None direct — no reverted commits found"}}]
 :unreconstructable [
   "Why all logic landed in one file — no commit explains it; most likely
    incremental accretion rather than a decision. Recorded as a non-decision."]}
;; ✓ Each decision separates :what-confidence from :why-confidence. The SDK
;;   choice is attested as a fact with a strongly-inferred reason; the custom
;;   parser is attested but its WHY is honestly marked :speculative — the code
;;   shows it exists, nothing shows why.
;; ✓ The single-file structure is recorded as :unreconstructable rather than
;;   given a fabricated rationale — "no commit explains it" is the honest finding,
;;   and inventing a reason would be exactly the overreach the grimoire forbids.
```

#### Usage patterns

```clojure
;; Reconstruct decisions, then carry only the well-supported ones into a charter
(~> (x/reconstruct-decisions "../old-src" :emit :charter-decisions)
  ;; practitioner reviews; speculative whys become :open questions, not decisions
  )

;; Feed reconstructed decisions into reasoning to test their coherence
(~> (x/reconstruct-decisions legacy-repo :recover [:what :why])
  (r/contradict :using domain-rules))   ;; do the inferred decisions conflict?
```

---

### `x/charter`

The capstone. Assembles everything recovered from a codebase — survey, model,
conventions, decisions — into a complete, valid `.cnj` file: a charter with
recovered goals and decisions, assets for the inferred conventions, targets for
the existing modules, and a domain model. The reverse handover: where
materialisation turns a `.cnj` into code, `x/charter` turns code into a `.cnj`.

#### Signature

```clojure
(x/charter source
  :title       "project title"
  :assemble    [:survey :model :stack :conventions :decisions :architecture]
  :using       [survey-binding model-binding stack-binding
                conventions-binding decisions-binding]
  :confidence-policy {:speculative :as-open-questions
                      :strongly-inferred :as-decisions-marked
                      :attested :as-decisions}
  :open-from   :gaps                       ;; turn unrecoverable intent into :open questions
  :emit        :cnj-file
  :manifest    recovered-charter)
```

#### Parameters

**`:assemble`** — Which recovered components to fold into the `.cnj`: the survey
(scale, purpose, structure), the recovered domain model, the recovered stack
(dependencies and enforced standard, as an asset plus an infrastructure
assumption), the inferred conventions (as assets), the reconstructed decisions,
and the architecture (as targets with modules). Each maps to a section of the
canonical `.cnj` structure.

**`:using`** — The bindings produced by the prior constructs (`x/survey`,
`x/recover-model`, `x/recover-stack`, `x/infer-conventions`,
`x/reconstruct-decisions`). `x/charter` assembles rather than re-recovers — it
composes what the arc already produced.

**`:confidence-policy`** — How recovered intent of each grade enters the `.cnj`,
and this is the construct's most important parameter. `:attested` findings become
firm charter content. `:strongly-inferred` decisions enter the decision log but
*marked* as recovered-and-inferred. `:speculative` intent does **not** masquerade
as a decision — it becomes an `:open` question instead. This ensures the recovered
charter never presents a guess as a settled choice.

**`:open-from :gaps`** — Turn what could *not* be recovered into explicit `:open`
questions. An unrecoverable rationale, a module whose purpose stayed opaque, an
invariant the code hints at but does not confirm — these become the open
questions a practitioner continuing the project must answer. The gaps in the dig
become the agenda for the future.

#### Design rationale

`x/charter` is the capstone because it is the construct that actually *closes the
loop*. Every other `exhume` construct recovers a fragment; `x/charter` assembles
the fragments into the one artefact that lets a codebase re-enter Conjurer as a
living project — a `.cnj` a practitioner or agent can read, trust, and continue
from. Where the ecosystem's forward path ends in materialisation (a `.cnj`
becomes code), `x/charter` is the exact inverse (code becomes a `.cnj`), which is
what makes `exhume` the true mirror of the forward flow rather than a side tool
that produces reports.

The `:confidence-policy` is the heart of the construct, because the danger at the
moment of emission is the grimoire's cardinal sin made permanent. Every prior
construct carefully graded its findings; if `x/charter` flattened those grades
into a uniform-looking charter, all that honesty would be lost at the final step,
and the practitioner would inherit a document where a wild guess and a read-off
fact look identical. The policy preserves the grading *structurally*: attested
findings become decisions, strongly-inferred ones become decisions visibly marked
as recovered, and speculative ones are demoted to open questions rather than
allowed to pose as decisions. The recovered `.cnj` thus carries its own
epistemic status into the future — anyone reading it can see which of its
foundations are solid and which are provisional.

`:open-from :gaps` reflects the truth that **what could not be recovered is itself
valuable information**. A naive recovery would emit only what it found and stay
silent about what it missed, leaving the practitioner to rediscover the gaps the
hard way. By converting unrecoverable intent into explicit `:open` questions, the
construct hands the practitioner a precise agenda: here is what the codebase could
not tell us, and here is what you must decide to move it forward. The dig's empty
trenches become the map of where to look next.

#### Example: Recovering a complete .cnj from the prior codebase

```clojure
(x/charter "../old-conjurer-mcp"
  :title    "Conjurer MCP Server (recovered)"
  :assemble [:survey :model :conventions :decisions :architecture]
  :using    [old-mcp-survey recovered-mcp-model
             recovered-conventions reconstructed-mcp-decisions]
  :confidence-policy {:speculative :as-open-questions
                      :strongly-inferred :as-decisions-marked
                      :attested :as-decisions}
  :open-from :gaps
  :emit      :cnj-file
  :manifest  recovered-cnj)

;; Emits a complete, valid .cnj — abbreviated here to show how confidence maps
;; into structure:
;;
;; (charter "Conjurer MCP Server (recovered)"
;;   :version "0.0.0-recovered"
;;   :domain  "An MCP server exposing the Conjurer spec ..."   ; from survey
;;   :goals   [...]                                            ; inferred, see :open
;;   :decisions [
;;     {:date "2026-03-12" :decision "Used @modelcontextprotocol/sdk"
;;      :recovered :attested}                                  ; firm
;;     {:date "2026-03-20" :decision "Custom EDN parser"
;;      :recovered :strongly-inferred                          ; marked as recovered
;;      :note "Why is inferred, not attested — see :open"}]
;;   :open [
;;     "Why was a custom EDN parser chosen over a library? (recovery: speculative)"
;;     "Why did all logic land in one file? (unreconstructable)"
;;     "Is the inferred uniqueness-of-symbol-name invariant actually intended?"]
;;   ...)
;; (asset :recovered-mcp-conventions ...)                      ; from x/infer-conventions
;; (target :mcp-server :modules [...])                         ; from architecture
;;
;; ✓ The confidence-policy is visible in the structure: the SDK decision is a
;;   firm decision (:attested), the parser decision is present but marked
;;   :strongly-inferred, and the two speculative whys are demoted to :open
;;   questions — never posing as settled decisions.
;; ✓ :open-from :gaps turned every unrecoverable intent into an explicit question,
;;   so the recovered .cnj hands its successor a precise agenda rather than a
;;   false sense of completeness. :version "0.0.0-recovered" signals provenance.
```

#### Usage patterns

```clojure
;; The full recovery arc, ending in a continuable .cnj
(~> "../old-conjurer-mcp"
  (x/survey :note [:reusable])
  (x/recover-model :emit :d-explore-compatible)
  (x/recover-stack :emit [:asset :assume-infrastructure] :detect-drift true)
  (x/infer-conventions :emit :asset)
  (x/reconstruct-decisions :emit :charter-decisions)
  (x/charter :title "Conjurer MCP Server (recovered)" :open-from :gaps))

;; Recover a .cnj, then immediately validate it with the forward toolchain
(~> (x/charter "../legacy" :assemble [:survey :model :conventions])
  ;; hand to the MCP server's validate_cnj, or:
  (d/validate :checks [:completeness]))
```

---

## Best practices

### Survey before you dig

Deep recovery is expensive; run `x/survey` first and let it aim the rest.
Recovering a domain model from forty files when the survey shows it lives in
three wastes effort and dilutes the result with noise from files that hold no
model. The cheap breadth-first pass makes every deeper construct targeted.

### Never let an inference pose as a fact

The grimoire's entire value rests on the attested/inferred distinction. Carry
confidence grades through every step and preserve them at emission via
`x/charter`'s `:confidence-policy`. A recovered charter where guesses and facts
look identical is worse than no charter, because the practitioner will build on
the guesses believing them solid.

### Read the declared standard before inferring the practised one

Much of a project's standard is written down explicitly — in its manifest, its
build config, its linters. Run `x/recover-stack` to read that directly
(`:attested`) before falling back on `x/infer-conventions` to guess the rest
from code patterns. A configured-and-enforced rule is far stronger evidence than
a pattern observed at 80% consistency. A dependency that *is* a standard — a
prelude or style package — is a recovered standard, not import noise; do not let
it slip into the evidence list of some other finding.

### Recovered conventions are a starting point, not a mandate

`x/infer-conventions` recovers what a codebase *does*, including its bad habits.
Before registering the emitted asset, edit it — the recovery's job is to show you
the real practised standard honestly; the decision about which parts to keep is
yours. Recovering the single-file habit faithfully does not mean adopting it.

### Turn gaps into questions, not silence

What you cannot recover is information. Use `:open-from :gaps` so unrecoverable
intent becomes explicit `:open` questions in the recovered `.cnj`. A recovery
that emits only its findings and hides its gaps leaves the practitioner to
rediscover them the expensive way.

### Anti-patterns

**Fabricating rationale to fill the decision log.** The strongest temptation in
reconstruction is to supply a plausible "why" for every decision so the charter
looks complete. This is the cardinal sin: a fabricated rationale is
indistinguishable from a real one and will mislead every future choice that
trusts it. If the why is not recoverable, mark it `:speculative` or record the
decision as `:unreconstructable` — never invent.

**Canonising accident as convention.** A consistent practice is not necessarily
a deliberate one. Recovering "all logic in one file" as a convention because it
is 100% consistent freezes an accident into a rule. Use `:distinguish` to
separate convention from accident from drift, and remember that the most
consistent thing about a codebase may be its worst habit.

**Recovering to a report instead of to the lexicon.** `exhume` that terminates
in a description has done half the job. The point is to emit Conjurer
specification — a `.cnj`, an asset, a domain model — that the rest of the lexicon
can act on. A recovery that produces only prose about the codebase is an analysis
tool wearing the grimoire's name.

**Treating the declared stack as incidental evidence.** Dependencies and config
files are not side-evidence for conventions or decisions — they are the project's
*declared and enforced* standard, and they deserve to be recovered as such with
`x/recover-stack`. Letting a prelude package, a strictness flag, or a lint rule
appear only inside some other finding's evidence list — instead of recovered as
the standard it is — is exactly how the strongest, most directly-attested
evidence of a project's intent gets lost. Read the manifest and config first and
recover them on their own terms.

**Improving while exhuming.** Correcting the codebase's inconsistencies,
editorialising about its quality, or recommending changes during recovery
corrupts the record. Recover what is there, faithfully, including the warts;
improvement is a separate forward act (`refine`, `d/evolve`) performed visibly
after recovery, not smuggled into it.

**Trusting comments over code.** A comment states a claim; the code states a
fact. When they disagree — and in old codebases they often do — the code is the
attested evidence and the comment is, at best, strongly-inferred intent that may
be stale. Recover the discrepancy itself as a finding rather than silently
believing the comment.

---

## Integration patterns

### Exhume feeds the forward flow

`exhume`'s entire purpose is to emit into the rest of the lexicon. Its outputs
are the forward constructs' inputs — a recovered model refines, recovered
conventions register as assets, a recovered charter materialises again.

```clojure
;; Recover a model from code, refine it with knowledge the code lacks, re-materialise
(~> (x/recover-model "../old-src" :emit :d-explore-compatible)
  (d/refine :add-context "Domain rules known to the team but absent from code")
  (d/model :formalise true))
;; exhume recovers; domain refines; the forward flow continues from recovered ground.
```

### Exhume + reasoning: testing recovered intent

Reconstructed decisions are inferences, and inferences can be checked. `reasoning`
can test whether recovered decisions cohere or contradict.

```clojure
(~> (x/reconstruct-decisions "../legacy" :recover [:what :why])
  (r/contradict :using recovered-domain-rules))
;; If two reconstructed decisions imply contradictory rules, at least one
;; inference is wrong — reasoning surfaces it before the practitioner trusts them.
```

### Exhume + the MCP server: recovery as a deterministic input

`x/charter` emits a `.cnj`; the Conjurer MCP server's `validate_cnj` checks it.
The grimoire reasons about *what* to recover; a tool can supply the *mechanical*
inputs (AST, git log) and validate the *mechanical* output.

```clojure
;; Recover a .cnj, then validate it with the deterministic toolchain
(~> (x/charter "../old-conjurer-mcp" :assemble [:survey :model :conventions :decisions])
  ;; → conjurer-mcp validate_cnj confirms structural validity of the recovered file
  )
;; exhume (LLM reasoning) recovers the content; the MCP server (deterministic)
;; validates the form. Clean division of labour.
```

### The complete round trip

`exhume` closes the loop the rest of the lexicon opens, making the full cycle
expressible: recover a project from its code, continue it forward, materialise
again.

```clojure
(~> "../old-conjurer-mcp"
  (x/survey)
  (x/recover-model :emit :d-explore-compatible)
  (x/recover-stack :emit [:asset :assume-infrastructure] :detect-drift true)
  (x/infer-conventions :emit :asset)
  (x/reconstruct-decisions :emit :charter-decisions)
  (x/charter :title "Conjurer MCP Server (recovered)" :open-from :gaps)
  ;; now in Conjurer: refine, decide the open questions, and go forward
  (handover :to :typescript-implementation-agent))
;; code → spec → continued intent → code. The circle the ecosystem implied,
;; now closed.
```

---

## Grimoire metadata

```clojure
{:grimoire    "exhume"
 :namespace   "x/"
 :version     "1.1.1"
 :description "Code and artefact archaeology: recovering Conjurer specification —
               domain models, the declared technical stack, conventions, decisions,
               and a continuable .cnj — from existing codebases never written in
               Conjurer"

 :constructs {
   :survey-and-recovery [x/survey x/recover-model x/infer-conventions x/recover-stack]
   :reconstruction      [x/reconstruct-decisions]
   :emission            [x/charter]}

 :best-for [
   "Bootstrapping a .cnj from an existing or prior codebase"
   "Recovering a domain model from source code, types, and tests"
   "Recovering a project's declared technical standard from its manifest and config
    (dependencies, build config, lint/format enforcement) — language-agnostic"
   "Inferring a codebase's actually-practised coding conventions as an asset"
   "Reconstructing the decision log behind a project from git history and structure"
   "Deciding what is reusable in a prior attempt before starting fresh"
   "Bringing an inherited or legacy system into the Conjurer ecosystem"
   "Closing the spec↔code loop: turning materialised code back into specification"]

 :works-with [:core :domain :reasoning :data :web]

 :key-concepts [
   {:term "Exhumation"
    :definition "Recovering buried intent from a finished artefact — the inverse
                 of materialisation. Where the forward flow turns a specification
                 into code, exhumation turns code back into specification."}
   {:term "Attested vs. inferred"
    :definition "The grimoire's founding distinction. Attested: what the code
                 demonstrably does, read directly and reliable. Inferred: what the
                 author meant, reconstructed from evidence and only probable.
                 Every recovered claim carries its status; the two are never merged."}
   {:term "Confidence grade"
    :definition "The evidential weight of a recovered element: :attested (read
                 directly), :strongly-inferred (well-supported by evidence),
                 :speculative (a reasonable guess with thin support). Graded per
                 element and preserved through to emission."}
   {:term "Practised vs. documented convention"
    :definition "The conventions a codebase actually follows (recoverable from how
                 it is consistently written) versus the ones it documents (which
                 the code may have stopped following). exhume recovers the
                 practised standard, the one that is true."}
   {:term "Declared vs. enforced standard"
    :definition "The technical standard a project states in its manifest and build
                 config (declared) versus what its linters and formatters actually
                 block (enforced). x/recover-stack reads both directly — :attested,
                 stronger than inference — and flags drift where the enforced rule
                 and the practised code disagree. A dependency that embodies a
                 standard (a prelude or style package) is recovered as a standard,
                 not as import noise."}
   {:term "Reverse handover"
    :definition "x/charter's role: assembling recovered fragments into a complete,
                 continuable .cnj. The exact inverse of materialisation —
                 code becomes specification — closing the ecosystem's loop."}
   {:term "Gap as agenda"
    :definition "What cannot be recovered, made explicit. Unrecoverable intent
                 becomes :open questions in the recovered .cnj, handing the
                 practitioner a precise list of what the codebase could not tell
                 them and what they must decide to move forward."}]}
```

---

## Implementation notes for LLM processors

### Attested versus inferred is the governing discipline

Across every `exhume` construct, never present an inference as a fact. When
recovering any element, ask what *evidence* supports it and grade accordingly:
something read directly from a type declaration, a passing test, or a dependency
manifest is `:attested`; something reconstructed from naming patterns, call
structure, or a single comment is `:strongly-inferred`; something guessed from
thin or circumstantial evidence is `:speculative`. Attach the grade and the
evidence to every recovered element. An ungraded recovery is a failure of the
grimoire's core purpose, because the practitioner cannot then tell what to trust.

### Read from the strongest evidence first

When recovering a model (`x/recover-model`), weight sources by reliability:
type declarations and schemas are near-direct evidence of entities; tests are
strong evidence of intended behaviour; function bodies show mechanism but weak
intent; inferences from call patterns alone are weakest. Recover preferentially
from the strong sources and grade down what you draw from weak ones. The same
ordering applies to decisions: git history and explicit "because" comments
outweigh structural guesses.

### Read the declared stack directly; it is the firmest evidence there is

When processing `x/recover-stack`, treat the manifest and configuration files as
`:attested` evidence — a tsconfig strictness flag, an eslint rule, a dependency
in package.json is read directly, not inferred, and is therefore firmer than any
pattern `x/infer-conventions` derives from code. Resolve the abstract `:sources`
to the right concrete files for the detected `:ecosystem` (package.json vs
pyproject.toml vs *.csproj vs Cargo.toml vs go.mod, and the matching lint/format
configs). Read enforcement config as the asset's `:enforces`/`:prohibits`: a
linter rule that fails the build is a `:prohibits`; a required compiler setting
is an `:enforces`. Recognise a dependency that *embodies* a standard (a prelude,
a style or lint-config package) and recover it as a standard, not as a plain
dependency. Distinguish runtime from dev dependencies, and declared rules from
enforced ones. When `:detect-drift` is set, compare the enforced config against
the actual code and surface disagreements as findings — never silently let the
config's claim or the code's practice win; the inconsistency is the finding.

### Why is the hardest thing to recover; treat it so

In `x/reconstruct-decisions`, separate *what* was decided (often attested) from
*why* (rarely attested). Do not supply a plausible rationale to make a decision
look complete — a fabricated why is indistinguishable from a real one and
poisons every future decision that trusts it. If the why is unrecoverable, mark
it `:speculative` or record the decision as `:unreconstructable`. A stated reason
in a commit or comment is itself only `:strongly-inferred` intent — it may be
post-hoc or stale — and where it contradicts the code, the code is the attested
evidence.

### Distinguish convention from accident from drift

In `x/infer-conventions`, consistency alone does not establish intent. Apply the
`:threshold` honestly and surface the consistency ratio. Use `:distinguish` to
separate a deliberate `:convention` from an `:accident` (consistent but not a
rule) and `:drift` (a convention being abandoned — old code follows it, new code
does not). Never canonise the most consistent practice without asking whether it
is intended; the most uniform thing about a codebase is sometimes its worst habit.

### Preserve confidence into emission

In `x/charter`, the `:confidence-policy` must map recovered grades into the
`.cnj`'s structure, not flatten them. Attested findings become firm charter
content; strongly-inferred decisions enter the log explicitly marked as
recovered; speculative intent becomes `:open` questions, never decisions. Convert
every unrecoverable element into an `:open` question via `:open-from :gaps`. The
emitted `.cnj` must carry its own epistemic status forward, so its reader can see
which foundations are solid. A recovered charter that looks as confident as an
authored one has discarded everything the grimoire exists to preserve.

### Recover, do not improve

Across all constructs, report the codebase as it is — including inconsistencies,
dead code, and contradictions between comment and code. Do not silently correct,
editorialise, or recommend during recovery; those are forward acts performed
after, and visibly. When the code and its documentation disagree, recover the
*discrepancy* as a finding rather than choosing one and hiding the other.

---

*A codebase is intent that forgot how to explain itself. Exhumation is the
patient, honest unearthing of that intent — recovering what can be known, marking
how well it is known, and naming plainly what cannot be recovered at all. Done
faithfully, it lets a project with a past become a project with a future.*