# orchestrate.md — Conjurer Orchestrate Grimoire

The spellbook for coordination. Real systems are not single operations —
they are ecosystems of cooperating processes that must succeed together,
fail together gracefully, and maintain consistency across boundaries that
no single operation controls. The `orchestrate` grimoire provides the
vocabulary for expressing these cooperative structures: workflows that
span services, sagas that maintain consistency across failures, circuits
that prevent cascading collapse, and observability that makes complex
execution visible.

---

## Philosophy

### Coordination as a first-class problem

Most programming abstractions address *computation within a service*. The
hard problems in modern systems are *between* services: how do we ensure
that a payment and an inventory update happen together or not at all? How
do we prevent one slow downstream service from degrading the entire request
path? How do we resume a long-running workflow after a failure without
reprocessing work already completed?

These coordination problems have known solutions — saga patterns, circuit
breakers, checkpointing, scatter-gather, compensation. But these solutions
are typically embedded in imperative code as scattered mechanisms rather
than expressed as explicit, composable, declarative structures. The
`orchestrate` grimoire makes coordination *visible*: every routing decision,
every error recovery strategy, every observability concern is stated
explicitly in the workflow definition rather than concealed in implementation.

### Workflow as institutional memory

A well-specified workflow is not just executable code — it is a record of
how the organisation has decided to perform a process. The routing decisions
capture policy: "if the risk score exceeds threshold X, escalate to a human
reviewer." The compensation handlers capture the organisation's agreement
about what "undoing" means: "a refund within 5 business days constitutes
adequate reversal of a failed payment." The monitoring configuration captures
the organisation's standards: "we page on-call when success rate drops below
90%."

These decisions belong in the workflow specification, not scattered across
code comments and team wikis. `orchestrate` gives them a home.

### The orchestrate/core boundary

`core` provides execution primitives: `sequence`, `parallel`, `branch`,
`retry`, `intercept`, `ward`. These are foundational — they express *how
operations relate*. `orchestrate` provides workflow-level abstractions built
on these primitives: named workflows with versioning, state management across
long execution spans, saga compensation patterns, circuit breakers, scheduled
execution, and human-in-the-loop integration. The boundary is: core for
primitive composition; orchestrate for workflow-level coordination.

### Five design principles

**Declarative workflow specification** — Workflows describe what should
happen, not how the machinery makes it happen. Coordination logic is visible
in the specification.

**State as first-class** — Workflow state is explicit data that flows through
the definition, enabling clear reasoning, testability, and persistence for
fault tolerance.

**Sophisticated error recovery** — Failures are inevitable. The question is
not whether failures happen but what the system does when they do. Every
failure mode has a declared recovery strategy.

**Observability throughout** — Production workflows require visibility into
execution. Logging, metrics, tracing, and alerting are built into the
workflow definition, not added as afterthoughts.

**Composition and reuse** — Complex workflows build from simpler sub-workflows.
Coordination patterns are encapsulated, tested independently, and reused.

---

## Naming rationale

**`o/`** — The short namespace alias.

**Workflow** — Coordinated sequence of operations from initiation to completion.

**Saga** — From Old Norse saga, a narrative of connected episodes. In
distributed systems, a saga maintains consistency across services through
compensating transactions — it can "tell the story backwards" when failures
require undoing prior steps.

**Circuit breaker** — Electrical safety device that interrupts current when
detecting faults. Software circuit breakers detect systematic failures and
fail fast to prevent cascading collapse.

**Checkpoint** — A persisted state snapshot that enables resumption from
a known point after failure, avoiding reprocessing of completed work.

**Scatter-gather** — From the parallel-computing pattern: *scatter* work to many
workers at once, then *gather* their results into one. The name carries both
halves because the gathering — deciding how many responses suffice and how to
combine them — is as much the construct as the scattering.

**Fan-out** — From signal routing, where one source fans out to many
destinations. Here, one operation fans out across the items of a collection — a
runtime-sized parallelism, distinct from scatter-gather's fixed, named workers.

**React** — To act in response to something happening. An `o/react` trigger
fires on an event — a message, a webhook, a state change — as opposed to a clock
(`o/schedule`) or a direct call (`o/execute-workflow`).

**Schedule** — Time-driven triggering: a declarative cron with observability,
overlap handling, and failure alerting built in.

**Human-approval** — Plainly named for what it is: a structured, auditable point
where a human decision enters an otherwise automated flow.

**Replay** — To re-run a workflow instance from a chosen stage, preserving the
completed portion and re-executing the rest — often with corrected data.

**Audit-trail** — The complete, ordered record of what a workflow instance
actually did: every decision, transition, error, and human action.

---

## Part I: Workflow definition and execution

---

### `o/define-workflow`

Creates a declarative workflow specification — a named, versioned coordination
structure with explicit stages, routing, state management, error recovery,
and observability.

#### Signature

```clojure
(o/define-workflow name
  :description     string
  :version         semver
  :inputs          {:param-name :type ...}
  :outputs         {:result-name :type ...}
  :stages          [stage-definition ...]
  :state           {:persistence :memory | :database | :redis
                    :schema      state-schema}
  :error-handling  {:strategy   :retry | :compensate | :circuit-breaker | :fallback
                    :dead-letter destination}
  :monitoring      {:metrics boolean :tracing boolean :logging :level
                    :alerts  [alert-spec ...]}
  :timeout         duration
  :idempotency-key :field-name
  :manifest        workflow-definition)
```

#### Parameters

**`:stages`** — The workflow's steps. Each stage definition:
```clojure
{:name          :stage-name
 :operation     invocation-or-fn
 :on-success    :next-stage-name | nil (terminal)
 :on-failure    :error-stage-name | :compensate | :dead-letter
 :compensate    compensation-invocation    ;; for saga patterns
 :timeout       duration
 :retries       {:attempts n :backoff :exponential}
 :requires      [:prior-stage-name ...]   ;; dependency declaration
 :produces      :result-binding}
```

**`:state`** — How workflow state persists:
- `:memory` — in-process; lost on restart (suitable for short-lived workflows)
- `:database` — persisted to a relational store; enables resumption after failure
- `:redis` — persisted to Redis; fast; suitable for high-throughput workflows

**`:idempotency-key`** — A field from `:inputs` that uniquely identifies this
workflow instance. If a workflow with the same key is already running or has
completed successfully, the new invocation returns the existing result without
re-executing. Essential for payment and order workflows where duplicate
execution is harmful.

#### Design rationale

`o/define-workflow` is the flagship because it is where coordination becomes
*visible*. The grimoire's founding claim is that saga compensation, routing
policy, error recovery, and observability should be stated explicitly in one
declarative structure rather than scattered through imperative code — and this
construct is that structure. Everything else in the grimoire either feeds a
workflow definition (`o/scatter-gather`, `o/human-approval` as stage operations)
or operates on its instances (`o/execute-workflow`, `o/replay`, `o/audit-trail`).

The decisive design choice is that **routing and recovery are part of the
specification, not the implementation**. Each stage declares `:on-success`,
`:on-failure`, and `:compensate` inline, so the workflow's entire control flow —
including what happens when things go wrong — is readable in one place. This is
the "workflow as institutional memory" principle made concrete: the
`:compensate` handler records what the organisation has decided "undoing" means,
the `:on-failure` routing records its escalation policy, the `:alerts` record
its operational standards. A workflow definition is a durable record of decided
policy, which is why it carries a `:version` — policy changes, and the change
should be tracked.

`:state` and `:idempotency-key` exist because workflows are *long-lived* in a
way single operations are not. A workflow that spans a 48-hour human approval
must survive process restarts (hence persistent `:state`), and a workflow that
moves money must never execute twice for the same logical request (hence
`:idempotency-key`). These are not optional refinements; they are what separates
a workflow from a function that happens to call several services.

#### Example: Customer onboarding workflow

```clojure
(o/define-workflow :customer-onboarding
  :description "Complete onboarding for new B2B customers"
  :version     "2.1.0"

  :inputs {:application   :map
           :documents     :array
           :submitted-by  :uuid}

  :outputs {:customer-id   :uuid
            :account-ids   [:array :uuid]
            :welcome-email :sent | :queued}

  :stages [
    {:name      :validate-application
     :operation (conjure application-validator
                  :data application :schema b2b-schema)
     :on-success :enrich-company-data
     :on-failure :reject-with-reason
     :timeout    30000}

    {:name      :enrich-company-data
     :operation (parallel company-enrichment
                  :operations [
                    (conjure registry-lookup :registration-number (:registration-number application))
                    (conjure credit-check :company-id (:company-id application))]
                  :combine-results :merge
                  :on-error :best-effort)
     :on-success :manual-review
     :timeout    60000}

    {:name      :manual-review
     :operation (o/human-approval
                  :reviewers [:onboarding-team]
                  :data      {:application application :enrichment enrichment-result}
                  :timeout   (hours 48)
                  :deadline-action :escalate-to-manager)
     :on-success :provision-accounts
     :on-failure :reject-with-reason}

    {:name      :provision-accounts
     :operation (sequence account-provisioning
                  :operations [
                    (conjure create-crm-record    :data application)
                    (conjure create-billing-account :data application)
                    (conjure setup-access-control  :customer-id crm-id)]
                  :on-error :compensate)
     :compensate (conjure deprovision-partial-accounts :context stage-state)
     :on-success :send-welcome
     :on-failure :compensate-and-alert}

    {:name      :send-welcome
     :operation (conjure send-onboarding-email
                  :to     (:email application)
                  :template :b2b-welcome-v3)
     :on-success nil   ;; terminal stage
     :on-failure :queue-email-retry}]

  :state {:persistence :database}

  :error-handling {:strategy :compensate
                   :dead-letter {:type :database :table "onboarding_failures"}}

  :monitoring {:metrics true
               :tracing true
               :logging :info
               :alerts  [
                 {:condition (fn [m] (> (:p95-duration-hours m) 72))
                  :message   "Onboarding p95 exceeding 72-hour SLA"
                  :action    :page-on-call}]}

  :timeout       (hours 96)
  :idempotency-key :application-id)
;; ✓ The workflow's entire control flow is readable in one place: each stage
;;   declares where success routes (:on-success), where failure routes
;;   (:on-failure), and — for the stage that mutates shared state — how to undo
;;   it (:compensate). The recovery policy is part of the specification, not
;;   hidden in implementation.
;; ✓ :provision-accounts is the only stage with a :compensate handler, because
;;   it is the only one with side effects to reverse. Reading stages and manual
;;   review have nothing to undo — compensation is declared exactly where state
;;   is mutated, nowhere else.
;; ✓ :idempotency-key :application-id ensures a double-submitted application
;;   returns the in-flight or completed result rather than provisioning a second
;;   set of accounts — the safeguard that separates a workflow from a function.
```

---

### `o/execute-workflow`

Initiates an instance of a defined workflow, managing its lifecycle from
invocation through completion or terminal failure.

#### Signature

```clojure
(o/execute-workflow workflow-definition
  :inputs        {:param value ...}
  :priority      :standard | :high | :critical
  :dry-run       boolean
  :resume-from   checkpoint-id
  :manifest      execution-handle)
```

#### Parameters

**`:dry-run`** — Execute the workflow logic without side effects. Useful for
validating workflow definitions and testing routing decisions before
committing to production execution.

**`:resume-from`** — Resume execution from a named checkpoint, skipping stages
already completed. Used for recovery after partial failure.

#### Design rationale

`o/execute-workflow` separates *definition* from *instance*, and the separation
is the point. A workflow definition is written once and run many times; each run
is a distinct instance with its own inputs, state, and lifecycle. Keeping them
separate constructs means a definition can be versioned, tested, and reasoned
about independently of any particular execution, while each execution gets its
own handle for status queries, replay, and audit.

`:dry-run` exists because workflow definitions encode consequential policy —
routing, compensation, escalation — and that policy should be testable *without
side effects* before it touches production. A dry run exercises the routing
logic and surfaces what *would* happen, so a practitioner can validate a new or
changed definition against realistic inputs before money moves or accounts are
provisioned. `:resume-from` reflects the long-lived nature of workflows: when a
48-hour process fails at hour 40, restarting from the beginning wastes the
completed work (and re-triggers completed side effects); resuming from a
checkpoint is both cheaper and safer.

#### Example: Executing and resuming a workflow

```clojure
;; Standard execution: start an instance and bind its handle
(o/execute-workflow customer-onboarding
  :inputs   {:application app-data :documents docs :submitted-by user-id}
  :priority :standard
  :manifest onboarding-execution)
;; → returns an execution handle for later status, audit, or replay queries

;; Dry run: validate routing against real inputs without side effects
(o/execute-workflow customer-onboarding
  :inputs  {:application suspect-application :documents docs}
  :dry-run true)
;; → reports which stages would run and how routing would resolve, but
;;   provisions no accounts and sends no email

;; Resume a partially-completed instance from a checkpoint after recovery
(o/execute-workflow customer-onboarding
  :resume-from :provision-accounts
  :manifest    resumed-execution)
;; ✓ The same definition serves all three: a live run, a consequence-free
;;   validation, and a recovery — each producing its own instance handle.
;;   Definition and instance are distinct, which is what makes dry-run and
;;   resume possible without touching the definition itself.
```

---

### `o/workflow-status`

Queries the current state of a running or completed workflow instance.

#### Signature

```clojure
(o/workflow-status execution-handle
  :include    [:current-stage :stage-history :state-snapshot :metrics :errors]
  :manifest   status-binding)
```

#### Example

```clojure
(o/workflow-status onboarding-execution
  :include [:current-stage :stage-history :metrics])

;; Returns:
{:workflow    :customer-onboarding
 :instance-id "inst-2025-11-03-0042"
 :status      :awaiting-human-approval
 :current-stage {:name :manual-review
                 :started-at "2025-11-03T09:15:00Z"
                 :waiting-for "onboarding-team review"
                 :deadline "2025-11-05T09:15:00Z"}
 :stage-history [
   {:name :validate-application :status :completed :duration-ms 843}
   {:name :enrich-company-data  :status :completed :duration-ms 4210
    :note "Credit check returned :medium risk"}]
 :metrics {:elapsed-hours 4.2 :stages-completed 2 :stages-remaining 3}}
```

---

## Part II: Coordination patterns

---

### `o/scatter-gather`

Distributes work to multiple operations in parallel (scatter), then aggregates
the results according to a declared strategy (gather). A high-level abstraction
over `parallel` from core.

#### Signature

```clojure
(o/scatter-gather name
  :scatter     {worker-id operation ...}
  :gather      :merge | :first-wins | :quorum | :custom-fn
  :timeout     duration
  :min-responses n
  :on-timeout  :use-available | :fail
  :manifest    result-binding)
```

#### Parameters

**`:gather :quorum`** — Accept the result only when a minimum number of
workers agree. Used for consensus operations where a single source is not
authoritative.

**`:min-responses`** — Minimum number of successful responses needed before
triggering gather. If fewer succeed within `:timeout`, trigger `:on-timeout`
behaviour.

#### Design rationale

`o/scatter-gather` is a higher-level abstraction over core's `parallel`, and the
elevation earns its place by adding what distributed fan-out actually needs:
*partial-result discipline*. `parallel` runs operations concurrently; but real
scatter-gather over independent services must answer harder questions — how many
responses are enough, what to do when some never arrive, how to combine results
that may conflict. Those questions are the construct, not the concurrency.

The decisive parameters are `:gather` and `:min-responses`, which together
encode the truth that **in distributed systems, waiting for everyone is a
failure mode**. A credit assessment that queries three bureaus should not hang
because one bureau is slow; it should proceed on a quorum. `:gather :quorum`
with `:min-responses 2` says exactly that: act when enough sources agree, do not
wait for the laggard. `:on-timeout :use-available` versus `:fail` then makes the
degradation policy explicit — is a partial answer better than no answer here, or
must the operation be all-or-nothing? Different operations answer differently,
and the construct forces the choice rather than defaulting to a brittle
wait-for-all.

#### Example: Multi-source credit assessment

```clojure
(o/scatter-gather credit-assessment
  :scatter {
    :experian  (conjure credit-check :provider :experian :company-id id)
    :equifax   (conjure credit-check :provider :equifax  :company-id id)
    :internal  (conjure credit-check :provider :internal-model :company-id id)}
  :gather        :quorum
  :min-responses 2
  :timeout       10000
  :on-timeout    :use-available
  :manifest assessment-result)

;; ✓ All three credit checks run concurrently
;; ✓ Result is accepted when ≥ 2 sources respond
;; ✓ If only 1 responds within 10 seconds, use-available rather than fail
;; ✓ Final result includes all successful responses with source attribution
```

---

### `o/fan-out`

Runs the same operation once per item in a collection, with explicit control
over how many run concurrently — dynamic parallelism over data, as distinct from
`o/scatter-gather`'s fixed set of named workers. The map-reduce pattern for
workflows: process ten thousand records, fifty at a time, and gather the results.

#### Signature

```clojure
(o/fan-out name
  :over          collection | (fn -> collection)
  :operation     (fn [item] invocation)
  :concurrency   n | :unbounded
  :on-item-error :collect | :halt | :compensate | :skip
  :gather        :all | :successes-only | :reduce
  :reduce-fn     (fn [acc result] ...)        ;; when :gather :reduce
  :progress      {:checkpoint-every n :report boolean}
  :timeout       {:per-item duration :total duration}
  :manifest      result-binding)
```

#### Parameters

**`:over`** — The collection to fan out across, or a function that produces it.
Unlike `o/scatter-gather`, the cardinality is not known at definition time — it
is whatever the collection holds at runtime, from three items to three million.

**`:operation`** — The operation to run for each item, as a function of the item.
The same logic applied across the collection; this is the "map" of map-reduce.

**`:concurrency`** — How many items process simultaneously. This is the
load-bearing control: `:unbounded` launches all at once (correct only for small
collections against elastic targets), while a bounded `n` (process 50 at a time)
protects downstream services and the host from being overwhelmed. Almost always
set a bound; unbounded fan-out over a large collection is a self-inflicted
denial-of-service.

**`:on-item-error`** — What a single item's failure means for the whole:
- `:collect` — record the failure, continue; report all failures at the end
  (correct for bulk processing where one bad record should not stop the batch)
- `:halt` — stop the entire fan-out on first failure (correct when items are
  interdependent)
- `:compensate` — run compensation for already-completed items (saga semantics
  over a collection)
- `:skip` — silently skip failures (use sparingly; `:collect` is almost always
  better because it preserves the record)

**`:gather`** — How per-item results combine: `:all` (every result, failures
included), `:successes-only`, or `:reduce` (fold them with `:reduce-fn` — the
"reduce" of map-reduce, for sums, counts, merged reports).

**`:progress`** — For long fan-outs, checkpoint every *n* items so a failure
mid-batch can resume rather than restart, and optionally report progress. A
fan-out over a million records that cannot resume is a liability.

#### Design rationale

`o/fan-out` fills the gap between `o/scatter-gather` and the most common bulk
operation in real systems. Scatter-gather distributes work to a *fixed, named*
set of workers known when the workflow is written — three credit bureaus, two
pricing engines. But an enormous share of orchestration is the opposite shape:
*one* operation applied to a collection whose size is unknown until runtime —
reprocess every order in a failed batch, send a notification to each affected
user, revalidate every record after a schema change. That is fan-out, and
forcing it through scatter-gather (which has no notion of a runtime-sized
collection or concurrency limiting) is the wrong tool.

The decisive parameter is `:concurrency`, because **unbounded parallelism over a
large collection is a failure mode disguised as speed**. Launching ten thousand
concurrent calls does not process the batch faster; it exhausts connection
pools, trips every downstream circuit breaker, and frequently takes down the
very service being called. The construct makes the concurrency bound explicit
and expects it to be set — the question "how many at once?" is not a tuning
detail but a correctness decision about how much load the targets can absorb.

`:on-item-error` exists because bulk operations need a different failure model
than single workflows. When one of ten thousand records fails, halting the
entire batch is usually wrong — the other 9,999 should still process, and the
one failure should be *recorded* for follow-up, not allowed to abort everything.
Making `:collect` available (and the natural default posture) reflects that bulk
processing is about completing the batch and reporting exceptions, not about
all-or-nothing atomicity — though `:compensate` is there for the cases that
genuinely need saga semantics across the collection.

#### Example: Re-validating a batch of records after a schema change

```clojure
(o/fan-out revalidate-customer-records
  :over          (data/transform stale-records :operations [{:op :keep-fields [:id :payload]}])
  :operation     (fn [record]
                   (conjure revalidate :record record :schema customer-schema-v3))
  :concurrency   50                       ;; 50 at a time — protects the validation service
  :on-item-error :collect                 ;; one bad record must not stop the batch
  :gather        :reduce
  :reduce-fn     (fn [acc r] (update acc (:status r) (fnil inc 0)))
  :progress      {:checkpoint-every 500 :report true}
  :timeout       {:per-item 5000 :total (hours 2)}
  :manifest      revalidation-summary)

;; Returns the reduced summary plus the collected failures:
{:processed 48210
 :summary   {:valid 47180 :repaired 902 :invalid 128}
 :failures  [{:id "rec-3391" :error "payload missing required field :region"} ...]
 :checkpoints-written 96
 :elapsed   "1h 14m"}
;; ✓ :concurrency 50 is the correctness decision, not a tuning detail: it caps
;;   load on the validation service so a 48k-record batch does not trip its
;;   circuit breaker. :unbounded here would have been a self-inflicted outage.
;; ✓ :on-item-error :collect kept the batch running through 128 invalid records
;;   and reported them, rather than letting record 1 abort the other 48,209.
;; ✓ :checkpoint-every 500 means a failure at record 40,000 resumes near there
;;   rather than restarting two hours of work — fan-out over large collections
;;   that cannot resume is a liability.
```

#### Usage patterns

```clojure
;; Fan-out with saga semantics: compensate completed items if the batch must roll back
(o/fan-out migrate-accounts
  :over account-ids
  :operation (fn [id] (conjure migrate-account :id id))
  :concurrency 20
  :on-item-error :compensate              ;; undo migrated accounts on failure
  :gather :all)

;; Fan-out as a workflow stage — each item is itself a sub-workflow execution
{:name :process-regional-batches
 :operation (o/fan-out regional-processing
              :over    active-regions
              :operation (fn [region]
                           (o/execute-workflow regional-settlement :inputs {:region region}))
              :concurrency 4)}
```

---

### `o/human-approval`

Implements human-in-the-loop pattern for workflows requiring manual review,
approval, or decision-making that the system cannot or should not make
autonomously.

#### Signature

```clojure
(o/human-approval
  :reviewers        [:role | :user-id ...]
  :data             display-data
  :options          {:approve description :reject description :escalate description}
  :timeout          duration
  :deadline-action  :escalate | :auto-approve | :auto-reject | :cancel
  :escalate-to      [:reviewer ...]
  :notification     {:channels [:email :slack :teams] :template :keyword}
  :audit-trail      boolean
  :manifest         approval-binding)
```

#### Design rationale

Automation is valuable but not always appropriate. Payment fraud decisions
above certain thresholds require human judgment. Employee termination
workflows must include HR sign-off. Medical dosing decisions in clinical
systems require physician approval. `o/human-approval` provides a structured,
auditable pattern for these human checkpoints rather than leaving them as
implicit email chains or verbal handoffs.

The `:deadline-action` parameter specifies what happens when the timeout expires
without a decision. This forces explicit policy: does an unanswered review
default to rejection (safe), approval (permissive), escalation (responsible),
or cancellation (conservative)?

#### Example: Compliance exception approval

```clojure
(o/human-approval
  :reviewers   [:compliance-officer :legal-counsel]
  :data        {:exception-request exception-data
                :risk-assessment   risk-report
                :business-case     justification}
  :options     {:approve  "Approve exception for stated period and scope"
                :reject   "Reject; require alternative approach"
                :escalate "Escalate to Chief Compliance Officer"}
  :timeout     (hours 24)
  :deadline-action :escalate
  :escalate-to [:chief-compliance-officer]
  :notification {:channels [:email :teams]
                 :template :compliance-exception-review}
  :audit-trail true)

;; ✓ Both reviewers receive structured notification with all required data
;; ✓ Decision and reasoning are permanently recorded in audit trail
;; ✓ After 24 hours without decision, automatically escalates to CCO
;; ✓ Escalation itself gets a 24-hour window before further escalation
```

---

### `o/circuit-breaker`

Monitors calls to a downstream dependency and "opens the circuit" when
systematic failures are detected — failing fast to protect the system from
cascading failures and allowing the downstream service time to recover.

#### Signature

```clojure
(o/circuit-breaker name
  :protect      operation
  :open-when    {:error-rate    threshold   ;; fraction 0.0-1.0
                 :window-size   n           ;; number of calls to evaluate
                 :min-calls     n}          ;; minimum calls before evaluation
  :reset-after  duration
  :half-open    {:allow-through n}          ;; test calls when half-open
  :on-open      callback-fn
  :fallback     fallback-operation
  :manifest     result-binding)
```

#### Design rationale

`o/circuit-breaker` exists because the naive failure response — keep trying —
is exactly wrong when a downstream dependency is systematically failing. Every
retry against a service that is down consumes a connection, a thread, and a
timeout window, and a flood of retries from many callers turns one service's
outage into the whole system's collapse. The circuit breaker inverts the
instinct: when failures cross a threshold, *stop calling* and fail fast, which
both protects the caller (no threads blocked on a doomed call) and gives the
struggling dependency room to recover instead of being hammered while it is down.

The three-state cycle is the construct's core, and the half-open state is the
non-obvious part that makes it work. A breaker that simply stayed open for a
fixed duration would either reopen too eagerly or keep failing fast long after
recovery. Half-open resolves this empirically: after the reset window, let a
*small* number of test calls through and let reality decide — if they succeed,
the dependency has recovered and the circuit closes; if they fail, it has not
and the circuit reopens without having admitted a flood. The breaker discovers
recovery by gentle probing rather than guessing at a duration.

`:fallback` is what separates a circuit breaker from a mere kill switch. Failing
fast is only half the value; the other half is *degrading gracefully* — queueing
the payment for async processing, serving stale cache, returning a reduced
result. The fallback is the answer to "fail fast into what?", and making it a
first-class parameter forces that answer to be designed rather than defaulting
to an error the user sees.

#### States

A circuit breaker cycles through three states:
- **Closed** — normal operation; all calls pass through; failures are counted
- **Open** — failure threshold exceeded; all calls fail fast with fallback;
  downstream service is not called
- **Half-open** — after `:reset-after` duration, allows through `:allow-through`
  test calls; if they succeed, circuit closes; if they fail, circuit re-opens

#### Example: Payment gateway protection

```clojure
(o/circuit-breaker payment-gateway
  :protect    (conjure gateway-call :payment payment-data)
  :open-when  {:error-rate  0.5    ;; Open when 50%+ calls fail
               :window-size 20     ;; Evaluated over last 20 calls
               :min-calls   10}    ;; Don't open on fewer than 10 calls
  :reset-after (seconds 30)
  :half-open  {:allow-through 3}
  :on-open    (fn [stats]
                (log/warn "Payment gateway circuit opened"
                          :error-rate (:error-rate stats))
                (metrics/gauge "payment.circuit.state" :open))
  :fallback   (conjure queue-payment-async
                :payment payment-data
                :notify-customer true)
  :manifest   payment-result)
```

---

### `o/schedule`

Defines a scheduled, recurring workflow trigger — the equivalent of a
declarative cron job with observability, error handling, and overlap
prevention built in.

#### Signature

```clojure
(o/schedule name
  :trigger       {:cron "0 8 * * 1-5"} | {:interval (hours 1)} | {:at "09:00"}
  :timezone      "Europe/Amsterdam"
  :workflow      workflow-definition
  :inputs        {:param value ...}
  :overlap       :skip | :queue | :cancel-previous
  :on-failure    :retry | :alert | :skip-until-next
  :monitoring    {:metrics boolean :alert-on-failure boolean}
  :active        boolean
  :manifest      schedule-binding)
```

#### Parameters

**`:overlap`** — What to do when a scheduled trigger fires while the previous
instance is still running:
- `:skip` — skip this trigger; the previous run is still in progress
- `:queue` — queue this trigger; it runs when the previous completes
- `:cancel-previous` — cancel the running instance and start fresh

#### Design rationale

`o/schedule` is declarative cron with the operational concerns that cron leaves
to chance built in. A bare cron entry fires a command and forgets it: no record
of whether it succeeded, no handling of a run that outlasts its interval, no
alerting when it silently stops working. These omissions are exactly where
scheduled jobs fail in production — the nightly reconciliation that has been
erroring for a week before anyone notices, the hourly job whose runs pile up
because each takes longer than an hour. `o/schedule` makes these first-class.

The `:overlap` parameter is the one cron most conspicuously lacks and the one
that causes the most damage. When a scheduled run takes longer than its
interval, *something* must decide what the next trigger does — and leaving it
undecided means two instances run concurrently, often corrupting the shared
state they both touch. By forcing an explicit `:skip`, `:queue`, or
`:cancel-previous`, the construct turns a silent race condition into a declared
policy. `:on-failure` and `:monitoring` close the other gap: a scheduled
workflow that fails should not fail in silence, so failure handling and
alerting are part of the schedule, not an afterthought bolted on after the first
missed run.

#### Example: Daily reconciliation

```clojure
(o/schedule daily-account-reconciliation
  :trigger   {:cron "0 6 * * 1-5"}    ;; 06:00 weekdays
  :timezone  "Europe/Amsterdam"
  :workflow  account-reconciliation-workflow
  :inputs    {:date :yesterday :source :primary-ledger}
  :overlap   :skip
  :on-failure :alert
  :monitoring {:metrics true :alert-on-failure true}
  :active    true)
```

---

### `o/react`

Triggers a workflow in response to an event rather than a clock — a message
arriving, a webhook firing, a state changing, a file landing. The event-driven
counterpart to `o/schedule`'s time-driven triggering, with the same built-in
observability, error handling, and overlap discipline.

#### Signature

```clojure
(o/react name
  :on            {:event-source source :event-type type :filter predicate}
  :workflow      workflow-definition
  :map-event     (fn [event] {:param value ...})   ;; event payload → workflow inputs
  :dedup         {:key (fn [event] ...) :window duration}
  :ordering      :strict | :per-key | :unordered
  :on-failure    :retry | :dead-letter | :alert | :skip
  :concurrency   n | :unbounded
  :backpressure  :buffer | :drop-oldest | :reject
  :active        boolean
  :manifest      reaction-binding)
```

#### Parameters

**`:on`** — The event to react to: the source (a message queue, a webhook
endpoint, a database change stream, an object store), the event type, and an
optional `:filter` predicate so the reaction fires only for events that matter
(an order event, but only when `status = paid`). Reacting to everything and
filtering inside the workflow wastes executions; the filter belongs at the trigger.

**`:map-event`** — How the event's payload becomes the workflow's inputs. Events
and workflow inputs have different shapes; this function bridges them, extracting
and reshaping the fields the workflow needs from the raw event.

**`:dedup`** — Event sources frequently deliver the same event more than once
(at-least-once delivery is the common guarantee). `:dedup` suppresses duplicates
within a window by a key derived from the event, so a re-delivered "payment
received" does not trigger the workflow twice. Closely related to
`o/define-workflow`'s `:idempotency-key`, but applied at the trigger rather than
inside the workflow.

**`:ordering`** — Whether events must process in order: `:strict` (global order,
slowest — rarely needed), `:per-key` (events for the same entity process in
order, different entities concurrently — the usual correct choice), or
`:unordered` (maximum throughput, order irrelevant).

**`:backpressure`** — What happens when events arrive faster than they can be
processed: `:buffer` (queue them, risking memory growth), `:drop-oldest` (keep
the newest, for state-update events where only the latest matters), or `:reject`
(refuse and signal the source to slow down). An event reactor without a
backpressure policy fails badly under a burst.

#### Design rationale

`o/react` is the event-driven sibling of `o/schedule`, and the pair completes
the grimoire's account of *triggering*. A workflow starts in one of three ways:
on demand (`o/execute-workflow`), on a clock (`o/schedule`), or in response to
something happening (`o/react`). Modern systems are overwhelmingly the third —
the order workflow that starts when payment clears, the moderation workflow that
starts when content is posted, the settlement that starts when a file arrives —
and a coordination grimoire without event triggering would force every reactive
workflow to be faked with a polling schedule, which is both wasteful and laggy.

The design concentrates on the concerns that make event-driven triggering hard
and that naive implementations get wrong: **duplicate delivery, ordering, and
backpressure**. Each is a property of the *event stream*, not the workflow, and
each causes a distinct production failure if unhandled. At-least-once delivery
means the same event arrives twice, so without `:dedup` the workflow runs twice
— charging a card or shipping an order redundantly. Concurrent processing of
events for the same entity causes lost updates, so `:ordering :per-key` keeps an
entity's events sequential while letting different entities run in parallel.
And an event source that bursts faster than the workflow can drain will, without
`:backpressure`, exhaust memory or silently lose events. By making these
first-class parameters, `o/react` forces the reactive failure modes to be
decided at definition time rather than discovered under load.

The boundary with `o/schedule` is clean: schedule fires on *time*, react fires
on *events*. They share the overlap/concurrency and failure-handling discipline
because both are autonomous triggers that run without a human initiating them,
and both must therefore decide what happens when triggers outpace execution.

#### Example: Reacting to a payment event

```clojure
(o/react on-payment-settled
  :on        {:event-source :payment-events
              :event-type   :payment.settled
              :filter       (fn [e] (= (:currency e) :eur))}
  :workflow  order-fulfilment-workflow
  :map-event (fn [e] {:order-id   (:order-id e)
                      :amount     (:amount e)
                      :settled-at (:timestamp e)})
  :dedup     {:key (fn [e] (:payment-id e)) :window (minutes 10)}
  :ordering  :per-key            ;; events for one order stay ordered; different orders concurrent
  :on-failure :dead-letter
  :concurrency 100
  :backpressure :buffer
  :active    true
  :manifest  payment-reactor)

;; ✓ :dedup on :payment-id within 10 minutes is the safeguard against
;;   at-least-once delivery: a re-delivered "payment.settled" event does not
;;   trigger a second fulfilment. This is the trigger-level analogue of a
;;   workflow's :idempotency-key.
;; ✓ :ordering :per-key keeps two events for the SAME order sequential (so a
;;   settlement and a later refund cannot race) while letting different orders
;;   process concurrently — correctness without sacrificing throughput.
;; ✓ :filter at the trigger means the reactor never spends an execution on a
;;   non-EUR event; filtering inside the workflow would have wasted one.
```

#### Usage patterns

```clojure
;; React to a file landing in object storage, fan out over its rows
(o/react on-batch-file-arrival
  :on        {:event-source :object-store :event-type :object.created
              :filter (fn [e] (str-ends-with? (:key e) ".csv"))}
  :workflow  (o/define-workflow :ingest-batch
               :stages [{:name :parse   :operation (fn [in] (data/convert-format (:file in) :to :edn))}
                        {:name :process :operation (fn [rows]
                                                     (o/fan-out ingest :over rows
                                                       :operation (fn [r] (conjure ingest-row :row r))
                                                       :concurrency 50))}])
  :map-event (fn [e] {:file (:key e)}))

;; React to a state change, with drop-oldest for latest-wins semantics
(o/react on-inventory-changed
  :on       {:event-source :inventory-stream :event-type :stock.updated}
  :workflow reindex-search-workflow
  :ordering :per-key
  :backpressure :drop-oldest)    ;; only the latest stock level matters; stale updates can drop
```

---

### `o/replay`

Re-executes a workflow instance from a specific stage, using the original
inputs and state up to that stage but potentially with modified inputs or
corrected data. Essential for recovering from data quality issues that
caused partial failures.

#### Signature

```clojure
(o/replay execution-handle
  :from-stage     :stage-name
  :with-overrides {:input-field new-value ...}
  :dry-run        boolean
  :manifest       new-execution-handle)
```

#### Design rationale

Failures in production are not always failures of code — they are often
failures of data. A mis-formatted input field, a temporary downstream
unavailability, a data quality issue caught mid-workflow. When the data
problem is corrected, the workflow should not have to restart from the
beginning — especially if early stages are expensive (external API calls,
manual approvals that have already been completed).

`o/replay` preserves the completed portion of a workflow and re-executes
from the point of failure with corrected data.

#### Example

```clojure
;; The onboarding workflow failed at :provision-accounts because
;; the CRM system was briefly unavailable. The CRM is now back.
(o/replay failed-onboarding-execution
  :from-stage :provision-accounts
  ;; No overrides needed — the failure was infrastructure, not data
  :dry-run false)
```

---

### `o/audit-trail`

Produces a complete, human-readable execution history of a workflow instance
— every decision made, every stage executed, every error encountered, every
human action taken.

#### Signature

```clojure
(o/audit-trail execution-handle
  :include     [:decisions :state-transitions :human-actions :errors :timing]
  :format      :chronological | :by-stage | :anomalies-only
  :output      :audit-report
  :manifest    audit-binding)
```

#### Design rationale

Compliance, incident investigation, and operational review all require the
ability to answer "exactly what happened?" for a specific workflow instance.
`o/audit-trail` produces a complete answer — not just the final state but
the complete sequence of decisions, inputs, outputs, errors, and human
interventions that produced it.

#### Example

```clojure
(o/audit-trail onboarding-execution-0042
  :include [:decisions :human-actions :errors :timing]
  :format  :chronological)

;; Returns:
{:workflow  :customer-onboarding
 :instance  "inst-0042"
 :timeline [
   {:time "09:00:12" :event :workflow-started :inputs {:company "Acme Industries" :registration-number "12345678"}}
   {:time "09:00:13" :event :stage-started    :stage :validate-application}
   {:time "09:00:14" :event :stage-completed  :stage :validate-application :result :valid}
   {:time "09:00:14" :event :stage-started    :stage :enrich-company-data}
   {:time "09:00:19" :event :enrichment-partial
    :detail "Registry lookup succeeded; credit check timed out — proceeding with :medium risk default"}
   {:time "09:00:19" :event :stage-completed  :stage :enrich-company-data}
   {:time "09:00:19" :event :stage-started    :stage :manual-review}
   {:time "11:32:07" :event :human-action     :actor "analyst@example.com"
    :action :approved :notes "Financials reviewed; credit risk acceptable"}
   {:time "11:32:08" :event :stage-completed  :stage :manual-review}
   {:time "11:32:08" :event :stage-started    :stage :provision-accounts}
   {:time "11:32:14" :event :error            :stage :provision-accounts
    :error "CRM temporarily unavailable — HTTP 503"}
   {:time "11:32:14" :event :stage-failed     :stage :provision-accounts}
   {:time "11:32:14" :event :compensation-started :compensate :deprovision-partial}
   {:time "11:32:15" :event :compensation-completed}
   {:time "11:32:15" :event :workflow-paused  :reason "awaiting-replay"}]}
```

---

## Part III: Error recovery patterns

---

### Saga with compensation

Saga is the canonical pattern for maintaining consistency in long-running
transactions that span multiple services. Each stage registers a compensating
operation; if any stage fails after prior stages have succeeded, compensations
run in reverse order.

```clojure
(o/define-workflow :order-placement-saga
  :stages [
    {:name      :reserve-inventory
     :operation (conjure reserve :items order-items)
     :compensate (conjure release-reservation :items order-items)
     :on-failure :compensate}

    {:name      :authorise-payment
     :operation (conjure authorise :amount total :card card-token)
     :compensate (conjure void-authorisation :auth-id auth-id)
     :on-failure :compensate}

    {:name      :create-shipment
     :operation (conjure create-shipment-record :order order-id)
     :compensate (conjure cancel-shipment :shipment-id shipment-id)
     :on-failure :compensate}]

  :error-handling {:strategy :compensate})

;; If :create-shipment fails after :authorise-payment and :reserve-inventory succeeded:
;; System automatically executes:
;; → void-authorisation
;; → release-reservation
;; In reverse order — clean, consistent rollback.
```

---

### Sub-workflow composition

The grimoire's fifth principle — complex workflows build from simpler
sub-workflows — needs no dedicated construct. A stage's `:operation` accepts any
invocation, and an executed workflow *is* an invocation, so a workflow composes
a sub-workflow simply by calling `o/execute-workflow` as a stage operation. The
sub-workflow keeps its own versioning, state, compensation, and audit trail; the
parent treats it as one stage.

```clojure
;; A high-level order workflow composes three independently-defined sub-workflows
(o/define-workflow :order-placement
  :version "3.0.0"
  :stages [
    {:name      :fulfil-payment
     :operation (o/execute-workflow payment-saga          ;; a sub-workflow, defined elsewhere
                  :inputs {:order order :amount total})
     :on-success :arrange-shipping
     :on-failure :compensate
     :compensate (o/execute-workflow payment-reversal :inputs {:order order})
     :produces  :payment-result}

    {:name      :arrange-shipping
     :operation (o/execute-workflow shipping-workflow     ;; another sub-workflow
                  :inputs {:order order :address ship-to})
     :on-success :confirm-order
     :on-failure :compensate
     :produces  :shipment}

    {:name      :confirm-order
     :operation (conjure send-confirmation :order order :shipment shipment)
     :on-success nil}]

  :error-handling {:strategy :compensate})

;; ✓ No new construct is needed: payment-saga and shipping-workflow are ordinary
;;   workflow definitions, invoked as stage operations via o/execute-workflow.
;;   Each retains its own internal compensation and audit trail; the parent
;;   composes them and adds its own compensation at the seam (a failed shipping
;;   stage compensates the completed payment via payment-reversal).
;; ✓ Composition is recursive: a sub-workflow can itself compose sub-workflows,
;;   and o/audit-trail on the parent instance nests the children's histories.
```

---

## Best practices

### Name your compensations explicitly

Every stage that modifies shared state should have an explicit `:compensate`
handler. Not every stage needs one (reading data has no side effect to undo)
but every stage that does should make its compensation visible in the
specification rather than relying on implicit rollback.

### Set idempotency keys on every stateful workflow

If a workflow can be triggered multiple times for the same logical operation
(network retries, user double-clicks, queue re-delivery), it must have an
`:idempotency-key`. Without one, duplicate executions cause duplicate state
mutations.

### Size timeouts to actual recovery expectations

A timeout on a human approval stage should be the business SLA for that
review, not an arbitrary technical default. A timeout on an external API call
should be the maximum acceptable latency for that call's use case. Timeouts
communicate policy and must be deliberate.

### Make escalation paths explicit

Every `:deadline-action` and `:on-failure` is a policy decision. When a
human review times out, does it auto-approve or escalate? When a compensation
fails, who is notified? These questions have answers in every organisation;
those answers belong in the workflow specification.

### Monitor at the workflow level, not just the operation level

Individual operation metrics are necessary but not sufficient. A workflow can
succeed at every stage while still behaving badly at the workflow level —
taking too long overall, having too many manual interventions, failing too
frequently at one particular stage. Workflow-level metrics surface these
systemic issues.

### Anti-patterns

**Fanning out without a concurrency bound.** Running `o/fan-out :concurrency
:unbounded` over a large collection does not process it faster — it exhausts
connection pools, trips downstream circuit breakers, and often takes down the
service being called. Unbounded fan-out is a self-inflicted denial-of-service.
Set a concurrency limit sized to what the targets can absorb; `:concurrency` is
a correctness decision, not a tuning detail.

**Reacting to events without dedup or ordering.** Event sources deliver
duplicates (at-least-once is the norm) and deliver concurrently. An `o/react`
trigger without `:dedup` runs the workflow twice on a re-delivered event —
charging a card or shipping an order redundantly — and without `:ordering
:per-key`, two events for the same entity race and lose updates. Decide both at
definition time; discovering them under load means discovering them as incidents.

**Waiting for all when a quorum will do.** Configuring `o/scatter-gather` to
require every worker (or omitting `:min-responses`) makes the whole operation as
slow and as fragile as its slowest, least-reliable source. When the operation
can proceed on a quorum, set `:min-responses` and `:on-timeout :use-available`;
waiting for a laggard that may never respond is a latency and availability bug.

**Compensation declared but skipped because it "seems unnecessary".** If a stage
mutated shared state, its compensation must run on rollback — even when it looks
redundant. The handler was declared because the stage has side effects, and
those effects must be reversed in full reverse order. Skipping one leaves the
system in the inconsistent state the saga pattern exists to prevent.

**Scheduled or reactive triggers that fail silently.** An `o/schedule` or
`o/react` trigger with no `:on-failure` and no `:monitoring` will stop working
and tell no one — the nightly reconciliation that has been erroring for a week,
the event reactor that died after a deploy. Autonomous triggers must alert on
failure; a trigger nobody initiated is a trigger nobody is watching unless
monitoring makes them.

---

## Integration patterns

### Orchestrate as the cross-grimoire glue

The orchestrate grimoire coordinates outputs from all other grimoires into
coherent end-to-end workflows.

```clojure
(o/define-workflow :document-intelligence-pipeline
  :stages [
    {:name :explore    :operation (d/explore documents :depth 3)}
    {:name :analyse    :operation (s/texan domain-model :models [:argumentation :risk])}
    {:name :generate   :operation (data/generate :from-domain domain-model :count 100)}
    {:name :prototype  :operation (w/prototype "Analysis Portal" :from-domain domain-model)}
    {:name :review     :operation (o/human-approval :reviewers [:analyst-team])}
    {:name :report     :operation (e/compose "Executive Summary" :from-analysis analysis)}])
```

### Circuit breakers on all external calls

Every call to an external service should be wrapped in a circuit breaker.
The exact parameters vary by service criticality and expected reliability,
but the pattern is universal.

```clojure
;; Template: external service call with circuit breaker
(o/circuit-breaker service-name
  :protect    (retry service-call :attempts 3 :backoff :exponential)
  :open-when  {:error-rate 0.5 :window-size 20 :min-calls 10}
  :reset-after (seconds 30)
  :fallback   (ward :protect nil :recover {open? graceful-degradation}))
```

---

## Grimoire metadata

```clojure
{:grimoire    "orchestrate"
 :namespace   "o/"
 :version     "2.1.0"
 :description "Workflow definition, coordination patterns, event-driven and
               scheduled triggering, dynamic fan-out, error recovery, and
               observability for complex multi-service operations"

 :constructs {
   :definition  [o/define-workflow o/execute-workflow o/workflow-status]
   :patterns    [o/scatter-gather o/fan-out o/human-approval o/circuit-breaker]
   :triggers    [o/schedule o/react]
   :operations  [o/replay o/audit-trail]}

 :best-for [
   "Multi-service workflows with saga compensation"
   "Human-in-the-loop approval processes with audit trails"
   "Long-running processes with checkpointing and resumption"
   "Scheduled recurring workflows with overlap management"
   "Event-driven workflows triggered by messages, webhooks, and state changes"
   "Bulk processing: fan-out over large collections with concurrency control"
   "Circuit-breaker protection of external dependencies"
   "Failure recovery and replay from specific workflow stages"
   "Sub-workflow composition and cross-grimoire workflow coordination"]

 :works-with [:core :domain :data :web :semantics :eloquence]

 :key-concepts [
   {:term "Saga"
    :definition "A pattern for distributed transactions that uses compensating
                 operations to undo prior stages when a later stage fails.
                 Maintains consistency without requiring distributed locks."}
   {:term "Circuit breaker"
    :definition "A protection mechanism that detects systematic failures in
                 a downstream dependency and fails fast to prevent cascading
                 collapse across the system."}
   {:term "Compensation"
    :definition "An operation that semantically undoes the effect of a
                 prior stage. Not always a perfect inverse — a refund
                 compensates a charge; a cancellation notice compensates
                 a confirmation email."}
   {:term "Checkpoint"
    :definition "A persisted snapshot of workflow state at a specific stage.
                 Enables resumption from a known point after failure."}
   {:term "Idempotency key"
    :definition "A unique identifier for a logical workflow instance that
                 prevents duplicate execution when the same workflow is
                 triggered multiple times."}
   {:term "Human-in-the-loop"
    :definition "A structured pattern for incorporating human judgment
                 into automated workflows, with defined timeouts,
                 escalation paths, and audit trails."}
   {:term "Event-driven triggering"
    :definition "Starting a workflow in response to an event — a message,
                 webhook, or state change — rather than a clock or a direct
                 call. Requires handling duplicate delivery, ordering, and
                 backpressure, which are properties of the event stream."}
   {:term "Fan-out"
    :definition "Running one operation once per item across a runtime-sized
                 collection, with explicit concurrency control. The map-reduce
                 pattern for workflows; distinct from scatter-gather's fixed,
                 named set of workers."}]}
```

---

## Implementation notes for LLM processors

### Stage dependency resolution

When stages declare `:requires [:prior-stage]`, execute them only after all
required stages complete. Stages without explicit dependencies can run in
parallel when they share no state mutations. Make parallelism opportunities
visible in the workflow documentation even if the orchestration runtime
determines actual scheduling.

### Compensation ordering

Compensation always runs in reverse stage order. If stages A, B, C completed
and D failed, compensate C, then B, then A. Never skip a compensation because
it seems unnecessary — the compensation handler was declared because the stage
has side effects, and those effects must be reversed.

### Idempotency enforcement

When `:idempotency-key` is specified and a workflow instance with that key
already exists:
- If the prior instance is **running**: return its execution handle; do not
  start a new instance
- If the prior instance **succeeded**: return its result immediately; do not
  re-execute
- If the prior instance **failed**: start a new instance (the failure may
  be retryable; the practitioner can control this with the `:on-failure` strategy)

### Circuit breaker state transitions

The circuit breaker must track state persistently — not just in-process — to
function correctly under horizontal scaling. A circuit that opens in one
process instance must be open in all instances. Use a shared store (Redis,
database) for circuit breaker state.

### Human approval audit requirements

Every `o/human-approval` interaction must be permanently logged with:
- The reviewer's identity
- The timestamp of the decision
- The decision taken (approve/reject/escalate)
- Any notes or reasoning provided
- The data presented to the reviewer at decision time (for evidential completeness)

This record must be immutable once written and retained for the compliance
period applicable to the workflow's domain.

### Event reaction: dedup, ordering, and backpressure are mandatory reasoning

When processing `o/react`, never treat the event stream as clean. Assume
at-least-once delivery: if `:dedup` is specified, suppress events whose dedup
key has been seen within the window, and treat a workflow triggered by a
duplicate as a correctness bug, not a tolerable redundancy. Honour `:ordering`
strictly — `:per-key` means events sharing a key must process sequentially even
while different keys run concurrently; never reorder events for the same entity
for the sake of throughput. Under `:backpressure`, enforce the declared policy
when events outpace processing: `:buffer` bounds memory and must signal when the
buffer is filling; `:drop-oldest` is valid only for latest-wins state events;
`:reject` must propagate a slow-down signal to the source. An `o/react`
specification missing dedup or ordering on a stream that needs them should be
flagged, not silently accepted.

### Fan-out: bound concurrency and preserve the failure record

When processing `o/fan-out`, treat an unspecified or `:unbounded` `:concurrency`
over a large collection as a hazard and surface it — bounded concurrency is the
norm and the safe default posture. Apply the bound as a true ceiling on
simultaneous in-flight operations, not an average. Honour `:on-item-error`
precisely: `:collect` must continue the batch and return every failure in the
result (never discard a failure to make the summary look clean); `:halt` stops
on first failure; `:compensate` runs each completed item's compensation in
reverse before halting. With `:progress :checkpoint-every`, persist progress so
a mid-batch failure resumes near the checkpoint rather than restarting the whole
collection — and treat a long-running fan-out without checkpointing as a
liability worth noting.

### Sub-workflow composition

A workflow stage whose `:operation` is an `o/execute-workflow` call is a
sub-workflow invocation. Execute it as a nested instance with its own state,
compensation, and audit trail, and nest its history under the parent's
`o/audit-trail`. The parent's stage-level `:compensate` and `:on-failure` apply
at the seam between sub-workflows; the sub-workflow's own internal compensation
applies within it. Composition is recursive — a sub-workflow may itself compose
sub-workflows — and idempotency keys must remain distinct per instance across
the nesting.