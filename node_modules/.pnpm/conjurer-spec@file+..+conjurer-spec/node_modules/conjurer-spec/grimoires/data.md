# data.md — Conjurer Data Grimoire

The spellbook for information. Data is the substrate through which systems
know things — it is not merely storage but the epistemological foundation of
every system's understanding of its domain. The `data` grimoire provides a
complete vocabulary for the data lifecycle: generation, schema definition,
transformation, validation, profiling, provenance, and privacy.

---

## Philosophy

### Data as epistemological substrate

Systems know things through their data. A payment processor's understanding
of a customer's creditworthiness is exactly its data. A hospital's knowledge
of a patient's condition is its records. An e-commerce platform's belief about
available inventory is its database. This means that bad data is not merely
an inconvenience — it is a *false belief held by the system*. A system that
trusts malformed data acts on false beliefs, and its behaviour degrades
accordingly.

This framing has consequences. Data quality is not a hygiene concern — it is
an epistemic concern. Schema definitions are not bureaucratic artefacts — they
are *formal statements of what the system can know and how*. Transformation
pipelines are not mechanical processes — they are *reasoning chains* that
derive new knowledge from existing knowledge. Provenance is not metadata —
it is *the system's record of how it came to believe what it believes*.

The `data` grimoire is built around this epistemological model. Every construct
is designed to make the system's knowledge more accurate, more complete, more
traceable, and more honest about its limitations.

### Schema as contract and specification

A schema makes implicit structure explicit. Without a schema, every component
that touches a data record carries its own mental model of what fields exist,
what types they hold, and what values are valid. These mental models diverge.
With a schema, there is one specification, and components are validated against
it rather than against each developer's assumption.

Schemas serve multiple roles simultaneously: they document expectations for
humans, enable validation for systems, guide generation for tests, govern
transformation for pipelines, and drive test generation for quality assurance.
This multiplicity is not incidental — it is why schemas belong in `data` rather
than scattered across the other grimoires.

### Quality by construction, not inspection

The most expensive time to find a data quality problem is after it has
propagated through a pipeline, been persisted to storage, and informed a
downstream decision. The cheapest time is at the point of entry. `data`
constructs are designed around this principle: validate early, validate
often, make violations visible immediately, and never pass bad data to the
next stage.

This principle also drives the test generation approach: schemas carry enough
information to generate comprehensive tests automatically. Manual test writing
for standard validation scenarios is a waste of effort that `data/generate-tests`
eliminates.

### Five design principles

**Schema as contract** — Schemas are first-class artefacts that drive the
entire data lifecycle. Where traditional approaches leave schema implicit in
code, Conjurer makes it explicit and reusable.

**Declarative transformation** — Specify desired outcomes, not procedural steps.
Describe what transformed data should look like; the system determines how.

**Quality by construction** — Build quality into the lifecycle from the start.
Generate data that satisfies constraints by design. Validate during
transformation to catch issues before propagation.

**Locale and cultural awareness** — Data has cultural context. National ID
schemes and their checksums, postal-code structures, IBAN formats, phone
formats, and name-frequency distributions differ by locale — the grimoire
treats locale as a first-class generation and validation parameter rather than
assuming one region's conventions are universal.

**Lineage and provenance** — Data's history matters. Where did it come from?
What transformations were applied? What was masked and why? These questions
must be answerable.

---

## Naming rationale

**`data/`** — The namespace prefix. Short and unambiguous.

**Schema** — From Greek *skhēma*, "form, shape." A schema gives data its form.

**Synthetic** — From Greek *synthetikos*, "skilled in putting together."
Synthetic data assembles realistic structure without containing real sensitive
information.

**Pipeline** — Operations connected in sequence, each receiving the previous
stage's output. Data flows through the pipeline as water through pipes.

**Lineage** — The data's ancestry: where it came from, how it was transformed,
what decisions it informed. Lineage makes provenance traceable.

**Profile** — As in a profile of a person: a characterisation of essential
features. A data profile describes a dataset's shape — its distributions,
ranges, and irregularities — without judging it against a standard.

**Mask** — To cover what should not be seen while leaving the form visible. A
masked dataset keeps its structure and statistics; only the identifying content
is hidden behind substitutes.

**Reconcile** — From the accounting tradition: to bring two records of what
should be the same thing into agreement, accounting for every difference. Data
reconciliation asks whether two datasets that ought to match in fact do.

**Expect** — A statement of what the data *ought* to look like in aggregate,
asserted and checked. Borrowed from the expectation-testing tradition in data
engineering: not "is this record valid" but "does this dataset meet expectation."

**Contract** — A binding agreement between a data producer and its consumers.
The term is literal: a contract states obligations, names the parties, and
specifies what happens when it is breached.

---

## Part I: Generation and synthesis

Realistic data is essential for development, testing, demonstration, and
privacy-preserving analytics. Generation functions manifest datasets that
match production statistical characteristics without containing sensitive
information.

---

### `data/schema`

Defines a formal schema for an entity type — the canonical specification of
what the data is, what it must contain, what constraints it must satisfy, and
what it means.

#### Signature

```clojure
(data/schema entity-name
  :fields       {field-name field-spec ...}
  :required     [field ...]
  :unique       [:field | [:field-a :field-b] ...]
  :indexes      [{:fields [...] :type :btree | :hash | :fulltext} ...]
  :constraints  [{:rule expression :message string :severity :error | :warning} ...]
  :relationships [{:field :target-entity :type :one-to-many | :many-to-one | :many-to-many
                   :cascade :delete | :preserve | :nullify} ...]
  :compliance   [:gdpr :hipaa :pci-dss ...]
  :phi-fields   [:field ...]
  :pci-fields   [:field ...]
  :immutable    [:field ...]
  :output       :edn | :json-schema | :sql-ddl | :graphql-schema | :openapi
  :manifest     schema-binding)
```

#### Parameters

**`entity-name`** — The entity type being defined. Used as the root identifier
throughout the data lifecycle.

**`:fields`** — Map of field names to specifications. Field specs combine type,
format, constraints, and semantic markers:
- Type: `:uuid`, `:string`, `:integer`, `:decimal`, `:boolean`, `:date`,
  `:timestamp`, `:array`, `:map`, `:enum`
- Format: `:email`, `:phone`, `:postal-code`, `:national-id`, `:iban`,
  `:iso-4217`, `:iso-3166`, `:url` (locale-sensitive formats such as
  `:postal-code`, `:national-id`, and `:phone` resolve against the active
  `:locale`)
- Constraints: `:min`, `:max`, `:min-length`, `:max-length`, `:pattern`,
  `:unique`, `:optional`, `:immutable`
- Semantics: `:phi true`, `:pci true`, `:encrypted true`, `:generated true`

**`:compliance`** — Compliance frameworks that apply to this entity. Named
frameworks activate implied behaviours: `:gdpr` marks PHI fields and adds
right-to-erasure support; `:hipaa` adds audit-logging requirements; `:pci-dss`
marks cardholder data fields for encryption.

**`:phi-fields`** — Fields containing protected health information. Triggers
HIPAA-appropriate handling regardless of whether `:hipaa` is in `:compliance`.

**`:immutable`** — Fields that must never change after initial creation.
`:created-at`, `:id`, and audit fields are common candidates.

#### Design rationale

`data/schema` is the grimoire's flagship because every other construct depends
on it. Generation needs a schema to know what to produce; validation needs one
to know what is valid; test generation reads one to know what to test;
conversion consults one to preserve types. The schema is the single artefact
from which the rest of the data lifecycle is derived, and its design reflects
three commitments.

First, **a schema is a specification of knowledge, not a description of
storage**. The fields are not columns-in-waiting; they are claims about what
the system can know and under what conditions. A `:required` field is an
assertion that the system cannot meaningfully reason about this entity without
that knowledge. A `:constraint` is an invariant the system's beliefs must
satisfy to remain coherent. This is why constraints carry `:message` and
`:severity` — a violated constraint is a false belief, and the schema must say
how serious that falsehood is.

Second, **compliance is structural, not bolted on**. The `:compliance`,
`:phi-fields`, and `:pci-fields` parameters make regulatory obligations part of
the schema rather than scattered through application code. When a field is
marked `:phi true`, every construct that touches it — generation, masking,
validation, lineage — inherits the obligation to handle it appropriately. The
schema is where "this data is regulated" is stated once and honoured everywhere.

Third, **one schema, many manifestations**. The `:output` parameter renders the
same specification as EDN, JSON Schema, SQL DDL, GraphQL, or OpenAPI. This is
the practical payoff of treating schema as a first-class artefact: the team
maintains one source of truth and projects it into whatever form each consumer
needs, rather than hand-maintaining five drifting copies.

#### Example 1: Order schema with compliance

```clojure
(data/schema :order
  :fields {
    :order-id     {:type :uuid :generated true :immutable true}
    :customer-id  {:type :uuid :references :customer}
    :placed-at    {:type :timestamp :default :now :immutable true}
    :items        {:type :array :element-type :order-item :min-length 1}
    :subtotal     {:type :decimal :precision 2 :min 0}
    :vat-amount   {:type :decimal :precision 2 :min 0}
    :total        {:type :decimal :precision 2 :min 0}
    :currency     {:type :string :format :iso-4217 :default "USD"}
    :status       {:type :enum
                   :values [:cart :submitted :confirmed :shipped :delivered
                            :cancelled :refunded]
                   :default :cart}
    :payment-method {:type :enum
                     :values [:credit-card :debit-card :bank-transfer :paypal]
                     :required-when (fn [o] (#{:confirmed :shipped :delivered} (:status o)))}
    :tracking-number {:type :string :optional true
                      :pattern "^[A-Z]{2}[0-9]{9}[A-Z]{2}$"
                      :required-when (fn [o] (= :shipped (:status o)))}}

  :required  [:order-id :customer-id :placed-at :items :total :status]
  :unique    [:order-id]
  :indexes   [{:fields [:customer-id] :type :btree}
              {:fields [:placed-at]   :type :btree}
              {:fields [:status]      :type :hash}]

  :constraints [
    {:rule    (fn [o] (= (:total o) (+ (:subtotal o) (:vat-amount o))))
     :message "total must equal subtotal + vat-amount"
     :severity :error}
    {:rule    (fn [o] (>= (:subtotal o) 0))
     :message "subtotal must be non-negative"
     :severity :error}]

  :relationships [
    {:field :customer-id :target :customer :type :many-to-one :cascade :preserve}
    {:field :items       :target :order-item :type :one-to-many :cascade :delete}]

  :compliance [:gdpr]
  :output :edn
  :manifest order-schema)
;; ✓ :payment-method and :tracking-number use :required-when rather than a flat
;;   :required — a field's obligation depends on the order's lifecycle state. A
;;   cart needs no payment method; a shipped order does. The schema encodes the
;;   state-dependence rather than forcing every order through one rigid shape.
;; ✓ The total = subtotal + vat constraint is :severity :error: a violated sum
;;   is not a warning, it is a false belief about money that must block the record.
```

#### Example 2: Patient schema with HIPAA compliance

```clojure
(data/schema :patient
  :fields {
    :patient-id  {:type :uuid :generated true :immutable true}
    :mrn         {:type :string :pattern "^MRN[0-9]{10}$" :unique true :phi true}
    :first-name  {:type :string :min-length 1 :max-length 100 :phi true}
    :last-name   {:type :string :min-length 1 :max-length 100 :phi true}
    :dob         {:type :date :min "1900-01-01" :max :today :phi true :immutable true}
    :ssn         {:type :string :pattern "^[0-9]{3}-[0-9]{2}-[0-9]{4}$"
                  :encrypted true :phi true}
    :gender      {:type :enum :values [:male :female :other :unknown]}
    :email       {:type :email :optional true :phi true}
    :phone       {:type :phone :optional true :phi true}
    :consent-given {:type :boolean :required true}
    :created-at  {:type :timestamp :default :now :immutable true}
    :updated-at  {:type :timestamp :default :now :auto-update true}}

  :required  [:patient-id :mrn :first-name :last-name :dob :gender :consent-given]
  :unique    [:patient-id :mrn :ssn]
  :phi-fields [:first-name :last-name :dob :ssn :email :phone :mrn]

  :constraints [
    {:rule    (fn [p] (or (:email p) (:phone p)))
     :message "At least one contact method (email or phone) is required"
     :severity :error}]

  :compliance [:hipaa :hitech]
  :manifest patient-schema

  ;; HIPAA compliance activates automatically:
  ;; ✓ Audit logging on every phi-field access or mutation
  ;; ✓ Encryption required for ssn, dob, email, phone at rest
  ;; ✓ Retention policy: 7 years after last encounter
  ;; ✓ Access control: minimum-necessary standard enforced
  )
```

---

### `data/generate`

Manifests complete, realistic datasets based on a schema. Generates synthetic
data that respects constraints, maintains referential integrity, and exhibits
statistically realistic distributions.

#### Signature

```clojure
(data/generate entity-type
  :count         n
  :schema        schema-definition
  :locale        :nl | :en | :de | :fr | :es | ...
  :quality       :basic | :realistic | :production
  :constraints   [{:field :rule} ...]
  :relationships {:field {:references parent-dataset :distribution :distribution-type}}
  :distributions {:field :normal | :uniform | :zipf | :pareto | :log-normal | :poisson}
  :anomalies     {:rate 0.02 :types [:missing-required :out-of-range :wrong-type]}
  :seed          n
  :output        :edn | :json | :csv | :sql
  :manifest      dataset-binding)
```

#### Parameters

**`:quality`** — Realism level:
- `:basic` — structurally valid but generic; fast generation
- `:realistic` — varied distributions, culturally appropriate values, realistic
  correlations (older customers have longer tenure; VIP customers have more
  orders)
- `:production` — statistically indistinguishable from real production data;
  includes rare edge cases, outliers, and complex cross-field correlations

**`:anomalies`** — Intentionally inject known-bad data at a specified rate,
for testing validation and error handling. `:types` specifies what kinds of
anomalies to introduce: missing required fields, values outside valid ranges,
wrong types, duplicate unique keys.

**`:locale`** — Activates locale-specific generation. Generated identifiers,
addresses, names, and phone numbers conform to the conventions and validation
rules of the chosen locale, so that locale-specific format checks (national
ID checksums, postal-code patterns, phone formats, IBAN check digits) pass
against the generated data rather than failing it.

#### Design rationale

The purpose of `data/generate` is to produce data the system can hold *false
beliefs about safely* — realistic enough to exercise every code path, but
containing no real person's information. Two design commitments follow.

First, **realism is a spectrum, chosen deliberately**. The `:quality` parameter
exists because the right level of realism depends on the job. A unit test needs
only structural validity (`:basic`); a demo needs values that read as plausible
(`:realistic`); a load test or an analytics-pipeline rehearsal needs the
statistical pathologies of real data — the heavy tails, the rare edge cases,
the cross-field correlations — that naive generators smooth away (`:production`).
Generating production-grade realism when basic suffices is waste; generating
basic data to test a system that will meet heavy-tailed reality is negligence.

Second, **locale is a feature, not decoration**. Real systems serve real
populations, and those populations have national ID schemes with checksums,
postal codes with structure, phone numbers with formats, and name distributions
that are not uniform. A generator that ignores this produces data that passes
nothing but the loosest validation. By making `:locale` first-class, the
construct generates data that exercises the locale-specific validation the
system will actually run — a Dutch BSN that passes the eleven-proof check, a
German Steuernummer in valid form — so the test is a real test.

Generation is also the foundation of privacy-preserving work: `data/mask` with
`:synthetic-substitute` leans on the same machinery to replace real values with
generated ones that preserve distribution and format without preserving identity.

#### Example 1: Locale-aware customers with realistic distributions

```clojure
(data/generate :customer
  :count  500
  :locale :nl                 ;; any supported locale; see locale-aware generation
  :quality :realistic
  :schema {
    :id           {:type :uuid}
    :national-id  {:type :string :format :locale-national-id :unique true}
    :first-name   :string
    :last-name    :string
    :email        {:type :email :unique true}
    :phone        {:type :phone :format :locale-mobile}
    :postal-code  {:type :string :format :locale-postal-code}
    :city         :string
    :dob          {:type :date :min "1940-01-01" :max "2005-12-31"}
    :since        {:type :date :min "2018-01-01" :max "2025-11-01"}
    :order-count  :integer
    :ltv          {:type :decimal :precision 2}}
  :constraints [
    {:field :since :after :dob}
    {:field :ltv   :min 0}]
  :distributions {
    :order-count :zipf       ;; Few heavy buyers, many light buyers
    :ltv         :pareto}    ;; 80/20 — few customers drive most revenue
  :seed 42
  :output :edn
  :manifest sample-customers)

;; ✓ Locale-specific formats validate: the national ID passes its checksum,
;;   postal codes and mobile numbers match the locale's pattern, names are drawn
;;   from the locale's actual frequency distribution
;; ✓ :since is always after :dob (a customer cannot register before being born)
;; ✓ order-count and ltv follow realistic heavy-tail distributions, not uniform
;;   noise — the generated data has the same shape as production, so a query
;;   tuned against it behaves the same against real data
;; ✓ :seed 42 makes the whole dataset reproducible across runs
```

#### Example 2: Relational generation with referential integrity

```clojure
(def customers (data/generate :customer :count 100 :locale :nl :schema customer-schema :seed 42
                              :manifest customers))

(data/generate :order
  :count  500
  :schema order-schema
  :relationships {
    :customer-id {:references customers :field :id :distribution :zipf}}
  :distributions {:total :log-normal :item-count :poisson}
  :constraints   [{:field :placed-at :after-referenced-field [:customer-id :since]}]
  :seed 43
  :output :edn
  :manifest sample-orders)

;; ✓ Every :customer-id references an actual generated customer
;; ✓ :placed-at is always after the referenced customer's :since date
;;   (an order cannot precede the customer's registration)
;; ✓ :distribution :zipf — some customers have many orders, most have few,
;;   matching how order volume actually concentrates in real populations
```

#### Example 3: Anomaly injection for validation testing

```clojure
(data/generate :customer
  :count    1000
  :schema   customer-schema
  :quality  :realistic
  :anomalies {:rate 0.05    ;; 5% of records contain anomalies
              :types [:missing-required :out-of-range :duplicate-unique]}
  :seed 99
  :output :edn
  :manifest customers-with-defects)

;; Returns 1000 records, ~50 of which contain intentional defects:
;; - Some records missing a required field
;; - Some records with :dob in the future
;; - Some records with duplicate values in a :unique field
;;
;; ✓ Ideal for testing that validation pipelines catch all defect types.
;;   The defect rate and types are controlled and reproducible — exactly
;;   rate × count records carry defects, only of the requested types, in
;;   positions fixed by :seed. A test can assert the validator found all 50.
```

---

## Part II: Transformation and conversion

Data rarely arrives in the exact form needed. Transformation functions reshape
data declaratively while maintaining semantic integrity.

---

### `data/transform`

Applies a declarative sequence of operations to data, reshaping structure,
filtering records, enriching fields, and aggregating values.

#### Signature

```clojure
(data/transform source
  :operations    [operation ...]
  :streaming     boolean
  :batch-size    n
  :error-handling :skip | :stop | :collect | :dead-letter
  :output        :edn | :json | :csv
  :manifest      result-binding)
```

#### Operation vocabulary

```clojure
;; Filtering
{:op :filter        :predicate (fn [r] (> (:age r) 18))}
{:op :reject        :predicate (fn [r] (nil? (:email r)))}

;; Field mapping
{:op :rename        :from :first_name :to :first-name}
{:op :map-field     :field :email :fn clojure.string/lower-case}
{:op :map           :fn (fn [r] (assoc r :full-name (str (:first-name r) " " (:last-name r))))}
{:op :drop-fields   :fields [:internal-id :legacy-code]}
{:op :keep-fields   :fields [:id :email :name]}

;; Enrichment
{:op :enrich        :field :geocoded :from (fn [r] (geocode (:address r)))}
{:op :join          :with other-dataset :on :id :type :left}
{:op :lookup        :field :customer-tier :in tier-table :key :customer-id}

;; Aggregation
{:op :group-by      :field :category}
{:op :aggregate     :measures {:count :count :total {:field :amount :fn :sum}}}
{:op :window        :type :tumbling | :sliding :size duration}

;; Sorting and deduplication
{:op :sort-by       :field :created-at :direction :desc}
{:op :deduplicate   :on [:email]}
{:op :limit         :n 1000}

;; Derived fields
{:op :derive        :field :age :from :dob :using :years-since}
{:op :coerce        :field :amount :to :decimal :precision 2}
{:op :normalise     :field :status :mapping {:ACTIVE :active :INACTIVE :inactive}}
```

#### Example: Customer enrichment pipeline

```clojure
(~> "customers-raw.csv"
  (data/transform
    :operations [
      {:op :parse      :format :csv :header true}
      {:op :filter     :predicate (fn [r] (seq (:email r)))}
      {:op :map-field  :field :email :fn clojure.string/lower-case}
      {:op :deduplicate :on [:email]}
      {:op :coerce     :field :age :to :integer}
      {:op :reject     :predicate (fn [r] (< (:age r) 18))}]
    :streaming true :batch-size 5000)

  (data/transform
    :operations [
      {:op :enrich :field :risk-band
       :from (fn [r] (classify-risk (:credit-score r)))}
      {:op :derive :field :segment
       :from [:total-orders :ltv]
       :using (fn [r] (cond (> (:ltv r) 5000) :vip
                            (> (:ltv r) 1000) :gold
                            :else :standard))}])

  (data/validate :against customer-schema :on-failure :collect))
```

---

### `data/convert-format`

Translates data between formats while preserving semantic meaning. Handles
format-specific nuances intelligently.

#### Signature

```clojure
(data/convert-format source
  :from     :csv | :json | :xml | :excel | :parquet | :avro | :ndjson
  :to       :csv | :json | :xml | :excel | :parquet | :avro | :ndjson
  :schema   schema-definition
  :preserve [:precision :types :structure :metadata]
  :options  {:format-specific-options}
  :validate-output boolean
  :output   :edn | {:type :file :path "path"}
  :manifest result-binding)
```

#### Design rationale

Format conversion hides complexity. CSV lacks a date standard; JSON loses
decimal precision with floats; XML encodes hierarchy differently than JSON;
Excel has complex type systems with formula evaluation. Naive conversion loses
information or introduces errors.

The `:schema` parameter provides semantic guidance — a field marked as
`:decimal :precision 2` will be written to Parquet as `DECIMAL(38,2)`, not
as a float. A `:timestamp` field will use ISO-8601 in JSON, epoch milliseconds
in Parquet, and locale-appropriate strings in Excel. The schema makes these
translation decisions consistent and explicit.

#### Example: CSV to Parquet with precision preservation

```clojure
(data/convert-format "transactions.csv"
  :from :csv
  :to   :parquet
  :schema {
    :id        :uuid
    :amount    {:type :decimal :precision 2}   ;; Must not become float
    :timestamp {:type :timestamp :format :iso-8601}
    :currency  {:type :string :format :iso-4217}}
  :preserve [:precision :types]
  :options  {:parquet {:compression :snappy :row-group-size 100000}}
  :validate-output true
  :output   {:type :file :path "transactions.parquet"})

;; :amount is stored as DECIMAL(38,2) in Parquet — no precision loss
;; :timestamp preserves microsecond precision
;; :currency is stored as FIXED_LEN_BYTE_ARRAY(3)
```

---

### `data/pipeline`

Constructs named, multi-stage data processing pipelines with explicit error
handling, monitoring, and checkpointing.

#### Signature

```clojure
(data/pipeline name
  :source       source-specification
  :stages       [stage-definition ...]
  :error-handling {:strategy :stop | :dead-letter | :retry
                   :dead-letter-destination destination}
  :monitoring   {:metrics boolean :logging :level :alerts [alert-spec ...]}
  :checkpointing {:enabled boolean :interval n :storage destination}
  :output       output-specification
  :manifest     result-binding)
```

#### Design rationale

Pipelines decompose complex data workflows into testable, observable stages.
Each stage has clear input and output contracts. Independent stages can run
in parallel. Failures at any stage are handled according to a declared
strategy rather than propagating silently.

The `:checkpointing` parameter is critical for long-running pipelines over
large datasets. If a pipeline processing five million records fails at record
4.8 million, checkpointing allows resuming from the last checkpoint rather
than reprocessing everything from the start.

#### Example: Production ETL with comprehensive resilience

```clojure
(data/pipeline "customer-etl"
  :source {:type :database
           :query "SELECT * FROM raw_customers WHERE processed_at IS NULL"
           :batch-size 10000}

  :stages [
    {:name :validate-and-clean
     :fn   (~> stage-input
             (data/validate :against raw-customer-schema :on-failure :collect)
             (data/transform :operations [
               {:op :filter     :predicate (fn [r] (seq (:email r)))}
               {:op :map-field  :field :email :fn clojure.string/lower-case}
               {:op :deduplicate :on [:email]}]))}

    {:name :enrich
     :fn   (parallel enrichment-ops
             :operations [
               (data/transform stage-input
                 :operations [{:op :enrich :field :geocoded :from geocode-api}]
                 :error-handling :skip)
               (data/transform stage-input
                 :operations [{:op :enrich :field :credit :from credit-api}]
                 :error-handling :skip)]
             :combine-results :merge
             :on-error :best-effort)}

    {:name :apply-business-rules
     :fn   (data/transform stage-input
             :operations [
               {:op :derive :field :tier :from [:ltv :order-count]
                :using (fn [r] (cond (> (:ltv r) 10000) :platinum
                                     (> (:ltv r) 5000)  :gold
                                     :else :standard))}])}

    {:name :load
     :fn   (retry db-load
             :operation (fn [records]
                          (batch-upsert target-db :customers records))
             :attempts 3 :backoff :exponential
             :retry-on [connection-error? deadlock?])}]

  :error-handling {:strategy :dead-letter
                   :dead-letter-destination {:type :database :table "etl_errors"}}

  :monitoring {:metrics true
               :logging :info
               :alerts  [{:condition (fn [m] (< (:success-rate m) 0.90))
                          :action    :page-on-call}]}

  :checkpointing {:enabled true :interval 5000}

  :output {:type :database :table :customers :on-conflict :update})
```

---

## Part III: Validation and quality

---

### `data/validate`

Validates data against a schema, collecting violations and returning a
structured quality report.

#### Signature

```clojure
(data/validate data
  :against    schema
  :on-failure :stop | :collect | :warn
  :include    [:schema-violations :constraint-violations :referential-integrity]
  :sample-invalid n
  :output     :validation-report
  :manifest   validation-binding)
```

#### Parameters

**`:on-failure`** — `:stop` halts on first violation. `:collect` gathers all
violations before returning. `:warn` logs violations but returns the data
anyway, for non-critical paths.

**`:sample-invalid`** — Include up to `n` example invalid records in the
report, with specific violation details. Essential for diagnosing systematic
data quality issues.

#### Design rationale

`data/validate` is where the grimoire's epistemic stance becomes operational:
to validate is to ask whether the system's incoming beliefs are coherent before
it acts on them. The construct's design turns on a single decision — what to do
when a belief is false — which is why `:on-failure` is its most consequential
parameter rather than an afterthought.

The three modes encode three different relationships to risk. `:stop` is for
pipelines where one bad record means the whole batch is suspect — financial
postings, regulatory submissions — and proceeding past a violation would
compound the error. `:collect` is for triage: gather every violation so the
operator sees the full shape of the problem rather than fixing one error only to
hit the next on re-run. `:warn` is for paths where imperfect data is better than
no data and the violation is a signal to investigate, not a reason to halt.

The construct is also built to *explain*, not merely to reject. `:sample-invalid`
and the `:recommendations` in the report exist because "153 records failed" is
not actionable, whereas "89 amounts are strings with a currency symbol — strip
it before coercion" is a fix. A validator that says only yes-or-no forces the
operator to re-derive what the validator already knew. The grimoire's validator
hands that knowledge over.

#### Example

```clojure
(data/validate imported-orders
  :against    order-schema
  :on-failure :collect
  :sample-invalid 10
  :output :validation-report
  :manifest order-validation)

;; Returns:
{:status           :partial-pass
 :total            10000
 :valid            9847
 :invalid          153
 :violations {
   :missing-required   [{:field :total :count 12}]
   :type-mismatch      [{:field :amount :expected :decimal :found :string :count 89}]
   :constraint-failure [{:rule "total = subtotal + vat" :count 52}]}
 :sample-invalid [
   {:record  {:order-id "..." :amount "$127.50" :total nil}
    :violations ["amount: expected decimal, found string"
                 "total: required field is nil"]}]
 :recommendations [
   "The 89 string amounts carry a currency symbol — strip '$' before coercion"
   "The 52 total mismatches are clustered on orders from supplier-id 'SUP-009'"]}
;; ✓ The report does not stop at counts. Each violation class names the field,
;;   the expected and found types, and the count; the recommendations turn the
;;   diagnosis into a fix and even localise the constraint failures to one
;;   supplier — the operator leaves knowing what to do, not just that something broke.
```

---

### `data/profile`

Generates a statistical profile of a dataset — distributions, cardinalities,
null rates, value ranges, and quality indicators — without modifying the data.

#### Signature

```clojure
(data/profile dataset
  :fields       [field ...] | :all
  :statistics   [:distribution :cardinality :nulls :ranges :patterns :outliers]
  :sample-size  n | :full
  :compare-to   baseline-profile
  :output       :profile-report
  :manifest     profile-binding)
```

#### Design rationale

Validation answers "does this data satisfy its schema?" Profiling answers "what
does this data actually look like?" These are different questions. A dataset
can be valid (every record satisfies the schema) but anomalous (a field that
is usually populated is suddenly 80% null; a value that usually appears in
one category has shifted to another). Profiling detects these drifts.

The `:compare-to` parameter enables drift detection: compare today's profile
against yesterday's baseline and surface what has changed. This is essential
for monitoring production data pipelines.

#### Example

```clojure
(data/profile customer-dataset
  :statistics  [:distribution :cardinality :nulls :outliers]
  :sample-size :full
  :compare-to  baseline-profile-yesterday)

;; Returns:
{:dataset    "customers"
 :records    487302
 :profiled-at "2025-11-03T08:00:00Z"

 :fields {
   :status {
     :cardinality 5
     :distribution {:active 0.78 :inactive 0.14 :pending 0.07 :suspended 0.01}
     :drift {:vs-baseline "pending increased 0.03 → 0.07"
             :severity :warning}}

   :email {
     :null-rate   0.002
     :unique-rate 0.999
     :patterns    {:format-valid 0.998 :format-invalid 0.002}
     :drift       :none}

   :ltv {
     :min     0.0
     :max     98450.0
     :mean    847.3
     :median  234.5
     :p95     3200.0
     :p99     12000.0
     :outliers [{:record-id "..." :value 98450.0 :z-score 4.2}]
     :drift   {:vs-baseline "mean increased 847 → 891" :severity :info}}}

 :overall-quality-score 0.94
 :drift-alerts [:pending-rate-increase]}
```

---

### `data/generate-tests`

Automatically generates comprehensive test suites from schemas, covering valid
cases, boundary conditions, error scenarios, and performance tests.

#### Signature

```clojure
(data/generate-tests schema
  :coverage      :minimal | :standard | :comprehensive | :exhaustive
  :include       [:valid-cases :boundary-cases :invalid-cases
                  :constraint-violations :performance-tests]
  :custom-cases  [test-case ...]
  :performance   {:generate {:count n :max-ms n}
                  :validate {:count n :max-ms n}}
  :output        :clojure-test | :junit | :pytest
  :manifest      test-suite)
```

#### Design rationale

Schemas encode enough information to generate most tests automatically:
required fields generate null tests; unique fields generate duplicate tests;
format constraints generate invalid-format tests; numeric ranges generate
boundary tests. Manual test writing for these standard scenarios is mechanical
work that belongs to the machine.

Custom cases fill the gap: complex multi-field interactions, domain-specific
edge cases, and integration scenarios that require human knowledge of the
domain.

#### Example

```clojure
(data/generate-tests customer-schema
  :coverage     :comprehensive
  :include      [:valid-cases :boundary-cases :invalid-cases :performance-tests]
  :custom-cases [
    {:name     "international-customer-no-national-id"
     :input    {:id (uuid) :email "user@example.com" :locale :other :national-id nil}
     :expected :valid
     :note     "National ID is not required for customers outside its issuing locale"}]
  :performance  {:generate {:count 1000 :max-ms 1000}
                 :validate {:count 10000 :max-ms 5000}}
  :output :clojure-test
  :manifest customer-test-suite)

;; Returns test suite with:
;; ✓ valid-customer-minimal (required fields only)
;; ✓ valid-customer-all-fields
;; ✓ boundary-age-minimum (age = 18)
;; ✓ boundary-age-maximum (age = 150)
;; ✓ boundary-age-below-min (age = 17, expected invalid)
;; ✓ boundary-balance-zero (0.00, valid)
;; ✓ boundary-balance-negative (-0.01, invalid)
;; ✓ invalid-missing-email
;; ✓ invalid-national-id-fails-checksum
;; ✓ invalid-postal-code-malformed
;; ✓ constraint-violation-no-contact-method
;; ✓ performance-generate-1000-records (<1000ms)
;; ✓ custom-international-customer-no-national-id
;; → 94 tests total, covering 100% of schema constraints
```

---

### `data/expect`

Asserts expectations about a dataset that go beyond what a schema can express —
statistical properties, cross-field relationships, distributional shape, and
comparisons to historical baselines. Where `data/validate` asks "is each record
well-formed?", `data/expect` asks "is this dataset, taken as a whole, behaving
the way it should?"

#### Signature

```clojure
(data/expect dataset
  :expectations [{:expect  expectation-keyword
                  :field   :field | :fields [...]
                  :params  {expectation-specific}
                  :severity :error | :warning | :info} ...]
  :baseline     prior-profile-or-dataset
  :on-failure   :stop | :collect | :warn
  :sample-failures n
  :output       :expectation-report
  :manifest     expectation-binding)
```

#### Expectation vocabulary

```clojure
;; Distributional
{:expect :value-distribution :field :status
 :params {:expected {:active 0.75 :inactive 0.20 :pending 0.05} :tolerance 0.05}}
{:expect :within-range :field :age :params {:min 18 :max 120}}
{:expect :mean-near :field :order-total :params {:value 84.50 :tolerance-pct 10}}

;; Volume and freshness
{:expect :row-count-near :params {:value :baseline :tolerance-pct 15}}
{:expect :not-empty}
{:expect :freshness :field :updated-at :params {:max-age-hours 24}}

;; Cross-field and cross-table
{:expect :field-relationship
 :params {:rule (fn [r] (<= (:discount r) (:subtotal r)))
          :description "discount never exceeds subtotal"}}
{:expect :aggregate-matches
 :params {:measure {:field :line-total :fn :sum}
          :equals  {:dataset orders :field :total :fn :sum}
          :tolerance 0.01
          :description "line items sum to the order total"}}
{:expect :referential :field :customer-id :params {:exists-in customers :on :id}}

;; Uniqueness and completeness
{:expect :unique :field :email}
{:expect :null-rate-below :field :phone :params {:threshold 0.10}}
```

#### Design rationale

A schema describes what a *record* must be; it cannot describe what a *dataset*
must be. "Every age is an integer between 0 and 120" is a schema constraint.
"The average order value should be within 10% of last month's, and roughly 75%
of customers should be active, and the line items should sum to the order total"
are statements about the dataset in aggregate — and they are exactly the
statements that catch the failures schemas miss. A pipeline can emit ten million
perfectly well-formed records that are collectively wrong: a join silently
dropped half the rows, an upstream bug flipped a sign, a currency was double-
converted. Every record passes `data/validate`; the dataset is garbage.

`data/expect` exists to make those aggregate claims first-class, testable
assertions. The design borrows the hard-won lesson of expectation frameworks in
modern data engineering: the most valuable data tests are not "is this a valid
email" but "does this dataset look like the datasets that came before it." That
is why `:baseline` is central — most expectations are most powerful when phrased
as continuity with history ("row count within 15% of yesterday") rather than as
absolute bounds someone has to guess and maintain.

The construct is deliberately distinct from `data/validate` rather than folded
into it, because the two answer different questions and fail for different
reasons. Schema validation failing means *a record is malformed* — fix the
record or reject it. An expectation failing means *something happened to the
dataset as a whole* — a pipeline bug, an upstream change, a bad deploy — and the
response is to investigate the process, not to clean the row. Keeping them
separate keeps the diagnosis clear.

#### Example 1: Catching a silently broken pipeline

```clojure
(data/expect daily-orders-export
  :expectations [
    {:expect :row-count-near :params {:value :baseline :tolerance-pct 15}
     :severity :error}
    {:expect :aggregate-matches
     :params {:measure {:field :line-total :fn :sum}
              :equals  {:dataset daily-orders-export :field :total :fn :sum}
              :tolerance 0.01
              :description "line items must sum to order totals"}
     :severity :error}
    {:expect :value-distribution :field :status
     :params {:expected {:confirmed 0.80 :cancelled 0.15 :refunded 0.05}
              :tolerance 0.05}
     :severity :warning}
    {:expect :freshness :field :exported-at :params {:max-age-hours 24}
     :severity :error}]
  :baseline   yesterdays-export
  :on-failure :collect
  :manifest   export-expectations)

;; Returns:
{:status :failed
 :passed 2
 :failed 2
 :results [
   {:expect :row-count-near :status :pass
    :detail "48,210 rows vs baseline 47,980 — within 15% tolerance"}
   {:expect :aggregate-matches :status :fail :severity :error
    :detail "Σ line-total = 4,012,884.50 but Σ total = 8,025,769.00 — off by 2×"
    :diagnosis "Order totals appear doubled relative to their line items;
                consistent 2× factor suggests a double-applied tax or merge"}
   {:expect :value-distribution :status :pass
    :detail "status distribution within tolerance of expected"}
   {:expect :freshness :status :fail :severity :error
    :detail "Newest :exported-at is 31h old; export job did not run last night"}]}
;; ✓ Every record in this export is schema-valid — data/validate would pass it.
;;   data/expect catches what validation cannot: the totals are internally
;;   inconsistent (a process bug) and the data is stale (a scheduling failure).
;;   The unit of failure is the dataset and the pipeline, not any single record.
```

#### Example 2: Expectations as a generation quality gate

```clojure
;; Verify that synthetic data is actually realistic before trusting a load test
(~> (data/generate :customer :count 100000 :quality :production :schema customer-schema)
  (data/expect
    :expectations [
      {:expect :value-distribution :field :order-count
       :params {:shape :zipf :description "order counts must be heavy-tailed, not uniform"}}
      {:expect :field-relationship
       :params {:rule (fn [r] (>= (:tenure-days r) 0))
                :description "tenure is never negative"}}
      {:expect :mean-near :field :ltv :params {:value 850 :tolerance-pct 20}}]
    :on-failure :stop))
;; ✓ Generation and expectation compose: generate production-grade data, then
;;   assert it has the statistical shape a load test needs before relying on it.
;;   A generator bug that produced uniform order-counts would fail here, before
;;   it could quietly invalidate the load test's conclusions.
```

#### Usage patterns

```clojure
;; Run as the last stage of every production pipeline — the dataset-level gate
;; that schema validation cannot provide
(~> raw-feed
  (data/transform :operations etl-ops)
  (data/validate  :against feed-schema :on-failure :collect)   ;; records well-formed?
  (data/expect    :expectations feed-expectations               ;; dataset sane?
                  :baseline last-good-run :on-failure :stop))
```

---

### `data/contract`

Defines a data contract: a formal, enforceable agreement between a data producer
and its consumers covering not just structure (the schema) but the guarantees a
consumer may depend on — freshness, completeness, distribution stability, and
the rules governing how the producer may change the data over time.

#### Signature

```clojure
(data/contract name
  :schema           schema-definition
  :producer         "team or system that owns and emits this data"
  :consumers        ["downstream systems that depend on it" ...]
  :guarantees       {:freshness     {:max-age duration}
                     :completeness  {:required-fields [...] :max-null-rate {field rate}}
                     :volume        {:min-rows n :expected-range [low high]}
                     :distribution  [expectation ...]}
  :sla              {:availability percentage :update-frequency duration}
  :schema-evolution :backward-compatible | :forward-compatible | :full | :none
  :on-breach        {:notify [consumer ...] :action :alert | :block | :quarantine}
  :version          "semver"
  :output           :contract-definition
  :manifest         contract-binding)
```

#### Parameters

**`:guarantees`** — The promises the producer makes about the data, expressed in
the same vocabulary as `data/expect`. These are not the producer's internal
hopes; they are the commitments a consumer is entitled to build on. A consumer
that reads data within its contracted guarantees should never be surprised.

**`:schema-evolution`** — The rule governing how the schema may change without
breaking the contract. This is the heart of the construct:
- `:backward-compatible` — the producer may add optional fields; it may not
  remove fields, narrow types, or add required fields (existing consumers keep working)
- `:forward-compatible` — consumers must tolerate unknown fields; the producer
  may evolve more freely (new consumers keep working against old data)
- `:full` — both must hold; the safest and most restrictive
- `:none` — any change is permitted; the contract guarantees only the current shape

**`:on-breach`** — What happens when the producer violates the contract — late
data, a forbidden schema change, a guarantee missed. `:alert` notifies the named
consumers; `:block` stops the data from propagating; `:quarantine` diverts it for
inspection. The breach policy is part of the agreement, decided in advance rather
than improvised during an incident.

#### Design rationale

The grimoire's founding metaphor is "schema as contract," and until now that has
been a metaphor: a schema describes structure, and structure is *part* of an
agreement, but a real contract between a data producer and its consumers promises
much more than shape. It promises the data will be *there* (availability), will
be *recent* (freshness), will be *complete* (no surprise nulls), will *keep its
shape* (distribution stability), and — most consequentially — that it will not
*change out from under the consumer* without warning (schema evolution rules).
`data/contract` turns the metaphor into the artefact it always implied.

The decisive commitment is `:schema-evolution`, because the most common way
data systems break is not bad records but a producer changing the data's shape
and silently breaking every consumer downstream. A team renames a field, drops
one they think is unused, or tightens a type — and three teams' pipelines fail
in production with no warning, because nothing ever stated which changes were
allowed. By making the evolution rule explicit and enforceable, the contract
converts a class of production incidents into a class of contract violations
caught at publish time. This is the same discipline that API versioning brought
to service interfaces, applied to data interfaces, which have long lacked it.

A contract composes the rest of the grimoire rather than replacing it. Its
`:schema` is a `data/schema`; its `:guarantees` are `data/expect` expectations;
enforcing it at runtime runs `data/validate` and `data/expect` against the
producer's output and applies `:on-breach`. The contract is the *agreement*; the
other constructs are how it is *kept*. This is why it lives in `data` and not in
`orchestrate` — it is a statement about what data means and what may be believed
about it, which is precisely this grimoire's concern.

#### Example 1: A contract for an upstream customer feed

```clojure
(data/contract "customer-master-feed"
  :schema    customer-schema
  :producer  "Customer Platform team"
  :consumers ["Marketing Analytics" "Billing" "Fraud Detection"]
  :guarantees {
    :freshness    {:max-age "PT2H"}              ;; never more than 2 hours stale
    :completeness {:required-fields [:id :email :status]
                   :max-null-rate {:phone 0.15 :address 0.20}}
    :volume       {:min-rows 100000 :expected-range [100000 500000]}
    :distribution [{:expect :value-distribution :field :status
                    :params {:expected {:active 0.78 :inactive 0.22} :tolerance 0.08}}]}
  :sla       {:availability 0.999 :update-frequency "PT1H"}
  :schema-evolution :backward-compatible
  :on-breach {:notify ["Marketing Analytics" "Billing" "Fraud Detection"]
              :action :quarantine}
  :version   "2.1.0"
  :output    :contract-definition
  :manifest  customer-feed-contract)

;; Returns a contract artefact that can be enforced at every publish:
{:contract "customer-master-feed"
 :version  "2.1.0"
 :producer "Customer Platform team"
 :consumers 3
 :enforcement {
   :on-publish [:validate-schema :check-guarantees :check-evolution-rule]
   :on-breach  :quarantine}
 :evolution-rule {
   :policy :backward-compatible
   :permitted   ["add optional field" "widen a type" "add enum value"]
   :forbidden   ["remove field" "add required field" "narrow a type"
                 "remove enum value" "rename field"]}}
;; ✓ The contract makes the consumers' dependencies explicit and the producer's
;;   freedoms bounded. The Customer Platform team can add an optional field
;;   without coordination; it cannot drop :email without breaking the contract —
;;   and the contract names exactly which three teams to notify if it tries.
```

#### Example 2: An evolution check catching a breaking change

```clojure
;; The producer proposes a new schema version; the contract checks it BEFORE publish
(data/contract "customer-master-feed"
  :check-evolution {:from customer-schema-v2 :to customer-schema-v3}
  :manifest evolution-check)

;; Returns:
{:contract "customer-master-feed"
 :evolution-policy :backward-compatible
 :verdict :breach
 :changes [
   {:change "added optional field :loyalty-tier" :verdict :permitted}
   {:change "removed field :fax" :verdict :breach
    :why "Removing a field breaks consumers that read it; :backward-compatible
          forbids removal even of a seemingly-unused field"}
   {:change "narrowed :status enum (dropped :pending)" :verdict :breach
    :why "Narrowing an enum can orphan existing values held by consumers"}]
 :affected-consumers ["Billing reads :fax for legacy invoicing"]
 :recommendation "Deprecate :fax with a sunset window rather than removing it;
                  add :pending back or coordinate a major version bump (3.0.0)"}
;; ✓ The breaking change is caught at design time, against the contract, naming
;;   the consumer that would have broken — instead of in production three teams
;;   later. This is the entire point of making schema evolution a contract term.
```

#### Usage patterns

```clojure
;; Enforce a contract as the gate on a producer's output
(~> producer-output
  (data/validate :against (:schema customer-feed-contract) :on-failure :collect)
  (data/expect   :expectations (:guarantees customer-feed-contract))
  (data/contract "customer-master-feed" :enforce true :on-breach :quarantine))

;; Generate a consumer-side compatibility test suite from the contract
(data/generate-tests (:schema customer-feed-contract)
  :coverage :comprehensive
  :include  [:valid-cases :boundary-cases])
```

---

## Part IV: Provenance and privacy

---

### `data/lineage`

Tracks how data flows and transforms through a pipeline, producing a
provenance record that makes the data's history inspectable and auditable.

#### Signature

```clojure
(data/lineage pipeline-or-transformation
  :track        [:transformations :enrichments :drops :schema-changes]
  :record-to    destination
  :include-samples boolean
  :output       :lineage-graph | :lineage-report
  :manifest     lineage-binding)
```

#### Design rationale

When a compliance officer asks "how did this customer's email address come to
be in this marketing database?" the answer must be traceable. When a data
analyst asks "why does this customer's segment differ from yesterday?" the
transformation chain must be inspectable. When an auditor asks "who touched
this patient record and what did they do to it?" the lineage must be complete.

`data/lineage` wraps a pipeline or transformation and produces an out-of-band
provenance record. Like `witness` in core, it observes without modifying. The
lineage record documents every transformation applied, every field enriched,
every record dropped and why, and every schema change encountered.

#### Example

```clojure
(data/lineage
  (~> raw-customer-import
    (data/transform :operations cleaning-ops)
    (data/transform :operations enrichment-ops)
    (data/validate  :against customer-schema))
  :track   [:transformations :enrichments :drops]
  :record-to lineage-store
  :include-samples true
  :manifest import-lineage)

;; Lineage record:
{:pipeline-run "run-2025-11-03-08:00"
 :stages [
   {:stage :cleaning
    :input-count  50000
    :output-count 48523
    :dropped      1477
    :drop-reasons {"empty-email" 1204 "duplicate-email" 273}
    :transformations ["email → lowercase" "whitespace-trimmed"]}
   {:stage :enrichment
    :enriched-fields [:geocoded :risk-band]
    :enrichment-failures {:geocoded 43 :risk-band 0}
    :samples [{:record-id "..." :before {...} :after {...}}]}
   {:stage :validation
    :violations-found 152
    :quarantined       152}]
 :total-duration-ms 8432}
```

---

### `data/mask`

Applies privacy-preserving transformations to data — anonymisation, pseudonymisation,
and redaction — while preserving the data's structural and statistical properties
for testing and analytics use.

#### Signature

```clojure
(data/mask dataset
  :strategy   :anonymise | :pseudonymise | :redact | :synthetic-substitute
  :fields     {field-name masking-rule ...}
  :preserve   [:distributions :referential-integrity :format-validity]
  :seed       n
  :reversible boolean
  :output     :masked-edn)
```

#### Parameters

**`:strategy`** — The masking approach:
- `:anonymise` — irreversible; information cannot be recovered
- `:pseudonymise` — reversible with a key; the same input always produces the
  same pseudonym, preserving referential integrity
- `:redact` — replace with a fixed sentinel (e.g. `"[REDACTED]"`)
- `:synthetic-substitute` — replace with a statistically similar synthetic
  value (name replaced with realistic fake name; postcode replaced with
  realistic fake postcode)

**`:preserve`** — What statistical properties to maintain:
- `:distributions` — synthetic substitutes follow the same distributions as
  originals
- `:referential-integrity` — a customer-id that appears in orders still
  appears in the masked customer dataset
- `:format-validity` — masked values still pass format validation (a masked
  BSN still passes the 11-proof check)

**`:reversible`** — When true (only valid with `:pseudonymise`), the system
records a key that allows de-pseudonymisation. The key must be stored and
managed separately from the masked data.

#### Example

```clojure
(data/mask production-customer-snapshot
  :strategy   :pseudonymise
  :fields     {
    :national-id {:rule :replace-with-valid-national-id :locale :nl}
    :first-name  {:rule :replace-with-realistic-name :locale :nl}
    :last-name   {:rule :replace-with-realistic-name :locale :nl}
    :email       {:rule :replace-with-valid-email}
    :phone       {:rule :replace-with-valid-mobile :locale :nl}
    :iban        {:rule :replace-with-valid-iban :locale :nl}
    :street      {:rule :replace-with-realistic-street :locale :nl}
    :postal-code {:rule :replace-format-preserving}}
  :preserve   [:distributions :referential-integrity :format-validity]
  :seed       42
  :reversible false
  :output     :masked-edn
  :manifest   masked-customers)

;; Returns dataset suitable for use in test/staging environments:
;; ✓ No real personal data — safe to share with developers
;; ✓ National IDs still pass their locale's checksum (a masked value is still
;;   a structurally valid value, so format validation behaves the same)
;; ✓ Emails are format-valid (but at non-real domains)
;; ✓ IBANs pass checksum validation
;; ✓ Distributions preserved — name frequency still follows the locale's
;;   actual name distribution, so analytics over masked data stay representative
;; ✓ Referential integrity maintained: a customer-id masked one way in the
;;   customer table is masked the same way in the orders table, because the
;;   same :seed maps each input to one stable pseudonym
```

---

### `data/reconcile`

Compares two datasets that should match — identifying records present in one
but absent in the other, field-level discrepancies, and systematic patterns
in the differences.

#### Signature

```clojure
(data/reconcile dataset-a dataset-b
  :on          :primary-key-field
  :compare     [:all-fields | field-list]
  :tolerance   {:field {:type :absolute | :relative :value n} ...}
  :identify    [:missing-in-a :missing-in-b :field-mismatches :duplicates]
  :output      :reconciliation-report
  :manifest    reconciliation-binding)
```

#### Design rationale

Reconciliation is a fundamental data quality operation that the original spec
did not address. It answers: "Does our database match the source of truth?"
"Did our migration transfer all records correctly?" "Does the report match
the underlying data?" These are common questions in finance, compliance, and
data migration — and they all require the same underlying operation: a
systematic, field-level comparison of two datasets that should agree.

#### Example

```clojure
(data/reconcile
  (query-db "SELECT * FROM customers")
  (read-file "customers-from-erp.csv")
  :on      :customer-id
  :compare [:email :address :credit-limit :status]
  :tolerance {:credit-limit {:type :absolute :value 0.01}}
  :identify  [:missing-in-a :missing-in-b :field-mismatches]
  :manifest  erp-reconciliation)

;; Returns:
{:status :discrepancies-found
 :total-in-a       48250
 :total-in-b       48319
 :matched          48231
 :missing-in-a        88  ;; in ERP but not in database
 :missing-in-b        19  ;; in database but not in ERP
 :field-mismatches   412

 :mismatch-detail {
   :email          {:count 12  :sample [{:id "..." :in-a "old@" :in-b "new@"}]}
   :credit-limit   {:count 380 :note "380 within 0.01 tolerance — ignored"
                    :exceeding-tolerance 32}
   :status         {:count 400
                    :pattern "All mismatches have status :active in DB, :inactive in ERP
                              — probable sync lag"}}

 :recommendations [
   "88 ERP records not in database: investigate if these are recent additions"
   "Status mismatch pattern suggests a sync job has fallen behind"]}
;; ✓ The :tolerance kept 380 trivial credit-limit differences from drowning the
;;   32 that actually exceed tolerance — reconciliation without tolerance reports
;;   noise as signal. And the :status mismatches are not listed 400 times; the
;;   report finds the *pattern* (DB active / ERP inactive) and names the likely cause.
```

---

## Best practices

### Validate at entry; never at exit

The cheapest moment to catch a data quality problem is when data enters the
system. Validating at the point of output — after transformation, enrichment,
and storage — is expensive in both compute and consequence. Build validation
as the first stage of every pipeline, not as a final check.

### Make constraints explicit in schemas

Every business rule that applies to data belongs in the schema, not scattered
across application code. "Orders total must equal subtotal + VAT" is a schema
constraint. "Email must be unique per customer" is a schema constraint.
Explicit constraints enable automatic validation, test generation, and
documentation — all at once.

### Use `:anomalies` in test data generation

Generating only valid test data tests the happy path. The pipelines that matter
most are the ones that handle bad data gracefully. Use `:anomalies` to inject
known-bad records into test datasets, then verify your validation catches them
and your error handling routes them appropriately.

### Profile before and after migrations

Data migrations are the highest-risk data operation. Profile the source dataset
before migration and the target dataset after. Compare the profiles. Any
significant drift — changed distributions, increased null rates, lost records
— indicates something went wrong. Profiling makes migration validation
systematic rather than manual.

### Pseudonymise, don't copy production data

The temptation to use production data in test environments is strong — "it's
more realistic." The risks (accidental exposure, compliance violation, audit
finding) are not worth it. Use `data/mask` with `:synthetic-substitute` to
create test data that is statistically realistic without containing real
personal information.

### Anti-patterns

**Trusting schema validation to mean the data is correct.** A dataset where
every record passes `data/validate` can still be collectively wrong — half the
rows silently dropped by a bad join, every total doubled by a double-applied
tax, a stale export that never refreshed. Schema validation checks records;
it cannot check the dataset. Pair it with `data/expect` for any pipeline whose
output a decision depends on. Treating a green validation as proof of
correctness is the most common way bad data reaches production looking healthy.

**Changing a producer's schema without a contract.** Renaming or removing a
field "that nobody uses" is the canonical cause of a downstream outage —
because *someone* used it, and nothing said they couldn't. Where data crosses a
team or system boundary, govern its evolution with `data/contract` rather than
discovering consumers by breaking them.

**Generating only valid test data.** A test suite built entirely from
well-formed records tests only the happy path. The code that matters most is
the code that handles bad input, and it is never exercised. Use `:anomalies` to
inject known-bad records and assert the validator catches them; a pipeline never
tested against malformed data will meet it first in production.

**Masking without preserving format validity.** Replacing a real national ID
with a random string produces test data that fails the very format checks the
system runs, so the masked data exercises a different code path than real data
would. Mask with `:preserve [:format-validity]` so a masked value is still a
*structurally valid* value — otherwise the test environment and production
diverge in exactly the place validation lives.

---

## Integration patterns

### Schema as the common contract

A `data/schema` defined once becomes the source of truth across multiple
grimoires. It drives `data/generate` for test data, `data/validate` for
quality assurance, `data/generate-tests` for test suites, and `d/scope`
in the domain grimoire for model alignment.

```clojure
(def order-schema (data/schema :order ...))

;; One schema drives multiple downstream uses:
(def test-orders      (data/generate :order :schema order-schema :count 1000))
(def validation-suite (data/generate-tests order-schema :coverage :comprehensive))
(def quality-report   (data/validate imported-orders :against order-schema))
```

When the data crosses a team or system boundary, the schema graduates from a
shared artefact to a governed one: `data/contract` wraps the schema with the
guarantees consumers depend on and the rules for how it may change, while
`data/expect` asserts the dataset-level properties the contract promises.

```clojure
(def order-contract
  (data/contract "orders-feed"
    :schema     order-schema
    :producer   "Order Platform"
    :consumers  ["Analytics" "Finance"]
    :guarantees {:freshness {:max-age "PT1H"}}
    :schema-evolution :backward-compatible
    :on-breach  {:notify ["Analytics" "Finance"] :action :quarantine}))
```

### Threading data through pipelines

`~>` from core composes data operations into readable pipelines. Each step
is a `data/` invocation that transforms the value being threaded.

```clojure
(~> "raw-import.csv"
  (data/transform :operations [parse-ops])
  (data/validate  :against order-schema :on-failure :collect)
  (data/transform :operations [enrichment-ops])
  (data/lineage   :track [:all] :record-to provenance-store)
  (data/convert-format :from :edn :to :parquet))
```

### Domain-informed schema design

Domain models from the `domain` grimoire inform schema design. An entity
definition in a domain model should map directly to a `data/schema`.

```clojure
(def patient-domain (d/explore clinical-docs :focus [:entities :constraints]))

(data/schema :patient
  :fields      (d/extract patient-domain :what :entities :matching {:name "patient"} :as :fields)
  :constraints (d/extract patient-domain :what :constraints :matching {:applies-to "patient"} :as :list)
  :compliance  [:hipaa])
```

---

## Grimoire metadata

```clojure
{:grimoire    "data"
 :namespace   "data/"
 :version     "2.1.0"
 :description "Complete data lifecycle: schema definition, generation,
               transformation, validation, expectations, contracts,
               profiling, lineage, and privacy"

 :constructs {
   :definition    [data/schema]
   :generation    [data/generate]
   :transformation [data/transform data/convert-format data/pipeline]
   :quality       [data/validate data/expect data/profile data/generate-tests]
   :governance    [data/contract]
   :provenance    [data/lineage data/mask data/reconcile]}

 :best-for [
   "Synthetic data generation for testing without real personal data"
   "Schema-driven validation and test generation"
   "Dataset-level expectations and aggregate quality assertions beyond schema"
   "Data contracts governing producer-consumer guarantees and schema evolution"
   "ETL pipeline construction with resilience and monitoring"
   "Data quality profiling and drift detection"
   "Privacy-preserving data masking for test environments"
   "Data reconciliation for migrations and audits"
   "Locale-aware data generation and validation"]

 :works-with [:core :domain :orchestrate]

 :key-concepts [
   {:term "Schema"
    :definition "Formal specification of data structure, types, constraints,
                 and compliance requirements. The single source of truth that
                 drives generation, validation, and testing."}
   {:term "Synthetic data"
    :definition "Artificially generated data that mimics production statistical
                 characteristics without containing real sensitive information"}
   {:term "Lineage"
    :definition "The provenance record of how data was derived: what
                 transformations were applied, what was enriched, what was
                 dropped and why"}
   {:term "Profile"
    :definition "A statistical characterisation of a dataset: distributions,
                 cardinalities, null rates, outliers. Answers 'what does this
                 data actually look like?' rather than 'is it valid?'"}
   {:term "Reconciliation"
    :definition "Systematic comparison of two datasets that should match,
                 identifying discrepancies, missing records, and field-level
                 differences"}
   {:term "Pseudonymisation"
    :definition "Replacing identifying information with consistent pseudonyms,
                 preserving referential integrity while removing direct
                 identifiability. Reversible with a key."}
   {:term "Anomaly injection"
    :definition "Intentionally introducing known-bad records into test datasets
                 at a controlled rate, to verify validation and error handling"}
   {:term "Expectation"
    :definition "An assertion about a dataset in aggregate — its distribution,
                 volume, freshness, or cross-field relationships — that a schema
                 cannot express. Answers 'is the dataset as a whole behaving
                 correctly?' rather than 'is each record well-formed?'"}
   {:term "Data contract"
    :definition "A formal, enforceable agreement between a data producer and its
                 consumers covering schema, guarantees (freshness, completeness,
                 distribution), SLA, and — critically — the rules governing how
                 the schema may evolve without breaking consumers."}
   {:term "Schema evolution"
    :definition "The governed change of a schema over time. A contract's
                 evolution policy (backward-compatible, forward-compatible, full)
                 determines which changes are permitted, converting a class of
                 production outages into contract violations caught at publish."}]}
```

---

## Implementation notes for LLM processors

### Schema interpretation

When processing `data/schema`, treat `:compliance` as a multiplier on the
field-level annotations: `:hipaa` in `:compliance` means all `:phi true`
fields automatically require audit logging, encryption at rest, and
minimum-necessary access controls — even if not explicitly stated per field.
`:gdpr` means all fields containing personal data must support right-to-erasure
and have a documented legal basis for processing.

### Locale-aware generation

Each supported locale defines the formats and checksums its generated values
must satisfy, so that locale-specific validation passes against generated data.
The processor applies the rules of whichever locale is requested. As a worked
example, `:locale :nl`:
- National ID (BSN): generate using the eleven-proof (elfproef) algorithm; all
  generated values must satisfy `sum(d_i × (9-i)) mod 11 == 0`
- Postal codes: format `#### AA` where the digit prefix maps to a real
  municipality; the letter suffix is any valid two-letter combination
- Phone numbers: `+31 6xx xxx xxxx` for mobile; `+31 (0)x...` for landlines
- IBAN: `NL##BANK#########` with correctly computed check digits
- Names: drawn from the locale's name-frequency distribution

Other locales define their own equivalents (e.g. a national tax-number format,
postal-code pattern, phone format, and name distribution). The mechanism is the
same; only the rules differ.

### Distribution fidelity

When `:quality :production` is specified, generate data where:
- Order counts follow Zipf's law (few heavy buyers, many light buyers)
- Revenue follows Pareto distribution (80% of revenue from 20% of customers)
- Timestamps cluster around business hours and weekdays
- Geographic distributions reflect the locale's actual population distribution
- Cross-field correlations are realistic (older customers have longer tenure;
  customers from major cities have higher LTV)

### Anomaly injection discipline

When `:anomalies` is specified, the anomalies must be:
1. Controlled: exactly `rate × count` records contain anomalies
2. Reproducible: same `:seed` produces same anomaly positions
3. Typed: the specific anomaly types requested are what appear
4. Trackable: the validation report can identify all injected anomalies

Never introduce anomalies that are not in the requested `:types` list.

### Masking determinism

When `:pseudonymise` is specified with a `:seed`, the same input value must
always produce the same pseudonym within a single masking run. This is essential
for referential integrity: if customer-id `abc123` appears in both the customer
table and the orders table, both masked datasets must use the same pseudonym
for `abc123`.

### Profile drift detection

When `:compare-to baseline-profile` is specified in `data/profile`, flag
drifts using these severity thresholds (adjustable per use case):
- `:info` — change > 5% in a metric
- `:warning` — change > 15% in a metric or null rate increase > 2 percentage points
- `:critical` — cardinality drops to 0 for a non-empty field, or null rate
  exceeds 50% for a required field

### Expectation evaluation

`data/expect` evaluates dataset-level assertions, and its discipline is the
mirror image of schema validation. Where validation reports per-record
violations, an expectation reports a single dataset-level verdict per
expectation, with the aggregate evidence that produced it (the observed
distribution, the computed sum, the row count vs baseline). Never reduce an
expectation to a count of bad records — its unit of judgment is the whole
dataset.

When an expectation references `:baseline`, evaluate it as continuity rather
than absolute bound: "within 15% of baseline" is computed against the supplied
prior profile or dataset, not a hardcoded number. If no baseline is available
(first run), report the expectation as `:unevaluable` with the current value
recorded, so the next run has a baseline — do not silently pass it.

Diagnose, do not just fail. When an expectation fails, the report should
attempt a cause where the evidence supports one (a consistent 2× factor on a
sum suggests a double-application; a uniform distribution where a heavy tail
was expected suggests a generator or sampling bug). A bare failure forces the
operator to re-investigate what the check already revealed.

### Contract enforcement and evolution

`data/contract` is enforced by composing the other constructs, and the
processor should treat it as such: enforcing a contract runs `data/validate`
against `:schema`, runs `data/expect` against `:guarantees`, checks freshness
and volume against the SLA, and applies `:on-breach` on any failure. The
contract does not re-implement these checks; it orchestrates them and assigns
consequences.

The evolution check is the high-value path and must be applied at design time,
before a new schema version is published. Given a `:from` and `:to` schema and
an evolution policy, classify every structural change as permitted or breaching
under that policy:
- `:backward-compatible` forbids removing fields, adding required fields,
  narrowing types, removing enum values, and renaming; permits adding optional
  fields, widening types, and adding enum values.
- `:forward-compatible` requires consumers tolerate unknown fields; permits the
  producer to add and (with care) remove fields, provided consumers were built
  to ignore unknowns.
- `:full` requires both sets of constraints to hold simultaneously.
- `:none` permits any change; the check always passes.

When a change breaches the policy, name the affected consumers where the
contract's `:consumers` and field-level usage allow it, and recommend a
non-breaking path (deprecation window, additive alternative, coordinated major
version bump). The purpose is to catch the breaking change against the contract
rather than in a downstream consumer's production incident.