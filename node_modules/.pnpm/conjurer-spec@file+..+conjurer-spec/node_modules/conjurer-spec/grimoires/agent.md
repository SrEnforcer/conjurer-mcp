# agent.md — Conjurer Agent Grimoire

The spellbook for autonomous action. Where `orchestrate` coordinates known
steps along known paths, `agent` navigates unknown terrain toward known
destinations — and sometimes helps discover what the destination should be.
An agent does not execute instructions; it pursues goals. The difference is
the difference between a procedure and a judgment.

---

## Philosophy

### Choreography versus improvisation

Every complex system requires coordination. The question is what *kind* of
coordination — and the answer depends on how much of the path is known in
advance.

`orchestrate` is choreography: the steps are specified, the routing is
declared, the compensations are registered. The workflow knows exactly what
to do in each situation. Its power is predictability; its limit is that it
can only handle situations it was designed for.

`agent` is improvisation within constraints: the goal is specified, the
capabilities are declared, the constraints are bounded — but the *path* to
the goal is determined by the agent's judgment as it acts. An agent can
try an approach, observe what it produced, revise its strategy, delegate
a sub-task it cannot handle alone, and report what it learned. It handles
situations it was not explicitly designed for, because its design is a set
of capabilities rather than a set of steps.

The practitioner's decision — workflow or agent — follows from the structure
of the task itself:

- **Known path, known steps**: use `o/define-workflow`
- **Known goal, unknown path**: use `a/delegate`
- **Known goal, known approach, specific ask**: use `a/invoke`
- **Contested or complex goal, needs exploration**: use `a/supervise` with a team

Neither paradigm is superior. Using an agent for a task that has a perfectly
specifiable workflow wastes autonomy on a problem that does not need it.
Using a workflow for a task that requires judgment produces brittle
specifications that break on every edge case they were not designed to handle.

### Why multiple agents produce what single agents cannot

A single agent, however capable, has a single perspective. It has trained
strengths and trained blind spots. It surfaces the considerations its
architecture makes salient and misses the ones it was not shaped to see.

A security-specialist agent examining an architecture sees threat surfaces,
trust boundaries, and attack vectors. A performance-specialist agent examining
the same architecture sees bottlenecks, lock contention, and cache misses.
A product-specialist agent sees user friction, missing affordances, and
conversion blockers. These perspectives are not reducible to each other.
No architecture review that applies only one of them is complete.

Multi-agent systems enable *epistemic diversity* — the simultaneous application
of genuinely different frameworks to the same problem. The `a/compose` and
`a/supervise` constructs make this diversity structural rather than accidental.
The practitioner declares which perspectives to apply; the system applies
them in parallel and synthesises the result.

This is not redundancy. It is coverage. Consensus among specialists is
more reliable than the output of any single generalist, precisely because
the specialists disagree productively — each pushing the final result toward
quality that no one of them could achieve alone.

### Trust and the transparency imperative

Autonomous agents acting with broad authority are a category of risk. An
agent given an unclear goal and wide latitude can produce impressive output
in the wrong direction — and may have made many self-reinforcing decisions
before the problem becomes visible.

The `agent` grimoire is built around two mitigations:

**Explicit constraints.** Every agent definition declares `:constraints` —
what the agent must not do, what it must always do, what it may never produce.
These are not hints; they are architectural boundaries that the agent
honours regardless of what the goal seems to require. An agent instructed
to produce TypeScript that never throws exceptions applies that constraint
even when a naive approach would throw.

**Earned autonomy through transparency.** Agents report their reasoning,
not just their outputs. `a/delegate` returns not just the produced artefact
but the path the agent took — what it tried, what it observed, what it
decided, where it was uncertain. This earned autonomy model means
practitioners can extend trust incrementally: tight constraints and
frequent reporting for new agent types; looser constraints and summary
reporting for well-understood ones.

### The agent grimoire's relationship to other grimoires

**`core` provides `handover`** — the context transfer mechanism. When a
practitioner hands off to a specialist agent, `handover` packages the
charter, domain model, assets, and target specifications. `agent` describes
what the receiving agent *is* and *does with* that context.

**`orchestrate` handles deterministic workflows.** When an agent completes
a step and the next step is fully determined, the transition belongs in an
`o/define-workflow`. When the next step requires agent judgment, it stays
in the agent.

Two specific overlaps with `orchestrate` are worth disambiguating, because the
constructs look similar and are not:

- **Human checkpoints.** Both `o/human-approval` and `a/delegate :approve` pause
  for human judgment — but they guard different things. `o/human-approval` is a
  *workflow stage*: a deterministic process reaches a point where policy requires
  a person to decide before the next known step runs (a compliance sign-off, a
  fraud-threshold review). `a/delegate :approve` is a *leash on autonomy*: an
  agent exercising judgment pauses so a human can confirm its self-directed
  approach before it continues. Use `o/human-approval` when the gate is part of
  the process; use `:approve` when the gate is on the agent's discretion. When
  both apply — an agent does autonomous work *inside* a workflow that also needs
  a policy sign-off — they compose, as the integration patterns show.

- **Coordination.** `a/compose`/`a/supervise` coordinate *agents* (entities that
  exercise judgment); `o/define-workflow` coordinates *operations* (steps that
  execute). The test is the same one that distinguishes workflow from agent at
  the task level: if the units being coordinated each require judgment about
  *how* to proceed, coordinate them as agents; if each unit is a determined
  operation, coordinate them as a workflow. A pipeline of specialist reviewers
  is `a/compose`; a pipeline of known transformations is `o/define-workflow`.

**Tool access is the deployment-environment boundary.** `a/equip` is where the
agent grimoire meets the IDE it runs in. The agent's identity and constraints
are portable; its equipment — which MCP servers, file paths, and permissions it
holds — is granted per deployment. This keeps the same agent definition usable
across Copilot, Antigravity, and other targets, equipped differently in each.

**`semantics`, `reasoning`, and `domain`** are the analytical engines that
agents invoke. A domain-specialist agent uses `d/explore` to understand
its territory. A compliance agent uses `r/derive` to determine what rules
apply. A documentation agent uses `e/compose` to write to its audience.
Agents are coordinators of grimoire capabilities, not replacements for them.

### Four design principles

**Goal specification over step specification** — Agents are directed toward
outcomes, not procedures. The practitioner specifies what should be achieved;
the agent determines how.

**Earned autonomy** — Agents report their reasoning. Constraints are explicit.
Trust is extended incrementally as reliability is demonstrated.

**Epistemic diversity through specialization** — Different agents bring
genuinely different perspectives. Multi-agent coordination produces results
that no single perspective could reach alone.

**Graceful human integration** — Agents augment human judgment; they do not
replace it. The patterns for surfacing agent outputs to human reviewers are
as important as the patterns for autonomous execution.

---

## Naming rationale

**`agent`** — From Latin *agere*, to do, to act. In philosophy of action,
an agent is an entity that acts with intention — not merely a mechanism
that reacts to inputs. This is the precise distinction from an orchestrated
step: a workflow step executes; an agent acts. The choice of this word
over alternatives like "worker" or "executor" is deliberate.

**`a/`** — The short namespace alias.

**`a/define`** — Declaring an agent's identity: its capabilities, specializations,
constraints, and memory model.

**`a/memory`** — From Latin *memoria*, the faculty of retaining. An agent's
memory is its operational record across invocations — what it has tried, learned,
and resolved — distinct from the domain knowledge it reasons over.

**`a/equip`** — From Old French *esquiper*, to fit out a ship for a voyage. To
equip an agent is to grant it the tools and access it needs to act, with the
permissions that bound how far that access reaches.

**`a/invoke`** — From Latin *invocare*, to call upon. A directed call with
a specific task and expected output — the agent equivalent of a function call.

**`a/delegate`** — From Latin *delegare*, to entrust with authority. You
delegate to someone you trust to exercise judgment; you give instructions
to someone who executes mechanically. The word carries the right connotation
of granted autonomy.

**`a/compose`** — From Latin *componere*, to put together. Multiple agents
assembled into a coordinated pipeline.

**`a/supervise`** — From Latin *super* + *videre*, to see from above. A
supervisor maintains the view of the whole while the team works on the parts.

**`a/evaluate`** — From Latin *evaluare*, to determine the value of. Structured
assessment of an agent's output against explicit criteria.

**`a/reflect`** — From Latin *reflectere*, to bend back. An agent turns
its attention back on its own output and reasoning.

**`a/negotiate`** — From Latin *negotiari*, to carry on business between
parties. To negotiate is to arrive at agreement through structured exchange
rather than unilateral assertion.

---

## Part I: Agent definition

### `a/define`

Declares an agent's identity — its specialization, the standards and domain
knowledge it applies, the artefacts it produces, the constraints it operates
within, and how it manages state across invocations.

An agent definition is not a prompt. It is a capability declaration: a
structured description of what kind of reasoning the agent applies, what
it knows, what it will and will not do. The definition is an `asset` — it
can be registered and referenced by name throughout the project.

#### Signature

```clojure
(a/define name
  :description    "what this agent does and why it exists"
  :specializes-in [:capability ...]
  :knows          [:asset-name ...]
  :produces       [:artefact-type ...]
  :accepts        [:context-type ...]
  :constraints    ["hard constraint on agent behaviour" ...]
  :style          {:reasoning   :explicit | :implicit
                   :confidence  :calibrated | :assertive
                   :verbosity   :terse | :standard | :detailed}
  :memory         :none | :session | :task
  :version        semver
  :manifest       agent-binding)
```

#### Parameters

**`:specializes-in`** — The capabilities that distinguish this agent from
a general-purpose system. A specialist applies deeper knowledge and more
rigorous standards to its domain than a generalist would. Named capabilities
should correspond to grimoire constructs or domain expertise areas:
`:typescript-generation`, `:security-review`, `:domain-modelling`,
`:regulatory-compliance`, `:api-design`, `:test-generation`.

**`:knows`** — Registered `asset` definitions this agent applies. When
an agent `:knows [:team-coding-standard]`, it fetches that asset's
`:location` file and applies all `:enforces` constraints and `:prohibits`
anti-patterns to every artefact it produces. Knowledge is not metadata —
it changes behaviour.

**`:constraints`** — Hard limits on agent behaviour. These are not style
preferences; they are non-negotiable constraints that apply regardless of
what the goal seems to require. An agent with a constraint "Never produce
code that catches and swallows exceptions" applies that constraint even
when the goal makes it tempting to do so.

**`:style`**:
- `:reasoning :explicit` — the agent narrates its reasoning alongside its
  output. Slows production; increases inspectability.
- `:reasoning :implicit` — the agent produces output without narrating
  reasoning unless asked. Faster; requires `a/reflect` or `explain` for
  transparency.
- `:confidence :calibrated` — the agent hedges where uncertain and is
  explicit about what it does not know.
- `:confidence :assertive` — the agent commits to its output without
  hedging. Appropriate when the practitioner will evaluate and correct.

**`:memory`**:
- `:none` — no state across invocations; each call is independent
- `:session` — accumulates task-level state within the current session
- `:task` — persists state across sessions for the duration of a named task

#### Design rationale

The agent definition is the agent's contract with the practitioner. Without
it, the practitioner cannot reason about what an agent will do in situations
the examples do not cover. Without explicit `:constraints`, there is no
principled way to audit agent behaviour. Without `:knows`, the application
of standards is invisible.

A well-defined agent can be reasoned about in the abstract: "Would the
security-reviewer agent flag this pattern?" If the agent has explicit
specializations and constraints, this question is answerable. If it does
not, it is not.

#### Example 1: TypeScript code generation agent

```clojure
(a/define :typescript-agent
  :description    "Generates TypeScript following team functional coding standard;
                   specialises in REST API and data layer implementations"
  :specializes-in [:typescript-generation :api-design :schema-definition]
  :knows          [:team-coding-standard :openapi-conventions]
  :produces       [:typescript-source :openapi-spec :zod-schemas :test-suite]
  :accepts        [:domain-model :openapi-spec :conjurer-target :user-stories]
  :constraints    [
    "Never produce TypeScript that uses throw for business logic errors"
    "All external boundaries must have runtime validation"
    "No implicit any — all types must be explicit"
    "Functions must be pure unless explicitly annotated as effectful"]
  :style          {:reasoning  :explicit
                   :confidence :calibrated}
  :memory         :task
  :version        "1.2.0"
  :manifest       typescript-agent)
```

#### Example 2: Security review agent

```clojure
(a/define :security-reviewer
  :description    "Reviews artefacts for security vulnerabilities, threat
                   vectors, and compliance with secure-by-default principles"
  :specializes-in [:security-review :threat-modelling :owasp-top-10
                   :secrets-management :auth-review]
  :knows          [:owasp-top-10 :team-security-policy]
  :produces       [:security-report :threat-model :remediation-plan]
  :accepts        [:source-code :api-spec :architecture-diagram :database-schema]
  :constraints    [
    "Report all findings regardless of perceived severity — never suppress"
    "Distinguish between confirmed vulnerabilities and theoretical risks"
    "Always propose a specific remediation for every finding"]
  :style          {:reasoning  :explicit
                   :confidence :calibrated
                   :verbosity  :detailed}
  :memory         :session
  :version        "2.0.0"
  :manifest       security-reviewer)
```

---

### `a/memory`

Defines a named memory store for an agent — explicit, inspectable operational
state that persists across invocations within the memory scope.

Agent memory is distinct from all other state mechanisms in Conjurer:

- `context` holds *domain knowledge* — what the domain is
- `charter` holds *project history* — what was decided and why
- `assume` holds *operative constraints* — what the environment looks like
- `a/memory` holds *task-level operational state* — what this agent has
  done, what it learned, what partial progress it has made

#### Signature

```clojure
(a/memory name
  :for      :agent-name
  :scope    :session | :task
  :schema   {:field :type ...}
  :initial  {:field initial-value ...}
  :manifest memory-binding)
```

#### Parameters

**`:scope`**:
- `:session` — memory lives for the current session; lost when the session ends
- `:task` — memory persists across sessions for the duration of a named task;
  survives session boundaries and editor restarts

**`:schema`** — The structure of what the agent remembers. Making the
schema explicit makes the memory inspectable: a practitioner can query
the agent's memory to understand its current state.

#### Design rationale

Without explicit memory, an agent that runs for multiple turns cannot
accumulate learning across those turns. Each invocation starts cold.
For long tasks — code generation across many files, multi-day analysis
projects, iterative refinement cycles — this is deeply limiting.

With `a/memory`, the agent knows what it has already tried. It knows
which sub-tasks failed and which succeeded. It knows what it was uncertain
about and what it resolved. This accumulated operational knowledge is what
enables an agent to tackle genuinely complex tasks without cycling through
the same failures repeatedly.

#### Example: Code generation agent memory

```clojure
(a/memory typescript-agent-state
  :for     :typescript-agent
  :scope   :task
  :schema  {
    :generated-files    [:array :string]
    :failed-attempts    [:array {:file :string :approach :string :error :string}]
    :resolved-ambiguities [:array {:question :string :resolution :string}]
    :pending-sub-tasks  [:array :string]
    :quality-score      :number}
  :initial {
    :generated-files    []
    :failed-attempts    []
    :resolved-ambiguities []
    :pending-sub-tasks  []
    :quality-score      nil})
```

---

### `a/equip`

Grants an agent access to tools and external capabilities — MCP servers, APIs,
the file system, shell, network — with explicit permission scoping that bounds
what the agent may reach and what it may do with that reach. Where `a/define`
declares what an agent *is* and `:knows` declares what it *applies*, `a/equip`
declares what it can *touch*.

#### Signature

```clojure
(a/equip agent-name-or-binding
  :tools        [{:tool :tool-name | mcp-server
                  :access :read | :read-write | :execute
                  :scope  scope-restriction}
                 ...]
  :permissions  {:filesystem {:paths [glob ...] :mode :read | :read-write}
                 :network    {:allow [host ...] :deny [host ...]}
                 :shell      :none | :sandboxed | :unrestricted
                 :secrets    [:named-secret ...]}
  :approval     {:require-for [:tool-name | :action ...]
                 :approver    :practitioner | :agent-name}
  :audit        :all-tool-calls | :writes-only | :none
  :on-violation :halt | :deny-and-continue | :escalate
  :manifest     equipped-agent)
```

#### Parameters

**`:tools`** — The tools and capabilities the agent may use, each with an
`:access` level (`:read`, `:read-write`, `:execute`) and an optional `:scope`
narrowing what within that tool is reachable. A tool the agent is not equipped
with is a tool it cannot call — capability is allow-listed, never assumed. This
is where MCP servers (the project's IDE-deployment targets — Copilot,
Antigravity, Claude-in-IDE) are wired to an agent.

**`:permissions`** — The resource boundaries beneath the tools: which file paths
the agent may read or write, which network hosts it may reach, whether it may
run shell commands (and if so, sandboxed or not), and which named secrets it may
access. These are coarser than `:tools` and apply across all of them — an agent
equipped with a file-writing tool still cannot write outside its
`:filesystem :paths`.

**`:approval`** — Actions that require human (or supervising-agent) sign-off
before execution, even when the agent is otherwise equipped for them. The
natural home for "the agent may read anything but a write to production config
needs my approval" — permission to *attempt* an action and permission to
*complete* it are separated.

**`:audit`** — What tool use is recorded. `:all-tool-calls` logs every
invocation with its arguments and result; `:writes-only` logs the mutating
ones; for consequential agents, the audit record is the evidence of what the
agent actually touched.

**`:on-violation`** — What happens when the agent attempts something outside its
equipment: `:halt` (stop the agent), `:deny-and-continue` (refuse the single
action, let the agent proceed and adapt), or `:escalate` (surface to the
approver for a decision). `:deny-and-continue` is often best — it lets the agent
discover a boundary and route around it rather than failing wholesale.

#### Design rationale

`a/equip` exists because an agent that can *act* must have its means of acting
made explicit, and the grimoire's whole trust model depends on those means being
bounded. The philosophy's "explicit constraints" principle covers what an agent
must not *produce*; `a/equip` is its necessary complement, covering what an agent
may not *reach*. A `:constraint` that says "never modify production data" is
aspirational if the agent holds an unscoped database tool; the constraint becomes
real only when the equipment cannot reach production in the first place. Behaviour
constraints and access constraints are two halves of the same boundary, and an
agent grimoire with only the first is missing the half that the deployment
environment actually enforces.

The separation of `a/equip` from `a/define` is deliberate and load-bearing. An
agent's *identity* (what it specialises in, what it knows, what it will not
produce) is stable and portable — the security-reviewer is the same security-
reviewer everywhere. Its *equipment* is environmental and varies by deployment:
the same agent definition may run with read-only access in a review context and
read-write access in an implementation context, against different MCP servers in
different IDEs. Keeping equipment a separate construct lets one definition be
equipped differently per context without forking the agent — and makes the
access grant auditable on its own, which is exactly what a security review of an
autonomous system needs to inspect.

The design treats **least privilege as the default posture**, which is why
everything is allow-listed rather than deny-listed. An agent is equipped with
the specific tools and paths it needs, not with everything-except-the-forbidden.
This matters most precisely where agents are most useful and most dangerous — in
the agentic IDEs this grimoire targets, where an over-equipped coding agent can
delete a repository, leak a secret, or push to production. `:approval` and
`:on-violation` then handle the boundary cases: the action the agent may attempt
but not complete unsupervised, and what happens when it reaches past its grant.
Together they make autonomous tool use *governed* rather than merely *possible*.

#### Example 1: A code-implementation agent equipped for an IDE

```clojure
(a/equip typescript-agent
  :tools [
    {:tool :filesystem-mcp   :access :read-write :scope {:within "src/"}}
    {:tool :git-mcp          :access :execute     :scope {:commands [:status :diff :add :commit]}}
    {:tool :typescript-lsp   :access :read}
    {:tool :test-runner-mcp  :access :execute}]
  :permissions {
    :filesystem {:paths ["src/**" "test/**" "package.json"] :mode :read-write}
    :network    {:deny ["*"]}              ;; an implementation agent needs no network
    :shell      :sandboxed
    :secrets    []}                        ;; no secret access — it writes code, not config
  :approval {:require-for [:git-push :package-install]
             :approver    :practitioner}
  :audit    :writes-only
  :on-violation :deny-and-continue
  :manifest equipped-typescript-agent)

;; ✓ The agent can read and write under src/ and test/, run tests, and stage and
;;   commit — but cannot push (requires approval), cannot reach the network at
;;   all, and holds no secrets. The :constraint "never modify production data" is
;;   now backed by equipment that literally cannot reach production.
;; ✓ :on-violation :deny-and-continue means if the agent tries to write outside
;;   src/, that single write is refused and the agent adapts — it does not crash
;;   the whole delegation over one out-of-scope attempt.
;; ✓ Least privilege by construction: network is denied, secrets are empty, shell
;;   is sandboxed. The agent is equipped with exactly what implementing code needs.
```

#### Example 2: A read-only review agent

```clojure
(a/equip security-reviewer
  :tools [
    {:tool :filesystem-mcp :access :read :scope {:within "src/"}}
    {:tool :git-mcp        :access :read :scope {:commands [:log :diff :blame]}}
    {:tool :sast-scanner   :access :execute}]
  :permissions {
    :filesystem {:paths ["src/**" "**/*.config.*"] :mode :read}
    :network    {:allow ["cve.circl.lu" "nvd.nist.gov"]}   ;; vulnerability databases only
    :shell      :none
    :secrets    []}
  :audit    :all-tool-calls
  :on-violation :halt
  :manifest equipped-security-reviewer)

;; ✓ A reviewer reads; it does not write. :mode :read across the board means the
;;   agent physically cannot alter what it audits — the equipment matches the role.
;; ✓ :on-violation :halt (stricter than Example 1) suits a security context: an
;;   audit agent attempting something out of scope is itself a signal worth
;;   stopping on, not routing around.
;; ✓ Narrow :network allow-list lets it consult vulnerability databases without
;;   opening general internet access — equipped for its job, nothing more.
```

#### Usage patterns

```clojure
;; Equip the same definition differently per context — review vs implementation
(a/equip code-agent :tools [{:tool :filesystem-mcp :access :read}]  ;; review context
  :permissions {:filesystem {:paths ["src/**"] :mode :read}})

;; Equipment composes with delegation: the agent acts within its grant
(~> (a/equip typescript-agent :tools [...] :permissions {...} :approval {...})
  (a/delegate :goal "Implement the API" :within {:max-turns 20} :approve :major-decisions))
;; The :approve gate on delegation governs decisions; the :approval gate on
;; equipment governs specific tool actions. They are different checkpoints:
;; one asks "is this the right approach?", the other "may you touch this?".
```

---

## Part II: Invocation and delegation

### `a/invoke`

Directs an agent to perform a specific, well-defined task with a specified
input and expected output. The agent equivalent of a function call — the
practitioner knows what the agent should do and is directing it precisely.

#### Signature

```clojure
(a/invoke agent-name-or-binding
  :task      "specific task description"
  :with      context-or-data
  :given     {:additional-constraint value ...}
  :produce   :artefact-type | [:artefact-types ...]
  :explain   boolean
  :timeout   duration-ms
  :manifest  result-binding)
```

#### Parameters

**`:task`** — A specific, directed task description. Not a goal (that is
`:delegate`), but a precise ask. "Review this function for security
vulnerabilities" is an invocation task. "Make this codebase secure" is a
delegation goal.

**`:given`** — Additional constraints or context that apply only to this
invocation, supplementing but not replacing the agent's definition.

**`:explain`** — When true, the agent narrates its reasoning alongside
the result. Overrides the agent's `:style :reasoning` setting for this
invocation.

#### Design rationale

The distinction between `a/invoke` and `a/delegate` is the distinction
between directed and autonomous work. `a/invoke` is appropriate when the
practitioner knows exactly what they want and is directing the agent to
produce it. The agent applies its specialization and constraints but does
not exercise strategic judgment about approach.

`a/delegate` is appropriate when the practitioner knows the desired outcome
but trusts the agent to determine the path. Use `a/invoke` for specific
tasks; use `a/delegate` for goals.

#### Example 1: Code review invocation

```clojure
(a/invoke security-reviewer
  :task    "Review the payment processing module for security vulnerabilities"
  :with    (read-file "src/payments/processor.ts")
  :given   {:context "This module handles Stripe webhook events and updates
                      subscription state. PCI scope is limited to tokenised
                      card references only."}
  :produce :security-report
  :explain true
  :manifest payment-review)
```

#### Example 2: Type generation invocation

```clojure
(a/invoke typescript-agent
  :task    "Generate Zod schemas and TypeScript types for all entities
            in the subscription domain model"
  :with    subscription-domain-model
  :produce [:zod-schemas :typescript-types]
  :manifest domain-types)
```

#### Example 3: Documentation invocation

```clojure
(a/invoke documentation-agent
  :task    "Write JSDoc comments for all exported functions in the
            billing module"
  :with    (read-files "src/billing/**/*.ts")
  :given   {:audience    :external-developers
            :style       :terse-but-complete
            :include     [:params :returns :throws :example]}
  :produce :annotated-source
  :manifest documented-billing)
```

---

### `a/delegate`

Assigns a goal to an agent with autonomy to determine and execute the
approach. The agent acts, observes the results of its actions, revises
its strategy, and reports back — not just with the output but with the
path it took to produce it.

#### Signature

```clojure
(a/delegate agent-name-or-binding
  :goal      "outcome to achieve"
  :context   context-data
  :within    {:max-turns   n
              :constraints ["additional constraint for this delegation"]
              :must-report [:decision :attempt :uncertainty :completion]}
  :memory    memory-binding
  :approve   :each-step | :major-decisions | :on-completion | :never
  :manifest  delegation-result)
```

#### Parameters

**`:goal`** — The desired outcome, stated as an outcome rather than a
procedure. "Implement a subscription billing API that satisfies the domain
model" is a goal. "Write these three endpoints in this order using these
patterns" is an instruction — use `a/invoke` for that.

**`:within`**:
- `:max-turns` — the maximum number of autonomous reasoning steps the
  agent may take. Acts as a budget; prevents runaway delegation.
- `:constraints` — delegation-specific constraints supplementing the
  agent's definition.
- `:must-report` — which events the agent must surface during delegation.
  `:decision` reports every significant choice. `:attempt` reports each
  approach tried. `:uncertainty` reports when the agent is not confident.
  `:completion` reports only when done.

**`:approve`** — When human approval is required:
- `:each-step` — the practitioner approves before each agent action.
  Maximum control; minimum autonomy.
- `:major-decisions` — the agent identifies decisions with significant
  consequences and pauses for approval on those.
- `:on-completion` — the practitioner reviews the complete result before
  it is accepted. Standard for trusted agents on well-understood tasks.
- `:never` — fully autonomous; appropriate only for well-constrained,
  reversible tasks.

#### Design rationale

`a/delegate` is the primary mechanism for autonomous agent work. The
`:max-turns` budget is critical: it prevents the failure mode where an
agent pursues an increasingly complex approach to a misunderstood goal.
The budget forces either completion or a report of progress-and-blockage
within a known horizon.

The `:must-report` parameter operationalises earned autonomy: a new agent
type or a novel task warrants `:must-report [:decision :attempt]` — the
practitioner sees every significant move. A well-understood agent on a
routine task warrants `:must-report [:completion]`. Trust is extended
through demonstrated reliability, not assumed.

#### Example 1: API implementation delegation

```clojure
(a/delegate typescript-agent
  :goal    "Implement the complete subscription management REST API as
            specified by the subscription domain model and api target.
            The API must be production-ready: full validation, error
            handling, and unit tests for all endpoints."
  :context {:domain-model  subscription-domain-model
            :target        api-target
            :asset         team-coding-standard}
  :within  {:max-turns    20
            :constraints  ["Each endpoint must have at least 3 unit tests"
                           "All error responses must conform to RFC 7807"]
            :must-report  [:decision :uncertainty :completion]}
  :memory  typescript-agent-state
  :approve :major-decisions
  :manifest api-implementation)

;; The agent:
;; 1. Plans its implementation order based on domain model dependencies
;; 2. Implements each endpoint, reporting decisions about edge case handling
;; 3. Pauses for approval when it encounters an ambiguous requirement
;; 4. Generates tests alongside each endpoint
;; 5. Reports completion with a summary of what was built and what was deferred
```

#### Example 2: Research and analysis delegation

```clojure
(a/delegate domain-analyst-agent
  :goal    "Produce a comprehensive understanding of GDPR Article 17
            (right to erasure) as it applies to a multi-tenant SaaS
            platform with shared database tenancy. Surface every
            implementation consideration."
  :context {:platform-model  saas-domain-model
            :tenancy-model   :shared-schema-with-discriminator}
  :within  {:max-turns   8
            :must-report [:decision :uncertainty]}
  :approve :on-completion
  :manifest erasure-analysis)
```

#### Example 3: Exploratory refactoring

```clojure
(a/delegate typescript-agent
  :goal    "Identify and eliminate the three most significant sources of
            technical debt in the billing module. For each, explain why
            it is debt, propose a refactoring, and estimate the risk."
  :context {:source-files (read-files "src/billing/**/*.ts")}
  :within  {:max-turns   12
            :must-report [:decision]}
  :approve :each-step   ;; This is exploratory — practitioner stays close
  :manifest refactoring-plan)
```

---

## Part III: Multi-agent coordination

### `a/compose`

Assembles a pipeline of agents where each agent's output becomes the next
agent's input. Enables the systematic application of multiple specialised
perspectives to the same artefact, accumulating quality through sequential
transformation.

#### Signature

```clojure
(a/compose name
  :agents   [{:agent    agent-name-or-binding
              :role     "what this agent contributes to the pipeline"
              :task     task-description-or-invocation
              :produces :binding-name} ...]
  :strategy :sequential | :parallel | :parallel-then-merge
  :synthesise {:agent :synthesis-agent :goal "how to combine outputs"}
  :on-agent-failure :stop | :skip | :compensate
  :manifest result-binding)
```

#### Parameters

**`:strategy`**:
- `:sequential` — each agent's output is the next agent's input; output
  builds through the pipeline
- `:parallel` — all agents receive the same input and work simultaneously;
  outputs are independent
- `:parallel-then-merge` — agents work in parallel; a synthesis step then
  combines their outputs into a unified result

**`:synthesise`** — When `:parallel-then-merge` is the strategy, this
specifies how to combine the parallel outputs. A synthesis agent reads
all outputs and produces a unified artefact that honours all perspectives.

**`:on-agent-failure`**:
- `:stop` — halt the pipeline if any agent fails
- `:skip` — continue with remaining agents; note the failure in the result
- `:compensate` — invoke compensation for completed stages before stopping

#### Design rationale

The value of `a/compose` lies in its systematic application of diverse
perspectives. A single expert produces a single perspective's output.
A composed pipeline produces something shaped by multiple perspectives —
and the ordering of agents in a sequential pipeline is itself a design
decision about how quality accumulates.

A sequential pipeline of domain-analyst → code-generator → security-reviewer
produces different results than domain-analyst → security-reviewer → code-generator.
In the first, the security reviewer critiques finished code. In the second,
security requirements inform the code before it is written. The ordering
matters and should be deliberate.

#### Example 1: Sequential quality pipeline

```clojure
(a/compose subscription-api-pipeline
  :agents [
    {:agent    domain-analyst-agent
     :role     "Validate that the domain model is complete and consistent"
     :task     "Review the subscription domain model for gaps and ambiguities"
     :produces :validated-domain}

    {:agent    typescript-agent
     :role     "Implement the validated domain as TypeScript"
     :task     "Generate the complete API implementation from the domain model"
     :produces :api-implementation}

    {:agent    security-reviewer
     :role     "Audit the implementation for security issues"
     :task     "Review the generated API for OWASP Top 10 vulnerabilities"
     :produces :security-report}

    {:agent    documentation-agent
     :role     "Document the secure implementation"
     :task     "Generate API documentation for external developers"
     :produces :api-documentation}]

  :strategy :sequential
  :on-agent-failure :stop
  :manifest pipeline-result)
```

#### Example 2: Parallel multi-perspective review

```clojure
(a/compose architecture-review
  :agents [
    {:agent    security-reviewer
     :role     "Security perspective"
     :task     "Identify security risks and threat vectors"
     :produces :security-findings}

    {:agent    performance-analyst-agent
     :role     "Performance perspective"
     :task     "Identify bottlenecks and scalability concerns"
     :produces :performance-findings}

    {:agent    accessibility-reviewer-agent
     :role     "Accessibility perspective"
     :task     "Identify barriers for users with disabilities"
     :produces :accessibility-findings}

    {:agent    maintainability-agent
     :role     "Long-term maintenance perspective"
     :task     "Identify technical debt and complexity hotspots"
     :produces :maintainability-findings}]

  :strategy :parallel-then-merge
  :synthesise {
    :agent :synthesis-agent
    :goal  "Produce a unified architecture review that prioritises findings
            across all four perspectives, identifies where perspectives
            agree, and flags where they are in tension"}

  :on-agent-failure :skip
  :manifest comprehensive-review)
```

---

### `a/supervise`

Coordinates a team of agents under a supervising agent that maintains the
overall view, assigns sub-tasks, monitors progress, resolves conflicts between
agents, and synthesises their outputs into a coherent whole.

Where `a/compose` is a pipeline with a predetermined structure, `a/supervise`
allows the supervisor to dynamically assign work, redirect agents, and
decide when the team's output is complete.

#### Signature

```clojure
(a/supervise supervisor-agent
  :team      [:agent-name ...]
  :goal      "what the team should produce as a whole"
  :context   context-data
  :strategy  :divide-and-conquer | :debate | :peer-review | :iterative-refinement
  :budget    {:max-total-turns n :max-rounds n}
  :approve   :on-completion | :after-each-round | :never
  :manifest  supervision-result)
```

#### Parameters

**`:strategy`**:
- `:divide-and-conquer` — the supervisor breaks the goal into sub-tasks
  and assigns one or more to each agent; synthesises the results
- `:debate` — agents are presented with the same problem and produce
  competing solutions; the supervisor adjudicates
- `:peer-review` — one agent produces a primary output; others critique it;
  the original agent revises; the supervisor determines when the result
  is acceptable
- `:iterative-refinement` — agents work in rounds; each round's output
  is input to the next round's critique; the supervisor stops when
  quality meets threshold

**`:budget`** — Total turn limits across the team and maximum number of
coordination rounds. Essential for preventing runaway supervision cycles.

#### Design rationale

`a/supervise` exists for the coordination problem `a/compose` cannot solve: when
the division of work is not knowable in advance. A composed pipeline fixes the
agents and their order at definition time — appropriate when the practitioner
knows the sequence of perspectives to apply. But many goals cannot be
pre-decomposed: the supervisor must *see the whole*, break it into sub-tasks as
the shape of the problem emerges, assign them to the right specialists,
notice when two agents' outputs conflict, and decide when the result is
coherent enough to stop. That dynamic judgment is the supervisor's job, and it
is why `a/supervise` takes a supervising *agent* rather than a fixed structure.

The `:strategy` choices encode genuinely different team dynamics, not cosmetic
variations. `:divide-and-conquer` suits decomposable goals where specialists
work largely independently; `:debate` suits questions with competing valid
answers where the supervisor must adjudicate; `:peer-review` suits work where
one agent produces and others harden it; `:iterative-refinement` suits quality
that accrues over rounds. Matching strategy to the goal's structure is the
practitioner's key decision, which is why the strategies are named and distinct
rather than left to the supervisor to improvise.

`:budget` is load-bearing for the same reason `:max-turns` is on `a/delegate`,
but more so: a team of agents coordinating in rounds can burn turns
combinatorially, each agent reacting to every other. Without a `:max-total-turns`
and `:max-rounds` ceiling, a supervision cycle can spiral — agents refining
each other's work past the point of diminishing returns, or a debate that never
converges. The budget forces the supervisor to either reach a coherent result
or report where the team stalled, within a known horizon.

#### Example 1: Divide-and-conquer implementation

```clojure
(a/supervise architect-agent
  :team   [:typescript-agent :database-agent :test-agent]
  :goal   "Implement the complete subscription billing platform —
           API, database schema, and test suite — as a cohesive system
           where every layer is consistent with the others"
  :context {:domain-model  subscription-domain-model
             :targets       [api-target database-target test-target]
             :assets        [team-coding-standard]}
  :strategy :divide-and-conquer
  :budget  {:max-total-turns 60 :max-rounds 3}
  :approve :after-each-round
  :manifest platform-implementation)

;; The architect-agent:
;; 1. Assigns the database schema to :database-agent
;; 2. Assigns the API implementation to :typescript-agent (after schema is complete)
;; 3. Assigns test generation to :test-agent (alongside or after API)
;; 4. Reviews integration consistency between layers
;; 5. Requests revisions from specific agents when inconsistencies are found
;; 6. Reports to practitioner after each round for approval before continuing
```

#### Example 2: Peer review strategy

```clojure
(a/supervise senior-review-agent
  :team     [:typescript-agent :security-reviewer]
  :goal     "Produce a payment processing implementation that is both
             functionally complete and security-hardened"
  :context  {:domain-model  payment-domain-model
             :target        payment-api-target}
  :strategy :peer-review
  :budget   {:max-total-turns 30 :max-rounds 3}
  :approve  :on-completion
  :manifest payment-implementation)

;; Round 1: :typescript-agent produces initial implementation
;; Round 2: :security-reviewer critiques it; identifies three issues
;; Round 3: :typescript-agent revises in response to the critique
;; supervisor: determines revised output meets quality threshold; stops
```

---

### `a/negotiate`

Structures a dialogue between two or more agents to arrive at a shared
position on a contested or complex question. Not debate (where agents
argue against each other) but negotiation — where agents work *toward*
a position that each can genuinely endorse.

#### Signature

```clojure
(a/negotiate topic
  :agents      [:agent-a :agent-b ...]
  :context     context-data
  :rounds      n
  :converge-on :consensus | :synthesis | :recommendation-with-dissents
  :facilitated-by :agent-name
  :manifest    negotiation-result)
```

#### Parameters

**`:converge-on`**:
- `:consensus` — all agents must endorse the final position; dissent
  is not acceptable as an outcome
- `:synthesis` — a unified position that incorporates elements from all
  agents' positions, acknowledging trade-offs
- `:recommendation-with-dissents` — a primary recommendation, with
  minority positions documented alongside it and their reasoning preserved

**`:facilitated-by`** — An optional agent that manages the negotiation
process: keeps the conversation on topic, summarises positions, identifies
convergences, and determines when further rounds would not be productive.

#### Design rationale

Some design questions have no single correct answer — only trade-offs that
different frameworks evaluate differently. API versioning strategy. Database
sharding approach. Eventual versus strong consistency. Microservices versus
modules. These are questions where a single agent producing a recommendation
is less reliable than two or three specialist agents working toward a shared
position.

`a/negotiate` externalises this process: the different positions are
made visible, the arguments are recorded, and the convergence (or
principled disagreement) is documented. The result is not just a decision
but the reasoning behind it — inspectable, revisable, and honest about
where genuine disagreements persist.

#### Example: Data model design negotiation

```clojure
(a/negotiate "How should subscription plan changes be represented in the data model?"
  :agents  [:domain-analyst-agent :database-agent :typescript-agent]
  :context {:domain-model     subscription-domain-model
            :current-approach "Single subscription record with plan_id foreign key"}
  :rounds  3
  :converge-on :recommendation-with-dissents
  :facilitated-by :architect-agent)

;; Returns:
{:topic    "Subscription plan change data model"
 :recommendation
   "Use an immutable subscription-version table: each plan change creates
    a new version record with effective_from timestamp. The current version
    is always the latest. This approach preserves full history without
    requiring a separate event log."
 :consensus-reached true
 :rationale
   "Domain analyst: supports billing history queries without joins.
    Database agent: append-only pattern suits PostgreSQL; index on
    subscription_id + effective_from is efficient.
    TypeScript agent: maps cleanly to Result type without nullable fields."
 :dissents []
 :alternatives-considered [
   {:approach  "Mutation log / event sourcing"
    :rejected  "Overhead not justified at current scale; adds complexity
                to simple queries"}
   {:approach  "JSONB history column on subscription"
    :rejected  "Sacrifices queryability for storage convenience"}]}
```

---

## Part IV: Quality and reflection

### `a/evaluate`

Assesses an agent's output against explicit quality criteria, producing a
structured evaluation that identifies strengths, weaknesses, and specific
improvements.

#### Signature

```clojure
(a/evaluate output
  :against   [:criterion ...]
  :using     :agent-name | evaluation-rubric
  :dimension [:correctness :completeness :style :security
              :performance :maintainability :accessibility ...]
  :produce   :score | :pass-fail | :detailed-assessment | :improvement-plan
  :improve   boolean
  :manifest  evaluation-result)
```

#### Parameters

**`:against`** — Explicit criteria the output is evaluated against. These
should be specific and testable: "All exported functions have JSDoc comments"
is evaluable. "Code is readable" is not.

**`:improve`** — When true, the evaluation produces not just a verdict
but a revised version of the input that addresses the identified weaknesses.
The revised version is available alongside the evaluation report.

#### Design rationale

`a/evaluate` operationalises the grimoire's "evaluate before accepting"
discipline by making quality assessment *explicit and criterion-based* rather
than impressionistic. The temptation with agent output is to accept it because
it looks plausible — agents produce fluent, confident artefacts, and fluency
reads as quality. `a/evaluate` interrupts that reflex by forcing the question
"good *against what*?" The `:against` criteria must be specific and testable,
which does double work: it makes the evaluation auditable, and it forces the
practitioner to articulate the standard — a step that frequently reveals the
implicit bar was lower than it should have been.

The decisive design choice is that **every criterion receives an explicit
verdict** — pass, fail, or partial — rather than an aggregate impression. An
overall score of 0.82 hides which 18% failed; a per-criterion breakdown says
exactly what is missing and how much it matters. This is what makes the
evaluation actionable: a `:fail` on "all endpoints have tests" with the specific
endpoint named is a work item, where "generally good test coverage" is not.

`:improve` exists because the gap between finding a problem and fixing it is
often small once the problem is precisely located — and an evaluator that has
identified exactly what fails is well-positioned to fix exactly that. Pairing
the verdict with a revised artefact closes the loop in one step, while keeping
the evaluation report alongside so the practitioner sees both what was wrong and
what changed. The boundary with `a/reflect` is deliberate: `a/evaluate` applies
an *external* standard (the practitioner's criteria), where `a/reflect` applies
the agent's *own* deeper judgment to its work. External audit and self-audit are
different acts, and a robust quality process uses both.

#### Example

```clojure
(a/evaluate api-implementation
  :against   [
    "All endpoints have corresponding unit tests"
    "No TypeScript any types"
    "All error responses conform to RFC 7807"
    "Rate limiting is applied to all authenticated endpoints"
    "No secrets or credentials appear in source code"]
  :using     :quality-reviewer-agent
  :dimension [:correctness :security :completeness]
  :produce   :improvement-plan
  :improve   true
  :manifest  evaluation-result)

;; Returns:
{:score        0.82
 :pass         true
 :findings [
   {:criterion  "All endpoints have corresponding unit tests"
    :verdict    :fail
    :detail     "DELETE /subscriptions/:id has no unit tests"
    :severity   :high}
   {:criterion  "No TypeScript any types"
    :verdict    :pass}
   {:criterion  "Rate limiting applied to all authenticated endpoints"
    :verdict    :partial
    :detail     "Rate limiting present on POST endpoints; missing on GET /subscriptions"}]
 :improved-output api-implementation-v2  ;; :improve true
 :improvements-applied [
   "Added 4 unit tests for DELETE /subscriptions/:id"
   "Added rate limiting middleware to GET /subscriptions"]}
```

---

### `a/reflect`

An agent examines its own output — the reasoning that produced it,
the alternatives it did not pursue, the assumptions it made, and the
ways the output might be improved or might fail in production.

Self-reflection is the mechanism by which an agent's output improves
without external critique. Where `a/evaluate` applies an external
standard, `a/reflect` applies the agent's own deeper judgment to its
initial work.

#### Signature

```clojure
(a/reflect output
  :questions ["question to examine" ...]
  :from      :agent-name
  :depth     :surface | :thorough
  :produce   :reflection-report | :improved-output | :both
  :manifest  reflection-result)
```

#### Parameters

**`:questions`** — Specific dimensions to examine. Generic reflection
produces generic insights. Specific questions produce specific ones:
"What assumptions did I make about the data schema that might not hold?"
produces more actionable output than "How could this be better?"

**`:depth`**:
- `:surface` — the agent examines obvious alternatives and immediate
  improvements. Fast; suitable for routine quality checks.
- `:thorough` — the agent examines assumptions, edge cases, failure modes,
  and alternatives it deliberately set aside. Slower; appropriate before
  handing off to downstream agents or practitioners.

#### Design rationale

`a/reflect` exists because an agent's first output is shaped by the framing of
the task, and that framing carries unexamined assumptions the output silently
inherits. The agent that modelled a subscription as belonging to one customer
did not decide that shared subscriptions are impossible — it simply was not
asked, and the assumption rode along invisibly. Reflection turns the agent's
attention back on its own work specifically to surface what it took for granted:
the assumptions not in the input, the alternatives not pursued, the edge cases
treated as obvious. This is improvement without external critique — the agent's
own deeper judgment applied to its initial, faster judgment.

The discipline the construct enforces is that **specific questions produce
specific reflection**. Generic self-review ("how could this be better?") yields
generic platitudes, because the agent has no purchase on what to examine.
Pointed questions ("what assumptions about the data schema might not hold?")
give reflection a target and produce actionable findings. This is why
`:questions` is first-class and the examples model sharp, particular questions
rather than open-ended ones — the quality of the reflection is bounded by the
quality of the questions.

The `:depth` gradient matches reflection cost to stakes. `:surface` catches the
obvious — a few unpursued alternatives, the assumptions visibly added, the most
likely failure — and suits routine checks. `:thorough` is the pre-handoff
discipline: before work passes to a downstream agent or a practitioner who lacks
the context to question its foundations, every assumption and set-aside
alternative should be surfaced, because the cost of an unexamined assumption
compounds once others build on it. Reflecting thoroughly before handover is
cheaper than discovering, downstream, that the work rested on contested ground —
which is exactly why the grimoire's best practices pair `a/reflect` with
`handover`.

#### Example

```clojure
(a/reflect domain-analysis-output
  :questions [
    "What assumptions did I make about entity relationships that the
     requirements do not explicitly support?"
    "Which entities did I group together that might warrant separation
     at scale?"
    "What edge cases in the business rules did I treat as obvious
     that might actually be contested?"
    "What would need to change if the multi-tenancy model shifted from
     shared schema to separate database per tenant?"]
  :from   domain-analyst-agent
  :depth  :thorough
  :produce :both
  :manifest domain-reflection)

;; Returns:
{:reflection {
   :assumptions-made [
     "Subscription is always associated with exactly one customer.
      The requirements do not address shared subscriptions or B2B2C models."
     "Currency is fixed per subscription. The requirements mention multi-currency
      as a future consideration but I modelled it as locked at subscription creation."]
   :structural-choices [
     "PlanVersion and Plan are separate entities. This was a contested choice.
      If plan history is not required, a simpler mutable Plan is sufficient."]
   :edge-cases-requiring-clarification [
     "Subscription pause: the domain model allows pause but does not specify
      whether billing continues or suspends during a pause."]}
 :improved-output domain-analysis-v2}
```

---

## Best practices

### Choose the right invocation pattern

The practitioner's mental model for choosing:

| Situation | Pattern |
|---|---|
| Specific task, known approach, expected output | `a/invoke` |
| Goal known, path not specified | `a/delegate` |
| Multiple sequential specialists needed | `a/compose :sequential` |
| Multiple parallel perspectives needed | `a/compose :parallel-then-merge` |
| Complex goal requiring dynamic task assignment | `a/supervise` |
| Contested design decision | `a/negotiate` |
| Output quality verification | `a/evaluate` |
| Agent examines its own assumptions | `a/reflect` |

### Budget delegation generously but not infinitely

A `:max-turns` budget that is too low forces the agent to cut corners or
fail on complex tasks. A budget with no ceiling is an invitation to runaway
reasoning. Start with a generous budget for new agents and tasks; calibrate
it downward as reliability is established.

### Require explicit reporting early; relax it as trust is earned

New agent definitions and novel task types should use
`:must-report [:decision :attempt :uncertainty]`. This is expensive in
tokens and time but inexpensive in errors — the practitioner can catch
misunderstandings before they compound. As an agent demonstrates reliable
behaviour on a task type, reduce the reporting requirement.

### Reflect before handover

Before issuing a `handover` to a specialist agent, apply `a/reflect` to the
context being handed over. The reflection may surface assumptions that the
receiving agent will not have the context to question. Better to surface them
now than to discover the handover was built on contested foundations.

### Evaluate before accepting

Never accept an agent's output as final without evaluation. Even a simple
`a/evaluate :produce :pass-fail :against [explicit-criteria]` is better
than implicit acceptance. The criteria force the practitioner to articulate
what "good" means — and often reveal that the implicit standard was less
demanding than it should have been.

### Define agents before invoking them

An agent invoked without a definition is a prompt. An agent invoked with
a definition is a capability declaration with explicit constraints, known
specializations, and inspectable behaviour. The definition is what makes
the agent auditable and extensible.

### Anti-patterns

**Delegating a task that should have been invoked.** Using `a/delegate` for a
task with a known, specifiable approach wastes autonomy on a problem that does
not need it — the agent burns turns deciding what to do when the practitioner
already knew. Worse, it introduces judgment (and its attendant variability)
where determinism was available. If you could write the steps, use `a/invoke`
or a workflow; reserve `a/delegate` for goals whose path is genuinely
undetermined.

**Equipping an agent for more than its task requires.** Granting an
implementation agent network access it does not need, or write access beyond
the directory it works in, widens the blast radius of any mistake or
misdirection for no benefit. Equip for the specific task — least privilege is
the default posture, and an over-equipped agent in an IDE can do real damage
(delete a repository, leak a secret, push to production) that a scoped one
simply cannot reach.

**Granting autonomy without reporting, then trusting the output.** Running
`a/delegate :approve :never :must-report [:completion]` on a new agent or a
novel task is how an agent produces confident, fluent output in the wrong
direction that no one catches until late. Earn autonomy: start new agents and
tasks with `:must-report [:decision :attempt :uncertainty]` and tighten the
leash, relaxing only as reliability is demonstrated.

**Accepting agent output without evaluation.** Fluent, confident output reads as
correct, and agents are fluent and confident by default. Skipping `a/evaluate`
because the result looks finished is how unmet requirements ship. Always
evaluate against explicit, testable criteria — the act of stating the criteria
often reveals the implicit bar was too low.

**Coordinating agents that should be workflow steps (or vice versa).** Wrapping
deterministic operations in `a/compose`/`a/supervise` pays the cost of agent
judgment — variability, turns, reporting — for steps that needed none.
Conversely, forcing judgment-laden work into `o/define-workflow` produces
brittle specifications that break on every edge case they were not designed for.
Coordinate by the nature of the unit: judgment → agents, determined steps →
workflow.

---

## Integration patterns

### Agent as the consumer of handover

The canonical flow from `core`'s `handover` to the `agent` grimoire:

```clojure
;; In the Conjurer session: package context and declare intent
(handover :to :typescript-agent
  :from     current-session
  :scope    [:api]
  :include  [:charter :domain-model :target-specs :assets])

;; In the receiving agent session: the agent picks up and acts
(a/delegate typescript-agent
  :goal    "Implement the API as specified in the handover package"
  :context handover-package
  :within  {:max-turns 20 :must-report [:decision :completion]}
  :approve :on-completion)
```

The `handover` packages the context; `a/delegate` directs the action.
These are complementary constructs, not alternatives.

### Equip between definition and delegation

A handed-off agent must be equipped for its deployment before it acts. The full
flow is define → equip → delegate: the definition is portable, the equipment is
granted per environment, the delegation directs the work within both.

```clojure
;; The agent definition is portable; equipment is granted for this deployment
(a/equip typescript-agent
  :tools       [{:tool :filesystem-mcp :access :read-write :scope {:within "src/"}}
                {:tool :git-mcp :access :execute :scope {:commands [:status :diff :add :commit]}}]
  :permissions {:filesystem {:paths ["src/**" "test/**"] :mode :read-write}
                :network {:deny ["*"]} :shell :sandboxed}
  :approval    {:require-for [:git-push] :approver :practitioner}
  :manifest    equipped-agent)

;; Now delegate within the bounds the equipment sets
(a/delegate equipped-agent
  :goal    "Implement the API as specified in the handover package"
  :context handover-package
  :within  {:max-turns 20 :must-report [:decision :completion]}
  :approve :on-completion)
;; The agent cannot act outside its equipment regardless of what the goal seems
;; to require — the same way it cannot violate its definition's :constraints.
```

### Compose with witness for auditability

Inserting `witness` into an `a/compose` pipeline produces an audit trail
of each agent's contribution without modifying what the agents produce.

```clojure
(a/compose audited-pipeline
  :agents [
    {:agent :typescript-agent
     :task  "Generate API implementation"
     :produces :api-impl}

    {:agent :security-reviewer
     :task  "Review implementation"
     :produces :security-report}]

  :strategy :sequential
  :manifest pipeline-result)

;; Wrap each stage with witness for full audit trail:
(witness pipeline-result
  :observe  [:decisions :alternatives :confidence-levels]
  :record-to pipeline-audit-log)
```

### Negotiate then decide with reasoning

```clojure
;; Use reasoning grimoire to derive obligations from negotiation outcome
(def data-model-decision
  (a/negotiate "Event sourcing vs direct mutation for billing state"
    :agents    [:domain-analyst-agent :database-agent]
    :rounds    3
    :converge-on :recommendation-with-dissents))

;; Then derive what that decision implies
(r/derive "What does this data model choice imply for the read API?"
  :from  data-model-decision
  :using billing-api-rules
  :mode  :deductive
  :explain true)
```

### Quality loop: generate, evaluate, reflect, improve

```clojure
(~> domain-model
  (a/invoke typescript-agent
    :task    "Generate initial API implementation"
    :produce :typescript-source)

  (a/evaluate
    :against   api-quality-criteria
    :produce   :improvement-plan
    :improve   true)

  (a/reflect
    :questions ["What requirements might not be satisfied by the evaluation criteria?"]
    :depth     :thorough
    :produce   :improved-output)

  (witness :observe [:quality-progression] :record-to quality-log))
```

### Agent team with orchestrate approval gate

```clojure
;; Combine agent supervision with orchestrate's human-approval
(o/define-workflow :agent-assisted-implementation
  :stages [
    {:name      :domain-analysis
     :operation (a/invoke domain-analyst-agent
                  :task "Validate and complete the domain model"
                  :with requirements)}

    {:name      :human-review-of-analysis
     :operation (o/human-approval
                  :reviewers [:domain-expert :product-lead]
                  :data      domain-analysis-output
                  :timeout   (hours 24))}

    {:name      :implementation
     :operation (a/supervise architect-agent
                  :team    [:typescript-agent :database-agent :test-agent]
                  :goal    "Implement the approved domain model"
                  :budget  {:max-total-turns 60})}

    {:name      :final-review
     :operation (a/evaluate implementation-result
                  :using   :quality-reviewer-agent
                  :produce :detailed-assessment)}])
```

---

## Grimoire metadata

```clojure
{:grimoire    "agent"
 :namespace   "a/"
 :version     "1.1.0"
 :description "Autonomous agent definition, equipment and tool access, invocation,
               delegation, multi-agent coordination, and quality assurance patterns"

 :constructs {
   :definition    [a/define a/memory a/equip]
   :invocation    [a/invoke a/delegate]
   :coordination  [a/compose a/supervise a/negotiate]
   :quality       [a/evaluate a/reflect]}

 :best-for [
   "Autonomous implementation from goal specifications"
   "Equipping agents with scoped tool access for IDE deployment (MCP, filesystem, git)"
   "Multi-perspective architecture and code reviews"
   "Sequential quality pipelines (generate → review → secure → document)"
   "Contested design decisions via structured negotiation"
   "Complex implementation tasks requiring dynamic sub-task assignment"
   "Self-improving outputs through structured reflection"
   "Human-in-the-loop agent workflows with approval gates"]

 :works-with [:core :orchestrate :domain :semantics :reasoning :eloquence]

 :key-concepts [
   {:term "Agent"
    :definition "An entity that acts with intention toward a goal, exercising
                 judgment about how to proceed — as opposed to a mechanism that
                 executes a predetermined sequence of steps."}
   {:term "Invocation"
    :definition "A directed, specific task assignment to an agent. The practitioner
                 specifies both the task and the expected output form. The agent
                 applies its specialization but does not exercise strategic judgment
                 about approach."}
   {:term "Delegation"
    :definition "An autonomous task assignment toward a goal. The practitioner
                 specifies the desired outcome; the agent determines and executes
                 the path. The agent may try approaches, observe results, revise,
                 and delegate sub-tasks within its budget."}
   {:term "Epistemic diversity"
    :definition "The application of multiple genuinely different analytical
                 frameworks to the same problem. Multi-agent composition enables
                 this; single-agent reasoning cannot."}
   {:term "Earned autonomy"
    :definition "A trust model where agents receive tighter constraints and
                 more frequent reporting requirements for new task types, and
                 looser constraints and summary reporting as reliability is
                 demonstrated."}
   {:term "Agent memory"
    :definition "Operational state that accumulates across an agent's invocations
                 within a task — what has been tried, what failed, what was learned.
                 Distinct from context (domain knowledge), charter (project history),
                 and assume (operative constraints)."}
   {:term "Agent equipment"
    :definition "The tools and resource access an agent holds — MCP servers, file
                 paths, network, shell, secrets — with permission scoping. Granted
                 per deployment via a/equip and allow-listed by default (least
                 privilege). The access-constraint complement to a definition's
                 behaviour-constraints: what the agent may touch, not just what it
                 may produce."}
   {:term "Supervision"
    :definition "A coordination pattern where one agent maintains the overall view
                 of a goal, dynamically assigns work to specialist agents, monitors
                 progress, and synthesises outputs into a coherent whole."}
   {:term "Negotiation"
    :definition "A structured dialogue between agents to arrive at a shared position
                 on a contested or complex question — working toward agreement rather
                 than debating against each other."}]}
```

---

## Implementation notes for LLM processors

### The orchestrate / agent boundary

When deciding whether a task belongs in `o/define-workflow` or `a/delegate`:
- Known steps, known routing: workflow
- Goal specified, path undetermined: delegation
- The test is: "Could I write a complete workflow specification without
  knowing more?" If yes, write the workflow. If no, delegate.

### Agent definition compliance

When an agent with a definition executes a task, all `:constraints` apply
unconditionally — even when honouring them makes the task harder. If a
constraint and a goal are in genuine tension, surface the tension rather than
silently violating the constraint. "The goal requires exception throwing, but
my constraint prohibits it in business logic. Here are two approaches that
satisfy both:" is the correct response.

### Agent equipment enforcement

When an agent has an `a/equip` grant, treat it as an allow-list, not a hint. The
agent may call only the tools it is equipped with, and only within the `:access`
level and `:scope` granted; a tool not listed is unavailable, not merely
discouraged. Resource `:permissions` bound all equipped tools — an agent with a
file-writing tool still may not write outside its `:filesystem :paths`, and an
attempt to do so triggers `:on-violation`, never a silent out-of-scope write.

Honour `:approval` as a hard gate: an action whose tool or type is in
`:require-for` must pause for the named approver before execution, even when the
agent is otherwise equipped for it — permission to attempt is not permission to
complete. Apply `:on-violation` exactly as specified when the agent reaches past
its grant: `:halt` stops the agent, `:deny-and-continue` refuses the single
action and lets the agent adapt, `:escalate` surfaces to the approver. Record
tool use per `:audit`; for a consequential agent the audit log is the evidence
of what it actually touched, and must be immutable once written. Default to
least privilege when equipment is underspecified — grant the narrowest access
that the task plausibly requires and surface the assumption, rather than
granting broadly.

### The `:max-turns` budget

Every `a/delegate` and `a/supervise` invocation has a `:max-turns` budget.
When the budget is exhausted before completion:
1. Report progress made so far — what was accomplished, what remains
2. Report the blockage — why completion was not reached
3. Report what additional context or budget would allow completion
4. Do not silently truncate or produce an incomplete result without flagging it

### Memory accumulation

When `:memory` is specified and an agent has a `:memory` binding, update
the memory store after each significant action: each file generated, each
approach tried, each ambiguity resolved. Memory is not a summary written
at the end — it is a running accumulation that informs subsequent steps
within the same task.

### Reflection depth calibration

At `:depth :surface`:
- Name the two or three most obvious alternatives not pursued
- Identify any assumptions the output makes that are not in the input
- Flag the one most likely source of downstream problems

At `:depth :thorough`:
- All alternatives considered and the reasoning for each rejection
- All assumptions, including those the agent treated as obvious
- Edge cases that the output does not handle
- Failure modes in production that the output does not account for
- What would need to change if a key constraint were relaxed

### Negotiation facilitation

When facilitating a negotiation:
1. Allow each agent to state its initial position fully before any discussion
2. Identify points of genuine agreement and genuine disagreement explicitly
3. Do not rush to synthesis — premature synthesis suppresses productive tension
4. After each round, summarise what has converged and what remains open
5. Stop when further rounds would not be productive — when positions are stable
   and arguments are repeating

### Evaluation precision

When evaluating output `:against` criteria, every criterion must receive an
explicit verdict: `:pass`, `:fail`, or `:partial`. "The evaluation was generally
positive" is not an evaluation. "Criterion 3 fails because X; criterion 5 is
partial because Y but not Z" is an evaluation.

When `:improve true` is specified, the improved output must address every
`:fail` and `:partial` finding. Selective improvement — fixing some findings
while ignoring others — is not acceptable.