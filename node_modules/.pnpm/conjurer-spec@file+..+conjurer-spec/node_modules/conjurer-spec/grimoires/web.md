# web.md — Conjurer Web Grimoire

The spellbook for the browser. Web development is the art of collapsing three
distinct languages — structure, presentation, behaviour — into a single
coherent experience. The `web` grimoire operates at a level above this
complexity: practitioners describe *what the interface should be*, and the
system manifests the HTML, CSS, and JavaScript that realise it.

---

## Philosophy

### The interface as conversation

An interface is not a document. It is a conversation between the system's
knowledge and the user's intent. Every click is a question; every response
is an answer. A good interface makes that conversation feel effortless — the
user's intent flows naturally into action, and the system's responses arrive
without friction or confusion.

This framing has consequences for how the `web` grimoire is designed. It does
not simply generate code — it generates *conversations*. The structure of a
page reflects the structure of a user's mental model. The hierarchy of
components reflects the hierarchy of decisions the user needs to make. The
visual language reflects the emotional register appropriate to the context.
A payment confirmation feels different from an error message. An onboarding
flow feels different from a dashboard. Good interface design honours these
distinctions; good tooling makes honouring them easy.

### Three generative tensions

**Simplicity versus power** — The most expressive invocations are the shortest.
`(w/prototype "Analytics dashboard with real-time charts" :type :dashboard)`
should manifest a complete, working, production-quality dashboard without
requiring the practitioner to specify every component. The system's
accumulated knowledge of dashboard conventions fills the gaps. But when the
practitioner does specify, the system honours every detail.

**Convention versus configuration** — Conventions encode accumulated wisdom
about what works. A landing page needs a hero, features, social proof, and
a call to action — not because this is the only way, but because it is a
proven pattern that serves users well. Convention accelerates; configuration
enables deviation when deviation serves the user better.

**Aesthetics versus accessibility** — Beautiful interfaces that exclude people
are not beautiful interfaces. Accessibility is not a constraint imposed on
design; it is a dimension of design quality. An interface that communicates
its structure clearly to a screen reader communicates it more clearly to all
users. Colour contrast that works for colour-blind users works better for
everyone in bright light. The `web` grimoire treats WCAG compliance as a
minimum standard, not an optional add-on.

### Production quality from the first invocation

Generated code is immediately deployable. No placeholder images, no dummy
data labelled "TODO", no components that look finished but have no behaviour.
The first manifestation is production-ready. Refinement improves it; it does
not complete it.

---

## Naming rationale

**`w/`** — The short namespace alias. Web invocations are frequent; brevity
matters.

**Prototype** — From Greek *prōtótupos*, "first impression." In Conjurer, a
prototype is the first full manifestation — complete and deployable, not a
wireframe.

**Component** — A self-contained, reusable interface element with defined
variants and states.

**Token** — A design token is a named design decision: a colour, a spacing
value, a type size. Tokens are the vocabulary of a design system.

**Analyze / extract** — Plain verbs for plain acts: to analyse is to read a site
for its design, structure, and accessibility; to extract is to lift a specific
layer (style, structure) out for reuse. The distinction is scope — analysis
sees everything; extraction takes one thing.

**Audit** — From the accounting tradition: a systematic, standards-based
examination that produces findings against a defined benchmark (WCAG, Lighthouse),
not an opinion.

**Migrate** — To move an implementation from one home to another — framework,
CSS approach, toolchain — while what the user sees and does survives the journey
intact.

**Responsive** — Named for the established term of art, but reclaimed as a
*strategy* rather than a switch: the deliberate choice of which contexts a layout
serves and how it transforms between them, including the choice to serve one
context excellently.

**Flow** — The path a user takes through a stateful interaction, and the state
machine beneath it. A flow is what happens *between* the screens.

**Copy** — From the publishing sense of "copy": the text to be set. Interface
copy is the words an interface speaks — labels, messages, empty states — treated
as a designed system, not filler.

---

## Part I: Analysis and extraction

Understanding existing web experiences provides the foundation for creation.
Analysis functions extract what a site *is* so the practitioner can build
what a site *should be*.

---

### `w/analyze`

Performs comprehensive analysis of a website or design artefact, extracting
visual design system, structural organisation, component patterns, and
accessibility characteristics.

#### Signature

```clojure
(w/analyze source
  :from          :url | :html | :css | :screenshot
  :extract       [:visual-design :structure :patterns :accessibility :performance]
  :depth         :shallow | :moderate | :comprehensive
  :compare-to    reference-design-system
  :output        :design-system | :audit-report
  :manifest      analysis-binding)
```

#### Parameters

**`:extract`** — Dimensions to analyse:
- `:visual-design` — colour palette, typography system, spacing scale, shadow
  definitions, animation timings
- `:structure` — component hierarchy, page anatomy, navigation patterns,
  layout systems (Grid, Flexbox), responsive breakpoints
- `:patterns` — interaction patterns, conversion flows, social proof placement,
  progressive disclosure structures
- `:accessibility` — WCAG compliance level, missing ARIA attributes, colour
  contrast failures, keyboard navigation gaps, focus management issues
- `:performance` — critical render path, bundle structure, image optimisation
  gaps, render-blocking resources

**`:compare-to`** — Compare the extracted design system against a reference
(a brand guide, another extracted system, or a published design-system token
set such as the NL Design System) and surface divergences.

#### Design rationale

`w/analyze` exists because creation begins with seeing clearly. Before a
practitioner can rebuild, replace, or extend a web experience, they need an
honest account of what is actually there — not the design team's intentions, but
the system as shipped, contrast failures and all. The construct's value is that
it reads a site the way three different specialists would at once: a designer
seeing the token system, an architect seeing the structure, and an accessibility
auditor seeing the failures. Producing those views together is what lets the
practitioner decide what to keep and what to fix in one pass.

The decisive design choice is that analysis is *honest about defects*, not just
descriptive of features. A weaker analyser would report the colour palette and
stop; `w/analyze` reports that `.text-muted` fails contrast at 3.8:1 against a
4.5:1 requirement, because the defects are the actionable part. A design system
extracted without its accessibility failures is a flattering portrait, not an
analysis — and rebuilding from it would faithfully reproduce the failures. By
surfacing `:issues` alongside `:passes`, the construct ensures the next step
(rebuild, theme-extract, or audit-and-fix) starts from the truth.

#### Example: Complete site analysis

```clojure
(w/analyze "https://example-municipality.gov/services"
  :from    :url
  :extract [:visual-design :structure :accessibility]
  :depth   :comprehensive
  :manifest services-analysis)

;; Returns:
{:site      "example-municipality.gov"
 :analysed-at "2025-11-03"

 :visual-design {
   :colors {
     :primary   "#1F4E79"
     :secondary "#C8102E"
     :accent    "#F2A900"
     :neutral   {100 "#F8F9FA" ... 900 "#212529"}
     :semantic  {:success "#27AE60" :warning "#F39C12"
                 :danger  "#E74C3C" :info "#3498DB"}}
   :typography {
     :fonts  {:heading "Source Sans Pro"
              :body    "Source Sans Pro"
              :fallback "Arial, sans-serif"}
     :scale  {:base 16 :ratio 1.25
              :sizes {:xs 0.75 :sm 0.875 :base 1 :lg 1.25 :xl 1.5}}}
   :spacing {:system :8px-grid :scale [0 4 8 12 16 24 32 48 64 96]}}

 :structure {
   :layout-system   [:flexbox :grid]
   :breakpoints     [640 768 1024 1280]
   :navigation      {:type :top-nav :sticky true :search true}
   :page-patterns   [:hero :content-cards :cta-banner :footer-links]}

 :accessibility {
   :wcag-level      :AA
   :issues [
     {:type     :colour-contrast
      :element  ".text-muted"
      :ratio    3.8
      :required 4.5
      :severity :error}
     {:type     :missing-alt
      :count    12
      :severity :error}
     {:type     :focus-not-visible
      :elements [".nav-link" ".card-link"]
      :severity :warning}]
   :passes  [:keyboard-navigation :aria-landmarks :heading-hierarchy
             :skip-links :form-labels]}}
;; ✓ The analysis reports defects with the precision needed to act on them —
;;   not "contrast issues" but ".text-muted at 3.8:1 against a 4.5:1 requirement".
;;   A design system extracted without these failures would faithfully reproduce
;;   them on rebuild; surfacing :issues beside :passes is what makes the analysis
;;   a foundation for improvement rather than a flattering portrait.
```

---

### `w/extract-style`

Extracts visual design tokens from a source — colours, typography, spacing,
components — and normalises them into a portable theme definition.

#### Signature

```clojure
(w/extract-style source
  :from            :url | :css | :scss | :figma
  :focus           [:colors :typography :spacing :shadows :components :animations]
  :normalise-names boolean
  :generate-variants boolean
  :map-to-tokens   :nl-design-system | :tailwind | :custom
  :output          :theme | :token-set
  :manifest        theme-binding)
```

#### Parameters

**`:map-to-tokens`** — Map extracted values to a known token naming convention.
`:nl-design-system` maps to the NL Design System token structure (the Dutch
government's open design system), enabling extracted themes to integrate
directly with its component libraries. `:tailwind` maps to Tailwind CSS variable
names. `:custom` preserves the source's own naming.

**`:generate-variants`** — Automatically generate the full shade scale for
extracted colours (50 through 950 using OKLCH for perceptual uniformity),
and complete size scales for typography and spacing.

#### Design rationale

`w/extract-style` is narrower than `w/analyze` by design: it ignores structure,
behaviour, and accessibility entirely and captures only the *visual vocabulary*
— the colours, type, spacing, and shadows — normalised into a portable theme.
The separation matters because the use cases are different. `w/analyze` answers
"what is this site?"; `w/extract-style` answers "give me this site's look as a
theme I can apply elsewhere." The output is built to be *consumed* by
`w/prototype` and `w/tokens`, not merely read.

The construct's defining commitment is *normalisation*. A real stylesheet is a
mess of one-off values — fourteen barely-different greys, three spacing systems
that fought and never reconciled, a colour defined six ways. Extracting those
verbatim would propagate the mess. `:normalise-names` and `:generate-variants`
turn the observed chaos into a coherent system: the fourteen greys collapse to a
principled neutral scale, the colours gain complete perceptually-uniform shade
ramps, the spacing snaps to a grid. This is the difference between copying a
site's styles and extracting its *design system* — the latter is what survives
being applied to new components the original never had.

`:map-to-tokens` exists because an extracted theme is most useful when it speaks
a token vocabulary the rest of the toolchain already understands. Mapping to a
published system like the NL Design System, or to Tailwind's conventions, means
the extracted theme drops straight into an existing component library rather
than becoming a fourth incompatible naming scheme.

#### Example: Extracting and normalising a brand theme

```clojure
(w/extract-style "https://example-brand.com"
  :from             :url
  :focus            [:colors :typography :spacing]
  :normalise-names  true
  :generate-variants true
  :map-to-tokens    :nl-design-system
  :manifest         brand-theme)

;; Returns a normalised, NL Design System-compatible token set:
{:nl-design-system {
   :color {
     :primary {:value "#01689B"
               :variants {100 "#e6f0f5" 200 "#b3d1e2" 500 "#01689B" 900 "#003456"}}
     :text    {:body "#1a1a1a" :subtle "#3c3c3c"}}
   :typography {
     :font-family {:heading "Source Sans Pro" :body "Source Serif Pro"}
     :scale       {:sm 14 :base 16 :lg 18 :xl 24 :2xl 32}}
   :space        {:1 4 :2 8 :4 16 :6 24 :8 32 :12 48 :16 64}}}
;; ✓ The source defined :primary once, as a single hex value; :generate-variants
;;   expanded it into a full perceptually-uniform shade ramp (100–900) the
;;   original site never had. That ramp is what lets the theme dress components
;;   the source never contained — the mark of extracting a design *system*, not
;;   just copying styles.
;; ✓ :map-to-tokens :nl-design-system means the result drops directly into that
;;   system's component library rather than becoming a fourth naming scheme.
```

---

### `w/extract-structure`

Extracts the structural organisation of a page or application: component
hierarchy, section types, navigation patterns, and the user journey they
encode.

#### Signature

```clojure
(w/extract-structure source
  :from   :url | :html
  :depth  :shallow | :deep
  :infer  [:user-journey :conversion-funnel :information-architecture]
  :output :structure-map | :architecture-diagram
  :manifest structure-binding)
```

#### Parameters

**`:depth`** — `:shallow` reads the top-level section structure; `:deep`
descends into nested components and the sub-structure within sections. Deep
extraction reveals the component hierarchy; shallow extraction captures only the
page anatomy.

**`:infer`** — What intent to read from the arrangement:
- `:user-journey` — the path the structure guides a visitor along
- `:conversion-funnel` — the stages from arrival to action the page is built to move through
- `:information-architecture` — the organising logic of the content, independent
  of any single journey through it

#### Design rationale

`w/extract-structure` reads a page for its *bones* rather than its skin: the
sections, their purposes, the order they appear in, and the user journey that
order encodes. It is the structural complement to `w/extract-style`'s visual
focus, and the pairing is deliberate — a site's look and its architecture are
independently reusable, and a practitioner often wants one without the other
(borrow the conversion structure of a great landing page without its branding,
or vice versa).

The construct's distinctive move is `:infer` — reading *intent* from
*arrangement*. A sequence of sections is not just a layout; it is an argument
the page is making to its visitor (here is the value, here is the proof, here is
the price, here is the action). By inferring the `:user-journey` and
`:conversion-funnel`, the construct recovers the strategy behind the structure,
not just the structure itself. This is what makes the output useful for
*building* rather than merely cataloguing: knowing that a page moves a visitor
awareness → interest → consideration → decision → action tells the practitioner
what their own page must do, independent of how this particular one looks.

#### Example

```clojure
(w/extract-structure "https://stripe.com"
  :from  :url
  :depth :deep
  :infer [:user-journey :conversion-funnel]
  :manifest stripe-structure)

;; Returns:
{:page-type :saas-landing-page
 :sections  [
   {:type :hero      :pattern :centered-with-visual
    :purpose "Communicate value proposition and primary CTA"}
   {:type :features  :pattern :icon-grid-3col
    :purpose "Demonstrate capability breadth"}
   {:type :social-proof :pattern :logo-carousel
    :purpose "Establish credibility"}
   {:type :pricing   :pattern :tier-comparison-3col
    :purpose "Drive conversion decision"}]
 :conversion-funnel [:awareness :interest :consideration :decision :action]
 :cta-count 8
 :navigation {:type :sticky-nav :links 6}}
;; ✓ Each section carries a :purpose, not just a :type — the construct recovers
;;   the argument the page is making (value → proof → price → action), not merely
;;   its layout. That inferred strategy is what transfers to a new page; the
;;   specific :patterns are incidental by comparison.
```

---

## Part II: Generation

---

### `w/prototype`

Generates a complete, deployable web project from a high-level description.
The primary manifestation function of the web grimoire.

#### Signature

```clojure
(w/prototype description
  :type          :landing-page | :dashboard | :app | :widget
                 | :blog | :e-commerce | :portal | :form
  :style         [:modern | :minimal | :glassmorphism | :neumorphism
                  | :brutalism | :retro | :corporate | :playful]
  :layout        [:single-page | :multi-section | :sidebar | :split | :grid]
  :color-scheme  :light | :dark | :auto
  :colors        {:primary "#..." :secondary "#..." :accent "#..."}
  :apply-theme   extracted-theme
  :from-domain   domain-model
  :components    [:navbar :hero :cards :forms :tables :charts
                  :modals :drawers :toasts :footer ...]
  :features      [:responsive :dark-mode :animations :accessibility
                  :i18n :pwa :offline :real-time]
  :accessibility :wcag-aa | :wcag-aaa
  :framework     :vanilla | :react | :vue | :svelte | :alpine
  :css           :vanilla | :tailwind | :scss | :css-modules
  :output        :files | :project | :single-file
  :manifest      prototype-binding)
```

#### Parameters

**`:accessibility`** — Accessibility conformance level. `:wcag-aa` (default)
meets legal requirements in most jurisdictions. `:wcag-aaa` meets the highest
standard. In either case, the generated code includes: semantic HTML5 elements,
ARIA attributes where needed, keyboard navigation, focus management, sufficient
colour contrast, and screen reader compatibility.

**`:from-domain`** — A domain model (from `d/explore` or `d/model`) that
informs the prototype's entities, forms, tables, and navigation. The prototype
understands the domain's entities and generates appropriate CRUD interfaces,
validation rules derived from domain constraints, and navigation structures
that mirror the domain's organisation.

**`:apply-theme`** — An extracted theme (from `w/extract-style`) to apply.
The prototype uses the theme's colour tokens, typography, spacing, and
component styles. Combine with `:customize` to override specific tokens.

#### Design rationale

`w/prototype` is the flagship because it embodies the grimoire's central wager:
that a practitioner should describe *what the interface should be* and receive a
complete, deployable realisation, rather than assembling it component by
component. The construct's design turns on three commitments that make that
wager pay off rather than producing plausible-looking rubbish.

First, **convention fills the gaps the description leaves**. The description
"project management SaaS for development teams" does not mention a hero, social
proof, or a footer — but the construct supplies them, because accumulated
knowledge of what a landing page *needs* is exactly the value a high-level
description is trading on. The practitioner specifies the distinctive decisions
and inherits the conventional ones. When they *do* specify, convention yields:
every explicit `:component`, `:colors`, or `:feature` is honoured exactly.

Second, **production quality is the floor, not the ceiling**. The construct's
hardest rule is that the first manifestation is deployable — no `Lorem ipsum`,
no `TODO`, no components that look finished but do nothing. This is what
separates a prototype in Conjurer's sense from a wireframe: refinement *improves*
a working artefact rather than *completing* a broken one. A generated dashboard
whose charts have no data is not a smaller version of the deliverable; it is a
different and useless kind of thing.

Third, **the domain can drive the interface**. `:from-domain` is the construct's
most powerful mode: handed a domain model, it generates CRUD interfaces, forms
with validation derived from the domain's constraints, and navigation that
mirrors the domain's entity relationships. This is where `web` composes with
`domain` and `data` — the interface is not invented in isolation but derived
from the same model that defines the system's knowledge, so the form's
validation and the schema's constraints cannot drift apart.

#### Example 1: SaaS landing page

```clojure
(w/prototype "Project management SaaS for development teams"
  :type         :landing-page
  :style        [:modern :glassmorphism]
  :color-scheme :dark
  :colors       {:primary "#6366f1" :secondary "#8b5cf6" :accent "#ec4899"}
  :components   [:navbar :hero :features :pricing :testimonials :cta :footer]
  :features     [:responsive :animations :dark-mode]
  :accessibility :wcag-aa
  :framework    :vanilla
  :css          :scss
  :output       :project)

;; Generates:
;; project/
;; ├── package.json
;; ├── src/
;; │   ├── index.html         ← Semantic HTML5, ARIA landmarks, skip links
;; │   ├── scss/
;; │   │   ├── _tokens.scss   ← Design tokens as CSS custom properties
;; │   │   ├── _components.scss
;; │   │   └── _animations.scss
;; │   └── js/
;; │       └── main.js        ← ES6+, IntersectionObserver for animations
;; └── dist/
;;
;; Accessibility checklist (auto-generated with the project):
;; ✓ All images have descriptive alt text
;; ✓ Colour contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text
;; ✓ Focus visible on all interactive elements
;; ✓ Keyboard navigable without mouse
;; ✓ Skip navigation link to main content
;; ✓ Heading hierarchy (h1 → h2 → h3) respected throughout
;; ✓ Form inputs have associated labels
;; ✓ ARIA roles on custom interactive components
```

#### Example 2: Domain-driven portal

```clojure
(def crm-domain (d/explore "crm-requirements.pdf" :depth 3))

(w/prototype "CRM Customer Portal"
  :type        :app
  :from-domain crm-domain
  :framework   :react
  :css         :tailwind
  :features    [:responsive :dark-mode :real-time]
  :accessibility :wcag-aa
  :output      :project)

;; System generates interfaces for all entities in crm-domain:
;; ✓ Customer list with search, filter, and sort
;; ✓ Customer detail view with all domain attributes
;; ✓ Contact history timeline
;; ✓ Opportunity pipeline (if in domain)
;; ✓ Forms with validation derived from domain constraints
;; ✓ Navigation structure reflecting domain entity relationships
```

#### Example 3: Applying an extracted theme

```clojure
(def gov-theme (w/extract-style "https://example-city.gov" :map-to-tokens :nl-design-system))

(w/prototype "City Digital Services Portal"
  :type        :portal
  :apply-theme gov-theme
  :components  [:header :search :service-cards :contact-cta :footer]
  :features    [:responsive :accessibility]
  :accessibility :wcag-aaa   ;; Public-sector portals target AAA
  :framework   :vanilla
  :output      :project
  :manifest    city-portal)

;; Uses gov-theme's colours, typography, and spacing throughout
;; Overrides nothing — the extracted theme is applied faithfully
;; ✓ :accessibility :wcag-aaa, not the :wcag-aa default: public-sector portals
;;   are commonly held to the higher standard, so the generated code adds 7:1
;;   contrast and strict WAI-ARIA patterns. The accessibility level is a
;;   deliberate parameter, not an afterthought — the context sets the floor.
```

---

### `w/component`

Generates an individual UI component with all its variants, states, and
interaction patterns.

#### Signature

```clojure
(w/component type
  :variant    :primary | :secondary | :outline | :ghost | :destructive
  :size       :xs | :sm | :md | :lg | :xl
  :style      [:modern ...]
  :states     [:default :hover :active :focus :disabled :loading :error]
  :props      {:prop value ...}
  :framework  :vanilla | :react | :vue | :svelte
  :stories    boolean
  :a11y       :full | :basic
  :output     :code | :storybook
  :manifest   component-binding)
```

#### Parameters

**`:stories`** — When true, generates Storybook-compatible stories alongside
the component code. Each variant and state becomes a named story. Essential
for design system documentation.

**`:a11y`** — Accessibility implementation depth. `:basic` adds ARIA attributes
and keyboard handling. `:full` adds complete ARIA patterns per the WAI-ARIA
Authoring Practices Guide, including complex widgets like comboboxes, data grids,
and disclosure widgets.

#### Design rationale

`w/component` is `w/prototype` at a different granularity: where the prototype
generates a whole experience, the component generates one reusable element with
*all* its variants and states. The "all" is the point. The hardest and most
neglected part of component work is not the default appearance but the
exhaustive matrix of states — hover, focus, active, disabled, loading, error,
empty — and the variants that cross them. A button is easy; a button that is
correct across five sizes, five variants, and seven states, each keyboard- and
screen-reader-accessible, is real work, and it is exactly the work the construct
exists to do completely rather than leaving the tedious states as an exercise.

`:states` is therefore first-class, not optional polish. A component generated
with only its default state is the component equivalent of `w/prototype`
returning `Lorem ipsum`: it looks finished and fails the moment it meets a
loading delay or an error. By making the state matrix explicit, the construct
forces the question "what does this look like while loading? when empty? when it
errors?" — the questions that separate a demo component from a production one.

`:stories` and `:a11y :full` reflect that a component is a *contract*, not a
one-off. Storybook stories document the contract for every state so a design
system's consumers can see what they are getting; `:a11y :full` honours the
WAI-ARIA patterns precisely because a reusable component's accessibility
failures are reused everywhere it is, multiplying a single mistake across a
whole product.

#### Example: Accessible data table

```clojure
(w/component :data-table
  :states  [:empty :loading :populated :error :sorted :filtered]
  :props   {:sortable true :filterable true :selectable :multi :paginated true}
  :a11y    :full
  :stories true
  :framework :react
  :output  :code
  :manifest data-table)

;; Generated component includes:
;; ✓ role="grid" with proper aria-* attributes
;; ✓ Keyboard navigation: arrow keys between cells, Home/End, Page Up/Down
;; ✓ aria-sort on column headers when sorted
;; ✓ aria-selected on rows when selected
;; ✓ aria-live region for sort/filter change announcements
;; ✓ Loading state with aria-busy="true"
;; ✓ Empty state with descriptive message
;; ✓ Storybook stories for every state combination
```

---

### `w/tokens`

Defines, manages, and exports a design token system — the named design
decisions that provide consistency across a component library.

#### Signature

```clojure
(w/tokens name
  :primitives  {:color {:red {50 "#fff5f5" ... 950 "#2d0001"} ...}
                :space [0 4 8 12 16 24 32 48 64 96 128]
                :radius [0 2 4 6 8 12 16 24 "50%"]}
  :semantic    {:color {:background {:default "@color.neutral.50"
                                     :subtle   "@color.neutral.100"}
                        :text {:primary "@color.neutral.900"
                               :muted   "@color.neutral.500"}
                        :brand {:default "@color.primary.500"
                                :hover   "@color.primary.600"}}}
  :components  {:button {:padding       "@space.2 @space.4"
                          :border-radius "@radius.2"
                          :font-weight   "600"}}
  :export-as   [:css-custom-properties :scss-variables :js-object :tailwind-config
                :nl-design-system]
  :output      :token-set
  :manifest    token-binding)
```

#### Parameters

**`:primitives`** — Raw values with no assigned meaning: the full colour ramps,
the spacing scale, the radius scale. These are the palette, not yet the
decisions — `red.500` is a colour, not a purpose.

**`:semantic`** — Meaning assigned to primitives by reference (`@color.…`):
`background.default`, `text.muted`, `brand.hover`. Semantic tokens are where
design intent lives, and they reference primitives rather than restating values,
so a primitive change propagates automatically.

**`:components`** — Component-specific tokens that compose semantic and primitive
tokens for one element (`button.padding`, `button.border-radius`). The most
specific tier, applied where a component needs a decision the semantic layer
does not already make.

**`:export-as`** — The output formats to emit. One token set can be exported as
CSS custom properties, SCSS variables, a JS object, a Tailwind config, or mapped
to a published system such as the NL Design System — so the same source of truth
serves every consumer rather than drifting across hand-maintained copies.

#### Design rationale

Design tokens are the bridge between design decisions and code. Without tokens,
colour values scatter across stylesheets, change in one place but not another,
and the visual language drifts into inconsistency. With tokens, a colour change
is a one-line edit that propagates everywhere.

The three-tier structure — primitives, semantic, component — encodes a
deliberate philosophy. Primitives are raw values with no meaning (`red.500`).
Semantic tokens assign meaning (`color.text.danger`). Component tokens apply
semantic tokens to specific components (`button.background.destructive`).
When the brand colour changes, only the primitive changes; semantic and
component tokens follow automatically.

#### Example: A three-tier token set exported to multiple formats

```clojure
(w/tokens "Product Theme"
  :primitives {:color {:primary {50 "#eef2ff" 500 "#6366f1" 900 "#312e81"}
                       :neutral {50 "#f8fafc" 500 "#64748b" 900 "#0f172a"}
                       :red     {500 "#ef4444" 600 "#dc2626"}}
               :space  [0 4 8 12 16 24 32 48 64]
               :radius [0 4 8 12]}
  :semantic   {:color {:background {:default "@color.neutral.50"}
                       :text       {:primary "@color.neutral.900" :muted "@color.neutral.500"}
                       :brand      {:default "@color.primary.500" :hover "@color.primary.900"}
                       :danger     {:default "@color.red.500" :hover "@color.red.600"}}}
  :components  {:button {:padding "@space.2 @space.4" :border-radius "@radius.2"}}
  :export-as   [:css-custom-properties :tailwind-config]
  :manifest    product-theme)

;; Emits the same token set in two formats:
;; - CSS:      --color-brand-default: #6366f1;  (resolved from the primitive)
;; - Tailwind: theme.extend.colors.brand.DEFAULT = '#6366f1'
;;
;; ✓ :danger.default references @color.red.500 — change the red primitive once
;;   and every danger surface (button, alert, validation message) updates, because
;;   nothing downstream restated the hex value. This is the whole point of the
;;   three tiers: decisions reference values, they never copy them.
```

---

### `w/responsive`

Designs or audits the responsive behaviour of an interface as an explicit
strategy — breakpoints, layout transformations, and the deliberate choice of
*which* contexts a layout must serve — rather than treating "responsive" as an
always-on switch. Includes the legitimate option of an interface optimised for a
single context and explicitly not made fluid.

#### Signature

```clojure
(w/responsive target
  :strategy     :fluid | :breakpoint-based | :container-query | :fixed-desktop | :fixed-mobile
  :breakpoints  [width ...] | :default
  :contexts     [:mobile :tablet :desktop :wide :print]
  :transform    {:context {:layout transformation :hide [...] :reflow [...]}}
  :priority     :content | :navigation | :density
  :audit        boolean              ;; analyse existing responsive behaviour instead of designing
  :output       :responsive-spec | :responsive-audit
  :manifest     responsive-binding)
```

#### Parameters

**`:strategy`** — The responsive approach, chosen deliberately:
- `:fluid` — continuous adaptation; layouts flex with the viewport
- `:breakpoint-based` — discrete layouts at named widths (the conventional default)
- `:container-query` — components adapt to their *container's* size, not the
  viewport's; the modern approach for component libraries used in varied contexts
- `:fixed-desktop` — a layout optimised for desktop and explicitly *not* made
  fluid; appropriate for dense internal tooling where a known viewport and
  information density matter more than reach
- `:fixed-mobile` — the mobile equivalent

**`:contexts`** — Which viewing contexts the interface must actually serve.
Naming them is a scoping decision: an internal operations console may legitimately
declare `[:desktop :wide]` and nothing else, and the construct will neither
generate nor demand mobile layouts for it.

**`:transform`** — Per-context layout transformations: what becomes a drawer at
mobile width, which columns collapse, what is hidden, how a table reflows. This
is where responsive design actually lives — not in fluid widths but in the
*structural* changes a layout makes to remain usable.

**`:priority`** — What to protect when space is scarce: `:content` (keep the
primary content legible, sacrifice chrome), `:navigation` (keep wayfinding
available), or `:density` (preserve information density, accept scrolling).

**`:audit`** — When true, analyse a target's *existing* responsive behaviour —
breakpoint coverage, layout-shift problems, contexts that break — rather than
designing new behaviour.

#### Design rationale

`w/responsive` exists because "responsive" had become a flag (`:features
[:responsive]`) that hides the most consequential decisions behind a single
boolean. Responsiveness is not one thing you switch on; it is a *strategy* with
real trade-offs, and collapsing it to a toggle produces interfaces that are
nominally responsive and actually mediocre at every size — the fluid layout that
serves no context well because it was tuned for none of them.

The decisive design choice is making `:fixed-desktop` a first-class, legitimate
strategy rather than a failure to be responsive. Not every interface should be
fluid: a dense operations console, a financial modelling grid, a professional
tool used at a known desk on a known monitor — these are often *better* as a
deliberate desktop-optimised layout than as a compromise that also works on a
phone nobody will use it on. By letting the practitioner declare the contexts
that matter and explicitly exclude the ones that do not, the construct treats
"this is desktop-only, on purpose" as a sound engineering decision with a name,
not an omission to apologise for. Reach is a goal; it is not the only goal, and
an interface that serves its actual users excellently at one size beats one that
serves imaginary users adequately at all sizes.

The `:transform` parameter encodes the truth that responsive design is
*structural*, not dimensional. Amateurs make widths fluid and call it
responsive; the hard, valuable work is deciding what a three-column dashboard
*becomes* on a phone — which panels collapse into a drawer, which table becomes a
card list, what is simply hidden because it does not matter on the smaller
screen. By making transformations explicit per context, the construct puts the
real decisions where they can be reasoned about.

#### Example 1: A deliberately desktop-fixed internal console

```clojure
(w/responsive operations-console
  :strategy  :fixed-desktop
  :contexts  [:desktop :wide]
  :priority  :density
  :manifest  console-responsive)

;; Returns:
{:strategy :fixed-desktop
 :contexts-served [:desktop :wide]
 :contexts-excluded [:mobile :tablet]
 :rationale "Dense operational tooling used at fixed workstations; information
             density and a known viewport outweigh small-screen reach"
 :spec {
   :min-width   1280
   :layout      :multi-panel-grid
   :density     :compact
   :below-min   {:behaviour :horizontal-scroll
                 :note "Below 1280px the console scrolls rather than reflowing —
                        a deliberate choice to preserve the panel layout"}}
 :generated-css "Fixed multi-panel grid; no mobile breakpoints emitted"}
;; ✓ :fixed-desktop is treated as a sound decision, not a missing feature. The
;;   construct records WHY (density + known viewport) and what happens below the
;;   minimum (scroll, not reflow) — the desktop-only choice is explicit and
;;   defended, never an accidental omission.
;; ✓ :contexts-excluded is reported as plainly as :contexts-served; a reviewer
;;   can see mobile was considered and deliberately dropped, not forgotten.
```

#### Example 2: Structural transformation for a public dashboard

```clojure
(w/responsive analytics-dashboard
  :strategy    :breakpoint-based
  :breakpoints [640 1024 1440]
  :contexts    [:mobile :tablet :desktop :wide]
  :transform   {:mobile  {:layout :single-column
                          :hide   [:secondary-sidebar]
                          :reflow [{:from :data-table :to :card-list}]}
                :tablet  {:layout :two-column
                          :reflow [{:from :four-chart-grid :to :two-chart-grid}]}
                :desktop {:layout :three-column}}
  :priority    :content
  :manifest    dashboard-responsive)

;; ✓ The construct's real work is in :transform, not in fluid widths: the data
;;   table BECOMES a card list on mobile, the four-chart grid BECOMES two charts
;;   on tablet, the secondary sidebar is hidden. These structural decisions are
;;   what make a dashboard usable small — not merely shrinking it.
;; ✓ :priority :content means when space is scarce, chrome is sacrificed before
;;   the charts are — the construct knows what to protect.
```

#### Usage patterns

```clojure
;; Audit an existing site's responsive behaviour, then fix the gaps
(~> "https://example.com"
  (w/responsive :audit true :contexts [:mobile :tablet :desktop])
  (w/audit :dimensions [:performance] :standard :lighthouse))

;; Design responsive strategy, then generate the prototype honouring it
(~> (w/responsive dashboard-spec :strategy :container-query :contexts [:tablet :desktop :wide])
  (w/prototype "Analytics Dashboard" :type :dashboard))
```

---

### `w/flow`

Designs the interaction and state behaviour behind a multi-step or stateful
interface — the state machine of a wizard, the optimistic-update-and-rollback of
a save, the error-recovery path of a failed submission. Where `w/component`
gives an element its states, `w/flow` gives a *process* its states and the
transitions between them.

#### Signature

```clojure
(w/flow name
  :steps        [{:name step :screen description :validates [...] :on-error strategy} ...]
  :state-model  :linear | :branching | :state-machine
  :transitions  [{:from step :to step :when condition} ...]
  :persistence  :none | :session | :resumable
  :on-error     {:strategy :retry | :rollback | :save-and-recover | :escalate}
  :optimistic   boolean
  :surface      [:happy-path :error-paths :edge-cases :recovery]
  :manifest     flow-binding)
```

#### Parameters

**`:steps`** — The stages of the interaction, each with what it shows, what it
validates before advancing, and how it handles its own failure. A step is not a
screen — it is a screen *plus the rules for leaving it*.

**`:state-model`** — The shape of the flow:
- `:linear` — strict sequence, each step following the last (a simple checkout)
- `:branching` — the path depends on choices or data (an application that asks
  different questions of different applicants)
- `:state-machine` — full states and transitions, where the same step may be
  reachable from several others (a document moving through draft → review →
  approved → published with rejection loops)

**`:persistence`** — What survives interruption: `:none` (start over),
`:session` (survives navigation within the session), `:resumable` (survives
leaving entirely — the user returns to where they were). A long form with
`:none` persistence is a cruelty; the parameter makes the choice deliberate.

**`:optimistic`** — When true, the interface reflects the intended result
immediately and reconciles with the server afterward, rolling back on failure.
This is the pattern behind interfaces that feel instant, and it requires the
rollback path to be designed, not improvised — which `:on-error` provides.

**`:surface [:error-paths :recovery]`** — The flows most interfaces forget. The
happy path is easy; the value of `w/flow` is forcing the question of what
happens when validation fails at step 3, when the network drops mid-submission,
when the user backs out and returns. Surfacing these makes them designed rather
than discovered in production.

#### Design rationale

`w/flow` fills the gap where real interface complexity actually lives. A
practitioner can generate every screen of a checkout with `w/prototype` and
every component with `w/component`, and still have nothing that says what happens
when payment fails after the address was saved, or how a half-finished
application behaves when the user closes the tab. That behaviour — the
transitions, the persistence, the error recovery — is not in any single screen;
it is in the *process*, and no screen-level or component-level construct can
express it. `w/flow` is the construct for the spaces *between* the screens.

The decisive commitment is treating error and recovery paths as first-class
rather than afterthoughts. Most interfaces are designed happy-path-first and
acquire their error handling reactively, in production, one incident at a time —
which is why so many forms lose your data when they fail. By making
`:on-error` per-step and `:surface [:error-paths :recovery]` explicit, the
construct inverts this: it forces the failure modes to be designed alongside the
success path, where they are cheap to handle well, rather than after launch where
they are expensive and the user has already lost their work. A flow that
describes only its happy path is, like a component with only a default state, a
demo rather than a design.

`:optimistic` and `:persistence` are first-class because they are the decisions
that most shape how an interface *feels* and most often go unmade. Whether a
save feels instant (optimistic) or honest-but-slow (pessimistic), and whether a
long task survives interruption, are product decisions with real trade-offs —
and leaving them implicit means they get decided by accident in the
implementation. Naming them makes them choices.

#### Example: A resumable multi-step application with error recovery

```clojure
(w/flow benefit-application
  :state-model :branching
  :steps [
    {:name :eligibility-check :screen "Initial eligibility questions"
     :validates [:age :residence] :on-error :inline-correction}
    {:name :personal-details   :screen "Applicant details"
     :validates [:required-fields :format] :on-error :inline-correction}
    {:name :income-declaration :screen "Income and assets"
     :validates [:numeric :cross-field-consistency] :on-error :inline-correction}
    {:name :document-upload    :screen "Supporting documents"
     :validates [:file-type :size] :on-error :retry}
    {:name :review-submit      :screen "Review and submit"
     :on-error :save-and-recover}]
  :transitions [
    {:from :eligibility-check :to :personal-details :when :eligible}
    {:from :eligibility-check :to :ineligible-exit  :when :not-eligible}
    {:from :document-upload   :to :review-submit    :when :all-uploaded}]
  :persistence :resumable
  :on-error    {:strategy :save-and-recover}
  :optimistic  false
  :surface     [:happy-path :error-paths :recovery]
  :manifest    application-flow)

;; Returns a flow spec covering the paths a screen-by-screen design would miss:
{:happy-path ["eligibility-check → personal-details → income-declaration
               → document-upload → review-submit → submitted"]
 :branches   [{:at :eligibility-check :on :not-eligible :to :ineligible-exit
               :note "Early exit with explanation — does not waste the applicant's time
                      filling a form they cannot submit"}]
 :error-paths [
   {:at :income-declaration :failure :cross-field-inconsistency
    :handling "Inline correction; declared income vs assets flagged before advance,
               not after submission"}
   {:at :document-upload :failure :upload-fails
    :handling "Retry with preserved form state; the four prior steps are not lost"}]
 :recovery {
   :persistence :resumable
   :behaviour "Applicant can close the tab at any step and return to the same step
               with all prior input intact — a multi-day application is normal"}}
;; ✓ The construct's value is the paths beyond the happy one: the early exit for
;;   ineligible applicants, the cross-field check that fails BEFORE submission,
;;   the upload retry that preserves four steps of work. None of these live in
;;   any single screen; they are properties of the process.
;; ✓ :persistence :resumable is a deliberate product decision — a benefit
;;   application may span days, so losing progress on tab-close would be a real
;;   harm. Naming it makes it a choice, not an implementation accident.
```

#### Usage patterns

```clojure
;; Design the flow, then generate the screens that realise each step
(~> (w/flow checkout :state-model :linear :steps [...] :persistence :session)
  (w/prototype "Checkout" :type :form :from-flow true))

;; A flow's steps and validation can derive from a domain model's constraints
(w/flow :from-domain order-domain
  :state-model :linear
  :persistence :resumable)
```

---

### `w/copy`

Generates or audits the user-facing text of an interface — button labels, empty
states, error messages, helper text, confirmations — as a coherent, voice-
consistent system bound to the components and states that contain it. Microcopy
is interface, and this construct treats it as a designed artefact rather than
placeholder filler.

#### Signature

```clojure
(w/copy target
  :surfaces   [:buttons :empty-states :error-messages :helper-text
               :confirmations :tooltips :loading-states :success-messages]
  :voice      {:tone keyword :person :first | :second :formality level}
  :for-component component-or-flow      ;; bind copy to a specific component/flow's states
  :audit      boolean                    ;; review existing copy instead of generating
  :principles [:clarity :brevity :actionable :blameless-errors :consistent-terms]
  :locale     locale                     ;; language and regional conventions
  :output     :copy-set | :copy-audit
  :manifest   copy-binding)
```

#### Parameters

**`:surfaces`** — Which categories of microcopy to generate or audit. Error
messages and empty states are the highest-value surfaces and the most neglected:
an empty state is the first thing a new user sees, and an error message is read
at the user's worst moment.

**`:voice`** — The voice the copy must hold consistently: tone (plain,
warm, authoritative, playful), grammatical person, and formality. The value of
defining voice once is consistency — a product whose buttons say "Submit" in one
place and "Send it!" in another has a voice problem the user feels as
incoherence.

**`:for-component`** — Binds the copy to a specific component's or flow's states,
so that every state that needs words gets them: the data table's empty state,
its loading message, its error; the flow's per-step helper text and validation
messages. This is the seam with `w/component` and `w/flow` — they define the
states; `w/copy` writes what each state says.

**`:principles`** — The rules the copy must follow. `:blameless-errors` is the
most important: error messages that tell the user what to do next without
implying they did something stupid ("That email is already registered — sign in
instead?" not "Invalid input").

#### Design rationale

`w/copy` treats microcopy as the interface element it actually is. Every button,
every empty state, every error message is words, and those words do as much to
make an interface usable — or unusable — as any visual decision. Yet microcopy is
the most common place where `w/prototype`'s "production quality, no placeholders"
rule is honoured in the layout and quietly broken in the text: real components
wrapped around `Lorem ipsum` button labels and "An error occurred." This
construct exists to close that gap, generating copy that is as finished as the
components it sits in.

The boundary with `eloquence` is deliberate and clean. `eloquence` composes
*documents* — long-form prose with an argument and an arc, addressed to a reader
who sits and reads. `w/copy` writes *interface* — fragments bound to states and
actions, read in passing by a user trying to do something else. The two require
different disciplines: eloquence optimises for persuasion and flow, microcopy for
clarity and brevity at the exact moment of need. An error message is not a small
essay; it is a different kind of writing, governed by `:blameless-errors` and
`:actionable` rather than by rhetoric. Keeping `w/copy` in `web` and bound to
components and states reflects that interface copy lives with the interface, not
in the document grimoire.

The construct's defining commitment is that **error and empty states are where
copy matters most**. These are the surfaces a happy-path design never writes and
a real user always hits: the empty state that should onboard but says "No data",
the error that should guide but says "Something went wrong". By making these
first-class `:surfaces` and applying `:blameless-errors`, the construct puts the
writing effort exactly where the user's experience is most fragile.

#### Example: Copy for a data table's states

```clojure
(w/copy customer-data-table
  :surfaces   [:empty-states :error-messages :loading-states :tooltips]
  :voice      {:tone :plain :person :second :formality :professional}
  :for-component customer-data-table        ;; the w/component from earlier
  :principles [:clarity :brevity :actionable :blameless-errors]
  :locale     :en
  :manifest   table-copy)

;; Returns copy bound to each of the component's states:
{:empty-states {
   :no-data        {:heading "No customers yet"
                    :body    "When you add your first customer, they'll appear here."
                    :action  "Add customer"}
   :no-results     {:heading "No customers match your filters"
                    :body    "Try widening your search or clearing filters."
                    :action  "Clear filters"}}
 :error-messages {
   :load-failed    "We couldn't load your customers. Check your connection and try again."
   :save-failed    "That change didn't save. Your edits are still here — try again."}
 :loading-states {
   :initial        "Loading customers…"
   :filtering      "Updating results…"}
 :tooltips {
   :sort-column    "Sort by this column"
   :bulk-select    "Select all customers on this page"}}
;; ✓ Two distinct empty states, not one: "no data yet" (a new user — onboard them
;;   toward adding their first customer) versus "no results" (an existing user
;;   whose filters are too narrow — help them widen). Collapsing these into one
;;   "No data" message fails whichever user it wasn't written for.
;; ✓ :blameless-errors in action: "That change didn't save. Your edits are still
;;   here" tells the user what happened and reassures them their work survived —
;;   never "Invalid request" or anything implying they erred.
```

#### Usage patterns

```clojure
;; Generate components and flows, then write the copy for every state they expose
(~> (w/component :data-table :states [:empty :loading :error :populated])
  (w/copy :surfaces [:empty-states :error-messages :loading-states]
          :voice {:tone :plain :person :second}))

;; Audit an existing interface's copy for voice consistency and blameless errors
(w/copy "https://example.com/app"
  :audit true
  :surfaces [:error-messages :empty-states]
  :principles [:blameless-errors :consistent-terms])
```

---

## Part III: Audit and quality

---

### `w/audit`

Performs a comprehensive audit of a web project or URL across accessibility,
performance, SEO, and code quality dimensions.

#### Signature

```clojure
(w/audit source
  :from       :url | :html | :project-path
  :dimensions [:accessibility :performance :seo :code-quality :security]
  :standard   :wcag-aa | :wcag-aaa | :lighthouse | :custom
  :severity   :all | :errors-only | :errors-and-warnings
  :output     :audit-report | :fix-suggestions
  :manifest   audit-binding)
```

#### Parameters

**`:dimensions`** — Which aspects to audit: `:accessibility` (WCAG conformance),
`:performance` (render path, layout shift, bundle), `:seo` (metadata, structure,
crawlability), `:code-quality` (semantic HTML, maintainability), and `:security`
(common front-end exposures). Audit only what is relevant; a static marketing
page rarely needs the security dimension.

**`:standard`** — The benchmark to judge against: `:wcag-aa` or `:wcag-aaa` for
accessibility, `:lighthouse` for the combined Google metric, or `:custom` for an
organisation's own ruleset. The standard determines what counts as a pass.

**`:severity`** — How much to report: `:all`, `:errors-only`, or
`:errors-and-warnings`. Use `:errors-only` for a release gate; `:all` for a
thorough review.

**`:output`** — `:audit-report` lists findings; `:fix-suggestions` goes further,
producing prioritised, specific code changes for each finding — suitable for
feeding directly into a `refine` invocation.

#### Design rationale

Code that generates code must be able to audit code. `w/audit` closes the loop:
a practitioner can generate a prototype with `w/prototype`, audit it with
`w/audit`, and refine it based on the findings — all within the same grimoire.

The `:output :fix-suggestions` mode goes further than identifying problems: it
produces a prioritised list of specific code changes that would resolve each
finding, suitable for feeding directly into a `refine` invocation.

#### Example

```clojure
(w/audit "https://generated-portal.example.com"
  :dimensions [:accessibility :performance :seo]
  :standard   :wcag-aa
  :output     :fix-suggestions
  :manifest   portal-audit)

;; Returns:
{:url    "generated-portal.example.com"
 :score  {:accessibility 87 :performance 94 :seo 91}

 :issues [
   {:dimension  :accessibility
    :severity   :error
    :wcag       "1.4.3"
    :element    ".card-description"
    :finding    "Text colour #767676 on #F5F5F5 background fails contrast ratio (2.9:1 < 4.5:1)"
    :fix        "Change color to #595959 or darken background to #FFFFFF"}

   {:dimension  :accessibility
    :severity   :error
    :wcag       "4.1.2"
    :element    ".icon-button"
    :finding    "Button has no accessible name"
    :fix        "Add aria-label=\"Close\" or include visually-hidden text span"}

   {:dimension  :performance
    :severity   :warning
    :finding    "3 images missing width/height attributes cause layout shift (CLS 0.18)"
    :fix        "Add explicit width and height to img elements"}]

 :refine-invocation
   "(refine generated-portal
      :focus-on :accessibility
      :fix [:colour-contrast :icon-button-labels :image-dimensions])"}
```

---

### `w/migrate`

Migrates a web project from one framework, CSS approach, or toolchain to
another, preserving visual appearance and behaviour while updating the
implementation.

#### Signature

```clojure
(w/migrate source-project
  :from    {:framework :vanilla :css :scss}
  :to      {:framework :react :css :tailwind}
  :preserve [:visual-design :behaviour :accessibility :seo]
  :strategy :component-by-component | :full-rewrite
  :output  :migrated-project
  :manifest migrated-binding)
```

#### Parameters

**`:from`** / **`:to`** — The source and target stacks, each naming a
`:framework` and a `:css` approach. The construct translates between them; naming
both ends precisely is what lets it map idioms correctly (Bootstrap utility
classes to Tailwind, jQuery handlers to React hooks).

**`:preserve`** — What must survive the migration unchanged: `:visual-design`
(same colours, spacing, type), `:behaviour` (same interactions), `:accessibility`
(same ARIA and keyboard patterns), `:seo` (same metadata and structure). These
are the invariants the migration is judged against — a migration that changes the
look has failed regardless of how clean the new code is.

**`:strategy`** — `:component-by-component` migrates incrementally, one element at
a time, allowing a gradual transition and review at each step;
`:full-rewrite` rebuilds the whole project at once. Incremental is safer for
large or live projects; full-rewrite is faster for small ones.

#### Design rationale

Framework migrations are painful and risky. The visual design, behaviour, and
accessibility of the source must survive the migration intact. `w/migrate`
makes migration declarative: the practitioner specifies what they are moving
from, what they are moving to, and what must be preserved. The system handles
the mechanical translation.

#### Example

```clojure
(w/migrate "legacy-portal/"
  :from     {:framework :vanilla :css :bootstrap-4}
  :to       {:framework :react :css :tailwind}
  :preserve [:visual-design :behaviour :accessibility]
  :strategy :component-by-component
  :manifest portal-migration)

;; Migrates component by component:
;; ✓ Header: Bootstrap navbar → React component with Tailwind
;; ✓ Tables: jQuery DataTables → React table with Tailwind
;; ✓ Forms: Bootstrap forms → React Hook Form with Tailwind
;; ✓ All ARIA attributes and keyboard patterns preserved
;; ✓ Visual appearance preserved — same colours, spacing, typography
;; ✓ Migration report: 23 components migrated, 2 require manual review
```

---

## Best practices

### Accessibility is correctness, not decoration

Accessibility failures are correctness failures. A button with no accessible
name is as broken as a button with no click handler — it simply fails for
a different user. Use `:accessibility :wcag-aa` on every `w/prototype`
invocation. Use `w/audit` after every significant refinement. Treat
accessibility findings with the same urgency as functional bugs.

### Extract before you design

Before designing a new system that must co-exist with existing brand assets,
use `w/extract-style` to capture what exists. Designing against an extracted
token set ensures consistency. Without this step, colour values diverge,
spacing drifts, and the new system looks slightly wrong next to the old one.

### Apply tokens, not values

Never hard-code a colour value, spacing value, or type size in a component.
Always reference a design token. When the brand colour changes, one token
value changes and everything updates. When you hard-code values, change is
a search-and-replace exercise that always misses something.

### Domain-first for data-heavy interfaces

When generating interfaces for domain-heavy applications (CRM, healthcare
portals, government services), use `:from-domain` with a domain model rather
than describing the interface manually. The domain model encodes entity
relationships, field types, constraints, and valid states — all of which
should inform the interface. Generating from domain ensures consistency
between the interface and the underlying data model.

### Prototype at the right level of fidelity

`w/prototype` generates a complete, deployable project. If you need a sketch
to validate a concept before committing to a full prototype, use `w/component`
for individual elements or ask for a single-file output. Match fidelity to
purpose: sketches for concept validation, prototypes for stakeholder review,
production builds for deployment.

### Anti-patterns

**Treating "responsive" as a switch.** Adding `:features [:responsive]` and
considering the matter handled produces an interface that is nominally fluid and
actually mediocre at every size, because it was tuned for none of them. Use
`w/responsive` to make the strategy and the per-context transformations explicit
— and where an interface genuinely serves one context (dense internal tooling at
a known workstation), declare `:fixed-desktop` deliberately rather than bolting
on breakpoints nobody needs.

**Shipping the happy path and discovering the rest in production.** A prototype
that renders every screen but defines no error recovery, no empty states, and no
persistence is a demo, not a design. The form that loses your data on a failed
submit and the dashboard that says "No data" to a confused new user are the
predictable result. Use `w/flow` to design the error and recovery paths
alongside the happy path, and `w/copy` to write the empty and error states the
happy path never reaches.

**Placeholder copy inside production components.** Honouring "no placeholders" in
the layout while wrapping it around `Lorem ipsum` labels and "An error occurred"
breaks the production-quality rule where the user actually reads. Microcopy is
interface; generate it with `w/copy`, especially the empty and error states.

**Hard-coding values that belong in tokens.** A colour or spacing value written
directly into a component is a future inconsistency waiting to happen — it will
be missed when the system changes. Reference a token; let `w/tokens` own the
decision so a single edit propagates everywhere.

**Extracting styles without normalising them.** Lifting a site's raw values
verbatim propagates its accumulated mess — the fourteen near-identical greys, the
colour defined six ways. Use `:normalise-names` and `:generate-variants` so what
you extract is a coherent design *system*, not a snapshot of someone else's
technical debt.

---

## Integration patterns

### Extract → customise → prototype

The canonical pattern for brand-consistent generation:

```clojure
(def brand-theme
  (w/extract-style corporate-site
    :map-to-tokens :nl-design-system))

(w/prototype "Internal Tools Portal"
  :apply-theme brand-theme
  :from-domain ops-domain
  :type        :app
  :framework   :react
  :output      :project)
```

### Domain → prototype → audit → refine

Complete quality loop:

```clojure
(def portal
  (~> domain-model
    (w/prototype "Service Portal"
      :type :portal :accessibility :wcag-aaa)
    (w/audit :dimensions [:accessibility :performance])
    ;; audit returns :refine-invocation
    ))
```

### Threading design token changes

```clojure
(~> (w/tokens "Brand Theme"
      :primitives {:color {:primary {...}}}
      :semantic   {:color {:brand {:default "@color.primary.500"}}})
  (w/prototype "Portal" :from-tokens true)
  (w/audit :dimensions [:accessibility]))
```

### Strategy → structure → words: the full interface

The new constructs compose into a complete interface specification — responsive
strategy, interaction flow, and copy — before a line of the prototype is fixed:

```clojure
(~> application-domain
  (w/responsive :strategy :breakpoint-based :contexts [:mobile :tablet :desktop]
                :priority :content)
  (w/flow      "Application" :state-model :branching :persistence :resumable
               :surface [:happy-path :error-paths :recovery])
  (w/copy      :surfaces [:helper-text :error-messages :empty-states]
               :voice {:tone :plain :person :second} :principles [:blameless-errors])
  (w/prototype "Benefit Application Portal" :type :form
               :from-domain application-domain :accessibility :wcag-aaa)
  (w/audit     :dimensions [:accessibility :performance]))
;; Responsive behaviour, interaction states, and microcopy are all designed
;; deliberately, then the prototype realises them and the audit verifies the result.
```

---

## Grimoire metadata

```clojure
{:grimoire    "web"
 :namespace   "w/"
 :version     "2.1.0"
 :description "Web analysis, extraction, generation, responsive and interaction
               design, interface copy, auditing, and migration"

 :constructs {
   :analysis    [w/analyze w/extract-style w/extract-structure]
   :generation  [w/prototype w/component w/tokens w/responsive w/flow w/copy]
   :quality     [w/audit w/migrate]}

 :best-for [
   "Landing pages, dashboards, and web applications from declarative descriptions"
   "Design system extraction from existing sites"
   "Token mapping to published design systems (NL Design System, Tailwind)"
   "Accessibility-first interface generation (WCAG AA/AAA)"
   "Responsive strategy as an explicit, controllable decision — including
    deliberate desktop-fixed layouts for dense internal tooling"
   "Interaction and state-machine design for multi-step, stateful interfaces"
   "Interface microcopy: error states, empty states, and voice consistency"
   "Domain-driven interface generation from domain models"
   "Framework migration with visual and behaviour preservation"
   "Design token management and multi-format export"]

 :works-with [:core :domain :data :eloquence]

 :key-concepts [
   {:term "Design token"
    :definition "A named design decision: a colour, spacing value, or type size.
                 Tokens decouple design decisions from implementation, enabling
                 consistent change propagation."}
   {:term "Design system"
    :definition "A coherent collection of design tokens, components, and patterns
                 that provides consistent visual language across an interface"}
   {:term "WCAG"
    :definition "Web Content Accessibility Guidelines. AA is the legal minimum
                 in most jurisdictions; AAA is the highest standard."}
   {:term "NL Design System"
    :definition "The Dutch government's open, token-based design system and
                 component library — one of the published systems w/extract-style
                 and w/tokens can map to via :map-to-tokens / :export-as"}
   {:term "Responsive strategy"
    :definition "The deliberate choice of which viewing contexts an interface
                 serves and how its layout transforms between them — fluid,
                 breakpoint-based, container-query, or a deliberately fixed layout
                 optimised for a single context. A decision, not a switch."}
   {:term "Flow"
    :definition "The interaction and state behaviour of a multi-step or stateful
                 interface: its steps, transitions, persistence, and error-recovery
                 paths. What happens between the screens, not within them."}
   {:term "Microcopy"
    :definition "The user-facing text bound to interface elements and states —
                 labels, helper text, empty states, error messages. Treated as a
                 designed, voice-consistent system, distinct from the long-form
                 prose that eloquence composes."}
   {:term "Responsive"
    :definition "Layouts that adapt appropriately across device sizes, from
                 mobile (320px) through tablet (768px) to desktop (1280px+)"}]}
```

---

## Implementation notes for LLM processors

### Production quality means complete code

Every `w/prototype` and `w/component` invocation must produce code that:
- Has no placeholder text (`Lorem ipsum`, `TODO`, `PLACEHOLDER`)
- Has no broken or missing functionality
- Includes realistic sample content appropriate to the domain
- Has complete, working JavaScript (no stub functions)
- Compiles without errors with the specified toolchain

### Accessibility as a first-class constraint

When `:accessibility :wcag-aa` is specified (which is the default):
- Every `<img>` must have an `alt` attribute
- Every `<input>`, `<select>`, and `<textarea>` must have an associated `<label>`
- Colour contrast must be ≥ 4.5:1 for body text, ≥ 3:1 for large text
- All interactive elements must be keyboard operable
- Focus must be visible on all interactive elements (not removed with `outline: none`)
- Headings must form a logical hierarchy
- ARIA landmark roles must be present: `header`, `nav`, `main`, `footer`
- Skip navigation link must be first focusable element

With `:accessibility :wcag-aaa`, additionally:
- Colour contrast ≥ 7:1 for body text
- No content flashes more than 3 times per second
- All complex components follow WAI-ARIA Authoring Practices patterns precisely

### Token application

When `:apply-theme` is provided, apply all tokens from the theme to CSS custom
properties before generating any component styles. Never hard-code a colour or
spacing value that appears in the token set. Component styles reference tokens
via `var(--token-name)`.

### Framework idioms

Generated code must follow each framework's idiomatic patterns:
- **React**: functional components with hooks; no class components; TypeScript
  types when applicable; React Hook Form for forms
- **Vue**: Composition API (`setup` function); not Options API
- **Svelte**: reactive declarations and `$:` syntax
- **Vanilla**: ES6+ modules; no jQuery; Web Components where appropriate

### Domain-driven generation

When `:from-domain` is provided:
- Every entity in the domain model becomes a section or route in the interface
- Entity attributes map to form fields with appropriate input types
- Domain constraints map to client-side validation rules
- Entity relationships inform navigation (breadcrumbs, linked views)
- Operations in the domain model map to buttons and actions in the interface

### Responsive strategy is a decision, not a default

When processing `w/responsive`, never treat `:fixed-desktop` or `:fixed-mobile`
as an error or an incomplete responsive implementation. A declared single-context
layout is a legitimate engineering choice; honour it by emitting no breakpoints
for excluded contexts and recording why the context set was chosen. Report
`:contexts-excluded` explicitly so the decision is visible and auditable, never
silently omitted.

The substance of responsive design is in `:transform`, not in fluid widths.
When generating a responsive spec, specify the *structural* changes per context
— what collapses into a drawer, which table reflows to a card list, what is
hidden — rather than only scaling dimensions. A spec that merely makes widths
percentage-based has not done the responsive work.

### Flow error and recovery paths are mandatory output

When processing `w/flow`, always produce the error and recovery paths, even when
`:surface` requests only the happy path — surface them as a note if not
requested in full. A flow specification that describes only the success sequence
has omitted the part that fails in production. For every step, the output must
say what happens when its validation fails, and for the flow as a whole, what
survives interruption per `:persistence`. Treat `:persistence :none` on a long
or multi-step flow as worth flagging: it means the user loses everything on
interruption, which is rarely intended.

### Copy: blameless errors and distinct empty states

When processing `w/copy`, apply `:blameless-errors` unconditionally to error
surfaces: an error message states what happened and what to do next, never
implies user fault, and reassures about preserved work where applicable. Prefer
"That email is already registered — sign in instead?" to "Invalid input".

Generate distinct copy for the two kinds of empty state, which are frequently
conflated: the *first-run* empty state (no data exists yet — onboard the user
toward creating the first item) and the *no-results* empty state (data exists
but the current filter or search excludes it — help the user widen). A single
"No data" message fails whichever user it was not written for. Hold all
generated copy to the declared `:voice` consistently across every surface; voice
drift between surfaces is itself a defect.