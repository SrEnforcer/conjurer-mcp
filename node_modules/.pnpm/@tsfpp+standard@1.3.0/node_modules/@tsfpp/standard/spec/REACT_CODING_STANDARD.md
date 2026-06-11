# REACT_CODING_STANDARD.md — Functional React with Algebraic State

This standard is mandatory for all React, JSX, and TSX code, comments, and documentation in the repository. English only.
Codename TSF++/React (tsfpp-react)


**Version:** 1.0.0
**Date:** 2026-05-10
**Classification:** Normative — repository-wide
**Status:** Profile of TSF++ (`CODING_STANDARD.md`) for React user-interface code
**Modelled after:** TSF++ base standard, JSF++ AV Rules, JPL Power of Ten, React core team guidance

---

## Preamble

### Relationship to TSF++

This document is a **profile** of TSF++. Every rule in `CODING_STANDARD.md` applies to React code unchanged. This standard adds rules that are specific to user-interface code or that refine a base rule for the React context. Where a rule here appears to relax a base rule (e.g. controlled mutation inside a Zustand store), it is a documented exception and must follow the deviation procedure of the base standard.

Read TSF++ first. Read this second.

### Scope

This standard governs all `.tsx` and React-relevant `.ts` files: components, hooks, providers, route definitions, store definitions, form schemas, and JSX-producing utilities. It applies to production code, Storybook stories, and component-level tests.

It does **not** apply to:
- Build configuration (`vite.config.ts`, `tailwind.config.ts`).
- Generated route trees or other tool output behind a conforming facade.
- Third-party component types from `@types/*` or vendored UI kits.

### Philosophical axioms (non-negotiable)

1. **Render is a pure function of props and state.** Everything that breaks this purity is an effect and shall be reified, justified, and isolated.
2. **State is a liability.** Every piece of state must justify its existence against the question: "Can this be derived?"
3. **The component tree is a value, not a place.** Components are not objects with lifecycles; they are functions invoked by the runtime. Reasoning that depends on "when a component mounts" is suspect.
4. **`useEffect` is the `goto` of React.** It is the escape hatch of last resort, never the first tool.
5. **State management is a hierarchy, not a choice.** The right answer is almost always one level lower than instinct suggests.
6. **The compiler, the type system, and the linter prove what tests cannot.**

### Compliance levels

| Level    | Meaning |
|----------|---------|
| **MUST** | Mandatory. Violation requires an approved deviation record per TSF++ §Deviation Procedure. |
| **SHOULD** | Expected in all new code. May be relaxed only with a code-review comment citing rationale. |
| **MAY** | Recommended practice. Encouraged but not enforced by tooling. |

---

## 1 — Component Definition and Shape

### Rule 1.1 — MUST: Components are arrow function expressions assigned to a `const`; no `function` declarations, no `class` components

**Rationale.** Class components carry implicit `this`, lifecycle methods, and inheritance affordances forbidden by TSF++ Rule 1.9. `function` declarations hoist and pollute the module scope. Arrow function expressions compose with React.memo, forwardRef, and higher-order helpers without surface mismatch.

**Do**
```typescript
const UserCard = ({ user }: UserCardProps): ReactElement => (
  <article className="rounded-lg border p-4">
    <h2>{user.displayName}</h2>
  </article>
)
```

**Don't**
```typescript
function UserCard({ user }: UserCardProps) { ... }
class UserCard extends Component<UserCardProps> { ... }
```

---

### Rule 1.2 — MUST: Every component has an explicit return type of `ReactElement`, `ReactNode`, or `null`

**Rationale.** Reinforces TSF++ Rule 3.1 at the component boundary. A component returning `JSX.Element` inferred is fragile across React versions and version-specific JSX transforms. Explicit `ReactElement` makes the contract visible and refuse-to-render conditions (`null`) intentional.

**Do**
```typescript
const Banner = ({ message }: BannerProps): ReactElement | null =>
  message.length > 0 ? <div>{message}</div> : null
```

---

### Rule 1.3 — MUST: One component per file for non-trivial components; a file may contain at most one **public** (exported) component

**Rationale.** TSF++ Rule 11.1 applied to the JSX layer. Trivial helpers (a label, a divider) MAY live alongside the component that owns them, but only if they are not re-exported.

---

### Rule 1.4 — MUST: File extension is `.tsx` if and only if the file contains JSX; otherwise `.ts`

**Rationale.** Build tooling (Vite, esbuild, swc) treats `.tsx` files as JSX-eligible. Mislabelled files break tree-shaking and confuse readers. Pure-logic files such as Zod schemas, store definitions, and data transformers must be `.ts`.

---

### Rule 1.5 — MUST: Components and hooks must not depend on module-level mutable state

**Rationale.** Module-level `let` is forbidden by TSF++ Rule 2.1 already, but a stricter property holds in React: a component must produce identical output for identical (props, store-snapshot) input within a render. Hidden module state breaks Strict Mode double-invocation and concurrent rendering.

**Don't**
```typescript
let counter = 0  // forbidden by TSF++ 2.1 — and additionally invalidates render purity
const Widget = (): ReactElement => <span>{++counter}</span>
```

---

### Rule 1.6 — SHOULD: Co-locate component, its types, its tests, and its Storybook story in a single directory

**Rationale.** Discoverability. A reader inspecting `UserCard/` sees `UserCard.tsx`, `UserCard.types.ts`, `UserCard.test.tsx`, `UserCard.stories.tsx` together. This mirrors TSF++ Rule 11.3 (organise by feature, not by role).

---

## 2 — Props and Component Contracts

### Rule 2.1 — MUST: Props types are declared with `type` aliases; suffix `Props`; all fields `readonly`

**Rationale.** TSF++ Rule 1.4 (prefer `type` over `interface`) and Rule 2.2 (deep readonly) applied to the React contract. The `Props` suffix is convention; it makes JSDoc, IDE rename, and grep effective.

**Do**
```typescript
type UserCardProps = {
  readonly user: User
  readonly onSelect: (id: UserId) => void
  readonly variant: CardVariant
}
```

---

### Rule 2.2 — MUST: Variant-driven components must encode mutually exclusive prop sets as discriminated unions, never as optional flags

**Rationale.** A `Button` with `variant: 'primary' | 'destructive'` and `loading?: boolean` and `icon?: ReactNode` and `href?: string` admits illegal states (a destructive loading button with an href). The compiler must refuse them. TSF++ Rule 1.1 applied at the component boundary.

**Do**
```typescript
type ButtonProps =
  | { readonly kind: 'submit'; readonly loading: boolean; readonly children: ReactNode }
  | { readonly kind: 'link'; readonly href: string; readonly children: ReactNode }
  | { readonly kind: 'icon'; readonly icon: ReactElement; readonly label: string }
```

**Don't**
```typescript
type ButtonProps = {
  readonly kind?: 'submit' | 'link' | 'icon'
  readonly href?: string       // illegal when kind = submit
  readonly loading?: boolean   // illegal when kind = link
  readonly icon?: ReactElement // illegal when kind = submit
}
```

---

### Rule 2.3 — MUST: Forbid prop drilling beyond two component levels; lift state, compose with children, or scope a context

**Rationale.** Prop drilling indicates structural failure: either the data lives at the wrong altitude, or the intermediate components are doing layout work that should be done by composition (Rule 6.x). The two-level limit is empirical, matching cognitive scope.

---

### Rule 2.4 — MUST: Do not spread arbitrary `...rest` props onto DOM elements without an explicit allow-list

**Rationale.** `<div {...props} />` defeats the type system: any consumer can inject arbitrary attributes. Where pass-through is genuinely needed (e.g. wrapping a primitive), declare an explicit subtype.

**Do**
```typescript
type InputProps = {
  readonly value: string
  readonly onChange: (v: string) => void
  readonly id: string
  readonly ariaLabel: string
}
const Input = ({ value, onChange, id, ariaLabel }: InputProps): ReactElement => (
  <input id={id} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} />
)
```

**Exception.** UI primitives that wrap a single element (e.g. shadcn/ui `Button`) MAY pass `ComponentPropsWithoutRef<'button'>` through, documented with `// DEVIATION(2.4)`.

---

### Rule 2.5 — MUST: Boolean props are named affirmatively and default to the safe value

**Rationale.** A prop named `disabled` defaults to `false`. A prop named `enabled` would default to `true` — a footgun. Affirmative naming aligns with how readers interpret JSX top-down.

**Do**
```typescript
type DialogProps = {
  readonly open: boolean
  readonly closable: boolean
  readonly persistent: boolean
}
```

---

### Rule 2.6 — SHOULD: Prefer `ReactNode` for content slots over `string | ReactElement` unions

**Rationale.** `ReactNode` is the canonical type for "anything renderable" and includes fragments, arrays, and primitives. Narrower types create needless friction at the call site.

---

### Rule 2.7 — MUST: Callbacks accept domain types, not DOM events, unless the component genuinely needs the DOM event

**Rationale.** A `<UserCard onSelect={(id) => ...} />` is a domain affordance; leaking `MouseEvent` couples consumers to the DOM. The component should extract the relevant value internally.

**Do**
```typescript
type UserCardProps = { readonly onSelect: (id: UserId) => void }
```

**Don't**
```typescript
type UserCardProps = { readonly onSelect: (e: MouseEvent<HTMLDivElement>) => void }
```

---

## 3 — State Management Hierarchy

### Rule 3.1 — MUST: Justify every piece of state against the elimination ladder before introducing it

**Rationale.** State is a liability. The ladder, in order, asks:

1. **Can it be derived from props?** → compute during render.
2. **Can it be derived from existing state?** → compute during render or `useMemo` if expensive.
3. **Does it belong in the URL?** → use the router (search params, path params).
4. **Is it server data?** → use TanStack Query (or equivalent), never local state.
5. **Is it form state?** → use React Hook Form, never raw `useState` per field.
6. **Is it ephemeral UI state local to one component?** → `useState` or `useReducer`.
7. **Is it shared between siblings?** → lift to common parent.
8. **Is it shared across distant subtrees?** → context for low-frequency values, Zustand/Jotai for high-frequency.

Skip a rung only with a `// DEVIATION(3.1): <reason>` comment.

---

### Rule 3.2 — MUST: Server state must not live in `useState`; use TanStack Query (or equivalent typed cache)

**Rationale.** Server state has caching, staleness, refetch, retry, and synchronization concerns that `useState` cannot model. Reimplementing them is a category error. See §7.

---

### Rule 3.3 — MUST: URL-shaped state lives in the URL

**Rationale.** Filters, pagination, selected tab, dialog-open-via-link — anything a user expects to share, bookmark, or navigate via back-button — must round-trip through the router. Storing this in component state breaks the user's mental model.

**Do**
```typescript
const { search } = useSearch({ from: '/users' })
const filter = search.filter ?? 'all'
```

---

### Rule 3.4 — MUST: Use `useReducer` over `useState` when state has more than two related fields or transitions form a state machine

**Rationale.** Multiple `useState` calls for related fields invite inconsistent intermediate states (loading=true and data=oldData). A reducer with a discriminated action union (TSF++ Rule 1.1) makes transitions explicit and testable in isolation.

**Do**
```typescript
type WizardState =
  | { readonly kind: 'step1' }
  | { readonly kind: 'step2'; readonly name: string }
  | { readonly kind: 'submitted'; readonly result: SubmitResult }

type WizardAction =
  | { readonly kind: 'next'; readonly name: string }
  | { readonly kind: 'submit' }
  | { readonly kind: 'reset' }

const reducer = (s: WizardState, a: WizardAction): WizardState => { ... }
```

---

### Rule 3.5 — MUST: Lifted state must not be lifted higher than necessary

**Rationale.** Lifting state above its true scope causes unrelated subtrees to re-render. Lift to the lowest common ancestor of the components that genuinely need it, no further.

---

### Rule 3.6 — SHOULD: Prefer Jotai for fine-grained atomic global state; prefer Zustand for store-shaped global state

**Rationale.** Jotai's atom model gives per-atom subscription granularity, ideal for canvas/diagram applications with many small independent values (cf. the editor's per-node atoms). Zustand's slice-shaped store fits authentication, settings, and other coarser bundles. Both are acceptable; mixing them in one application is acceptable when each is used for what it is best at.

---

### Rule 3.7 — MUST: Context is for low-frequency values (theme, locale, current user); not for state that changes per keystroke

**Rationale.** A context value change re-renders every consumer. High-frequency state in context is an anti-pattern that masquerades as correct until a profiler reveals it.

---

### Rule 3.8 — MUST: Reducers and store actions are pure; effects (network, navigation) are composed outside, never inside

**Rationale.** TSF++ Rule 3.3 (separate pure and effectful) at the state-management boundary. A reducer that calls `fetch` is a reducer that cannot be tested without a mock.

---

## 4 — Effect Discipline (`useEffect`)

### Rule 4.1 — MUST: `useEffect` is reserved for synchronizing with **systems outside React**: subscriptions, browser APIs, third-party imperative libraries, observers

**Rationale.** This is the entire legitimate scope. If the synchronization target is React state, the answer is almost certainly not `useEffect`.

Legitimate examples:

- Subscribing to a WebSocket, EventSource, or DOM event the parent does not control.
- Integrating an imperative library (canvas renderer, map, video player).
- Setting up an `IntersectionObserver`, `MutationObserver`, or `ResizeObserver`.
- Synchronizing `document.title`, focus, or scroll position with state.

---

### Rule 4.2 — MUST NOT: Use `useEffect` to derive state

**Rationale.** Derived state computed in an effect causes a redundant render, introduces tearing, and is unreachable in a server-rendered first paint. Compute during render; cache with `useMemo` only if profiling justifies it.

**Do**
```typescript
const fullName = `${user.firstName} ${user.lastName}`
const filtered = useMemo(() => items.filter(matchesQuery(query)), [items, query])
```

**Don't**
```typescript
const [fullName, setFullName] = useState('')
useEffect(() => setFullName(`${user.firstName} ${user.lastName}`), [user])
```

---

### Rule 4.3 — MUST NOT: Use `useEffect` to fetch data

**Rationale.** Manual fetch-in-effect lacks caching, deduplication, retry, and request cancellation. Use TanStack Query, route loaders, or Suspense-based fetching. See §7.

---

### Rule 4.4 — MUST NOT: Use `useEffect` to react to user events

**Rationale.** A button click is an event handler, not a render. State updates that follow a user event belong in the handler. Effects fire after every render that changed their dependencies — a brittle proxy for an event.

**Do**
```typescript
const onSubmit = (): void => {
  setSubmitted(true)
  trackAnalytics('form_submitted')
}
```

**Don't**
```typescript
useEffect(() => {
  if (submitted) trackAnalytics('form_submitted')
}, [submitted])
```

---

### Rule 4.5 — MUST: Every effect that creates a subscription, listener, observer, or timer must return a cleanup function

**Rationale.** Strict Mode double-invocation, route changes, and component unmount all require cleanup. Failure leaks listeners and accumulates state across remounts.

**Do**
```typescript
useEffect(() => {
  const id = window.setInterval(tick, 1000)
  return () => window.clearInterval(id)
}, [tick])
```

---

### Rule 4.6 — MUST: Effect dependency arrays must be exhaustive; do not silence the lint rule

**Rationale.** A non-exhaustive dependency array is a stale-closure trap. If a dependency genuinely should not retrigger the effect, hoist it into a ref or restructure the effect; never disable the rule.

---

### Rule 4.7 — MUST: An effect must do exactly one thing; split otherwise

**Rationale.** A single effect that handles two concerns has a dependency array that is the union of both — meaning either concern fires unnecessarily. Split per concern.

---

### Rule 4.8 — SHOULD: Prefer `useSyncExternalStore` over `useEffect + useState` for subscribing to external stores

**Rationale.** `useSyncExternalStore` is the React 18+ primitive for external-store integration. It handles concurrent rendering and tearing correctly.

---

### Rule 4.9 — MUST: Effects must not be the source of authoritative state; they may only mirror external state into React's awareness

**Rationale.** If `useEffect` is where a value is *first* computed, the value is misplaced. Effects observe and synchronize; they do not author.

---

## 5 — Memoization Discipline

### Rule 5.1 — MUST: `useMemo`, `useCallback`, and `React.memo` require a documented reason

**Rationale.** Memoization is not free: it adds a dependency array, an equality check, and cognitive load. Speculative memoization has neither performance nor correctness benefit. The reason must be one of:

1. **Referential identity is needed for downstream memoization** (e.g. the value flows into a `React.memo` boundary or a hook dependency).
2. **The computation is measurably expensive** (profiled, not assumed).
3. **The value is a dependency of another hook** and recomputing it would loop.

**Do**
```typescript
// Reason: passed to memoized DataGrid; reference must be stable across renders.
const columns = useMemo(() => buildColumns(t), [t])
```

**Don't**
```typescript
// No memoized consumer; useMemo here is pure ceremony.
const fullName = useMemo(() => `${u.firstName} ${u.lastName}`, [u])
```

---

### Rule 5.2 — MUST: `useCallback` is permitted only when the callback is passed to a memoized component or used in another hook's dependency array

**Rationale.** A `useCallback` whose result is consumed by a non-memoized child accomplishes nothing. The new function reference is created either way; only the wrapper differs.

---

### Rule 5.3 — MUST: `React.memo` is permitted only after a profiler measurement confirms re-renders are the bottleneck

**Rationale.** `React.memo` adds a shallow-equality check to every render. For cheap components it costs more than it saves. Use only for components that (a) are rendered many times, (b) receive stable props, and (c) profile as expensive.

---

### Rule 5.4 — SHOULD: Prefer structural alternatives to memoization

**Rationale.** Splitting a component, lifting context lower, or moving state into a child often achieves the same result without ceremony. If memoization is your first instinct, ask whether the tree shape is wrong.

---

### Rule 5.5 — MUST: When the React Compiler is enabled for a package, manual memoization MUST be removed and SHALL NOT be reintroduced without a deviation

**Rationale.** The React Compiler memoizes automatically. Manual memoization on top of it is redundant and competes with the compiler's analysis.

---

## 6 — Composition Patterns

### Rule 6.1 — MUST: Prefer composition (children, slots) over configuration (deeply parameterized props)

**Rationale.** A `<Card title="..." subtitle="..." actionLabel="..." actionHref="..." />` is a configuration explosion that grows monotonically. A `<Card><Card.Header>...</Card.Header><Card.Body>...</Card.Body></Card>` accommodates new shapes by composition without expanding the prop surface.

---

### Rule 6.2 — MUST: Compound components share a discriminated context, not implicit ordering

**Rationale.** A `<Tabs>` with `<TabList>`, `<Tab>`, and `<TabPanel>` children must communicate via a typed context, not by index in the children array. Implicit ordering breaks under conditional rendering.

---

### Rule 6.3 — SHOULD: Render-prop and headless component patterns over inheritance or higher-order components

**Rationale.** HOCs (`withRouter`, `withAuth`) inject untyped props and produce opaque component names. Headless components (TanStack Table, Radix primitives) expose primitives the consumer composes; the consumer keeps full control of markup.

---

### Rule 6.4 — MUST: A component does one thing — present, fetch, lay out, or coordinate — not multiple

**Rationale.** A component that fetches and renders and routes accumulates concerns until it is untestable. Split:

- **Presentation components** take props, return JSX, no hooks beyond `useId` and similar pure helpers.
- **Container components** wire data sources to presentation.
- **Layout components** arrange children, no domain knowledge.
- **Coordinator components** own orchestrating state for a feature, delegate rendering to children.

---

### Rule 6.5 — MUST: A presentation component must be storybookable in isolation with mock props only

**Rationale.** If a component cannot be rendered in Storybook with hand-written props, it is not a presentation component — it is a container masquerading as one. Refactor.

---

### Rule 6.6 — SHOULD: Limit JSX nesting depth to 4; extract sub-components beyond that

**Rationale.** Aligns with TSF++ Rule 3.4 (nesting ≤ 4). Deeply nested JSX hides intent and obscures conditional regions.

---

## 7 — Server State (TanStack Query)

### Rule 7.1 — MUST: All remote reads use TanStack Query (or equivalent typed cache); no `fetch` directly in components

**Rationale.** Caching, deduplication, retry, stale-while-revalidate, error handling, and cancellation are solved problems. Reimplementing them in components is a violation of TSF++ Rule 6.5 (isolate I/O at the boundary).

---

### Rule 7.2 — MUST: Query keys are typed via a factory; no inline string-array keys in components

**Rationale.** Inline keys (`['users', id]`) drift from their fetcher and silently break cache invalidation. A factory makes the relationship explicit and rename-safe.

**Do**
```typescript
const userKeys = {
  all: ['users'] as const,
  byId: (id: UserId) => [...userKeys.all, id] as const,
  list: (filter: UserFilter) => [...userKeys.all, 'list', filter] as const,
}
```

---

### Rule 7.3 — MUST: Query functions return `T`; mutation functions return `Result<T, E>` or throw a typed error class converted to `Result` at the boundary

**Rationale.** TanStack Query already handles read errors via `error`. For mutations, downstream code must branch on success/failure with full type information; `Result<T, E>` (TSF++ Rule 6.3) makes this explicit.

---

### Rule 7.4 — MUST: Mutation side effects (cache invalidation, navigation, toasts) live in `onSuccess` / `onError` handlers, not in component code

**Rationale.** Centralizing post-mutation effects on the mutation declaration keeps every call site uniform. A consumer cannot forget to invalidate.

---

### Rule 7.5 — SHOULD: Optimistic updates must include `onMutate` snapshot, `onError` rollback, and `onSettled` reconciliation

**Rationale.** A half-implemented optimistic update is a correctness hazard worse than no optimism. The full triad is required or none.

---

### Rule 7.6 — SHOULD: Use TanStack Router loaders for route-level data; reserve component-level queries for sub-resources or interaction-driven fetches

**Rationale.** Route loaders move the waterfall above the component tree, enable parallelism, and remove `useEffect`-style data fetching. Component queries remain for filters, infinite lists, and on-demand reads.

---

## 8 — Form State (React Hook Form + Zod)

### Rule 8.1 — MUST: All non-trivial forms use React Hook Form with a Zod schema as the single source of truth

**Rationale.** A Zod schema gives runtime validation, TypeScript types, and a serializable contract. React Hook Form gives uncontrolled inputs (avoiding per-keystroke re-render storms) and a typed `handleSubmit`.

**Do**
```typescript
const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(18),
})
type UserForm = z.infer<typeof userSchema>

const form = useForm<UserForm>({ resolver: zodResolver(userSchema) })
```

---

### Rule 8.2 — MUST: Submit handlers return `Promise<Result<T, FormError>>`; render error states from the result, not from `try`/`catch`

**Rationale.** TSF++ Rules 6.1 and 6.3 at the form boundary. A submit that throws cannot drive UI state; one that returns `Result` can.

---

### Rule 8.3 — MUST: Field-level validation lives in the schema, never in `onChange` handlers

**Rationale.** Validation in handlers duplicates and drifts from the schema. The schema is the contract; the handler reads from it.

---

### Rule 8.4 — SHOULD: Compose schemas, do not duplicate them across create / update / partial forms

**Rationale.** `userSchema.partial()`, `userSchema.pick({ email: true })`, and `userSchema.extend({ ... })` give you a derived schema for free. Hand-maintained parallel schemas drift.

---

### Rule 8.5 — MUST NOT: Use raw `useState` per form field

**Rationale.** It is a category error. Each `useState` re-renders the entire form on every keystroke. React Hook Form exists precisely to avoid this.

---

## 9 — Routing

### Rule 9.1 — MUST: Routes are declared in a typed router (TanStack Router, or equivalent with full type inference for params and search)

**Rationale.** Untyped routing produces stringly-typed `useParams<any>` and runtime-only failures for typos. Typed routing makes route shape part of the type system.

---

### Rule 9.2 — MUST: Route search params are validated by a Zod schema attached to the route definition

**Rationale.** URLs are an external system (TSF++ Rule 1.5: narrow `unknown` at boundaries). Search params arriving from a user-shared link must be validated before use.

---

### Rule 9.3 — MUST: Navigation calls use the typed router API; never construct URL strings by hand

**Rationale.** Hand-built URLs drift from the route definition. The typed `navigate({ to: '/users/$id', params: { id } })` is rename-safe and validated at compile time.

---

### Rule 9.4 — SHOULD: Lazy-load routes that are not on the critical path

**Rationale.** Code-splitting at the route boundary is the highest-impact split point. Apply it; measure with the bundle analyzer.

---

## 10 — Global State (Zustand and Jotai)

### Rule 10.1 — MUST: A global store exists only after the elimination ladder (Rule 3.1) is exhausted

**Rationale.** Most "global" state is route state, server state, or lifted state misdiagnosed as global.

---

### Rule 10.2 — MUST: Zustand stores are sliced by domain; one slice per concern; combined via the store factory

**Rationale.** A monolithic store becomes a god object. Slices keep concerns local and tests focused.

---

### Rule 10.3 — MUST: Store actions are total functions of `(state, payload) => state`; no I/O inside the action

**Rationale.** Rule 3.8 restated. Effects compose outside the store. The store is a reducer.

---

### Rule 10.4 — MUST: Consumers select narrowly; never `useStore((s) => s)`

**Rationale.** Selecting the whole store re-renders the consumer on every update. Select the slice, the field, or the derived value you actually use.

**Do**
```typescript
const userName = useUserStore((s) => s.user.name)
```

**Don't**
```typescript
const store = useUserStore((s) => s)
const userName = store.user.name
```

---

### Rule 10.5 — SHOULD: Use Jotai atoms for canvas-, graph-, or grid-shaped applications with many small independent pieces of state

**Rationale.** Atom-level subscription means updating node 17 re-renders only node 17's subscribers. A Zustand slice with a `Record<NodeId, Node>` re-renders every consumer of the record.

---

### Rule 10.6 — MUST: Persistence (localStorage, sessionStorage) is opt-in per slice/atom and validated on rehydration

**Rationale.** Persisted state is a forward-compatibility hazard: a schema change makes yesterday's stored state today's runtime error. Validate with Zod on rehydrate; fall back to default on failure.

---

## 11 — Styling (TailwindCSS and shadcn/ui)

### Rule 11.1 — MUST: Tailwind utility classes for layout, spacing, color, and typography; component-level CSS files only for complex animations or styles that genuinely cannot be expressed in utilities

**Rationale.** Tailwind co-locates style with markup, removes naming overhead, and prunes unused styles at build time. CSS files reintroduce the cascade and global namespace problems Tailwind solves.

---

### Rule 11.2 — MUST: Long Tailwind class lists are composed via `clsx` (or `cn` from shadcn/ui), not concatenated strings

**Rationale.** String concatenation produces invalid output under conditional logic (`'foo ' + (active && 'bar')` yields `'foo false'`). `clsx` handles falsy values correctly and reads cleanly.

**Do**
```typescript
const classes = cn('rounded-lg p-4', variant === 'primary' && 'bg-primary', disabled && 'opacity-50')
```

---

### Rule 11.3 — MUST: Variants are encoded via `cva` (class-variance-authority) or equivalent typed variant function; never `if`/`else` over class strings inline

**Rationale.** `cva` makes variants part of the type system: a `variant` prop of type `'primary' | 'destructive'` is enforced at compile time, exhaustive at definition time.

**Do**
```typescript
const buttonVariants = cva('rounded-lg px-3 py-2', {
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground',
      destructive: 'bg-destructive text-destructive-foreground',
    },
    size: { sm: 'text-sm', md: 'text-base' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})
```

---

### Rule 11.4 — MUST: Use design tokens (CSS variables, Tailwind theme) for colors and spacing; never hex codes or magic pixel values inline

**Rationale.** Inline literals duplicate the theme and drift from it. The theme is the source of truth.

**Do**
```typescript
<div className="bg-background text-foreground gap-4">
```

**Don't**
```typescript
<div className="bg-[#0a0a0a] text-[#fafafa] gap-[17px]">
```

**Exception.** Genuinely one-off values (a custom illustration's transform) MAY use arbitrary values; document with `// DEVIATION(11.4)`.

---

### Rule 11.5 — MUST: shadcn/ui components are vendored into the repository, not depended on as a package; modifications follow the same rules as application code

**Rationale.** This is the shadcn/ui design philosophy. Vendoring means full control and no upstream-version friction; the price is that the rules of this standard apply to the vendored code too.

---

### Rule 11.6 — SHOULD: Avoid `style={{ ... }}` inline objects except for runtime-computed values (e.g. CSS variables driven by state)

**Rationale.** Inline style bypasses Tailwind's purge and the theme system. It is appropriate only when a value genuinely cannot be known at build time.

---

## 12 — Animation (framer-motion)

### Rule 12.1 — MUST: Animation primitives are framer-motion `motion.*` components; CSS keyframes only for purely decorative loops with no state interaction

**Rationale.** framer-motion integrates with React state, layout transitions, and gesture systems. CSS keyframes do not and require dual maintenance.

---

### Rule 12.2 — MUST: Animation variants are declared as readonly objects at module scope, not inline

**Rationale.** Inline variant objects allocate per render and produce reference instability. Module-scope variants are stable and shareable.

**Do**
```typescript
const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
} as const

const Banner = (): ReactElement => (
  <motion.div variants={fadeVariants} initial="hidden" animate="visible" />
)
```

---

### Rule 12.3 — MUST: Respect `prefers-reduced-motion`; animations that convey meaning beyond decoration must offer a reduced equivalent

**Rationale.** Accessibility and platform contract. framer-motion's `useReducedMotion` is the integration point.

---

### Rule 12.4 — SHOULD: Layout animations use `layout` prop or `LayoutGroup`; do not manually animate measured positions

**Rationale.** framer-motion's FLIP-based layout system handles the measurement and interpolation correctly. Manual position math is an entire class of bugs.

---

## 13 — Loading and Error Boundaries

### Rule 13.1 — MUST: Every async data dependency has an explicit loading state and an explicit error state; rendering with stale or missing data is forbidden

**Rationale.** A component that renders `data?.name ?? ''` while loading shows nothing, conveying nothing. Loading and error are first-class UI states.

---

### Rule 13.2 — MUST: Error boundaries wrap every route and every isolated feature subtree; a single uncaught error must not white-screen the application

**Rationale.** React's default behaviour on render error is to unmount the tree. An ErrorBoundary at each meaningful subtree localizes the blast radius.

---

### Rule 13.3 — MUST: Error boundaries log to an observability sink (Sentry, OpenTelemetry, or equivalent) and present a recoverable fallback

**Rationale.** A swallowed error is a silent regression. A fallback without a "retry" affordance traps the user.

---

### Rule 13.4 — SHOULD: Suspense boundaries are placed at content-meaningful seams, not wrapped around individual atoms

**Rationale.** A Suspense boundary too low produces flash-of-spinner per atom. A boundary at the section level creates a coherent loading experience.

---

## 14 — Custom Hooks

### Rule 14.1 — MUST: Custom hook names start with `use`; hooks call other hooks or pure functions, never imperative effectful code outside an effect

**Rationale.** The `use` prefix is React's contract for the rules-of-hooks linter. Hooks are pure-by-shape functions that compose other hooks.

---

### Rule 14.2 — MUST: A custom hook does one thing; if it returns more than one tuple of unrelated values, split it

**Rationale.** TSF++ Rule 3.4 (function does one thing) at the hook boundary. A hook returning `{ user, theme, cart, notifications }` is four hooks.

---

### Rule 14.3 — MUST: Hooks return either a value, a tuple, or a record — pick one shape per hook and document it

**Rationale.** A hook that sometimes returns `T`, sometimes `[T, setT]`, sometimes `{ data, error }` is unreadable. Consistency per hook is mandatory; consistency across hooks is encouraged.

---

### Rule 14.4 — MUST: A hook's return type is explicit and exported; consumers must be able to type the result without inference

**Rationale.** TSF++ Rule 3.1 at the hook boundary.

---

### Rule 14.5 — SHOULD: Prefer a single composed hook for a feature over many micro-hooks for the same feature

**Rationale.** Five hooks that must be called in the same order at every call site are an API smell. Compose them into one feature-shaped hook.

---

## 15 — Performance and Code Splitting

### Rule 15.1 — MUST: Bundle size budgets are enforced by CI; route bundles must not exceed the documented budget without an approved deviation

**Rationale.** Performance regresses silently. A budget makes regression visible at PR time.

---

### Rule 15.2 — MUST: Heavy dependencies (charting, code editor, rich-text editor, PDF viewer) are dynamic-imported, not in the initial bundle

**Rationale.** A dependency the user may never reach should not block first paint.

---

### Rule 15.3 — MUST: Lists with more than ~50 visible items use virtualization (TanStack Virtual or equivalent)

**Rationale.** Rendering thousands of DOM nodes degrades scroll, layout, and memory. Virtualization keeps the active set bounded.

---

### Rule 15.4 — SHOULD: Images use modern formats (AVIF, WebP) with fallback; declared dimensions or aspect ratios; appropriate loading strategy (`loading="lazy"` below the fold)

**Rationale.** Layout shift from un-dimensioned images is a Core Web Vitals failure mode and a user experience cost.

---

### Rule 15.5 — SHOULD: Profile before optimizing. The React DevTools Profiler and the browser performance panel are the source of truth, not intuition

**Rationale.** Premature optimization is wasted complexity. Measured optimization is engineering.

---

## 16 — Accessibility

### Rule 16.1 — MUST: Interactive elements use semantic HTML (`button`, `a`, `input`, `select`); never a `div` with a click handler for an action

**Rationale.** Semantic HTML carries keyboard, focus, and assistive-technology behaviour for free. Reimplementing it on a `div` reimplements it incorrectly.

---

### Rule 16.2 — MUST: Forms have associated labels; icons-as-buttons have `aria-label`; images have `alt` (empty when decorative)

**Rationale.** Non-negotiable baseline. The linter (`eslint-plugin-jsx-a11y`) enforces it.

---

### Rule 16.3 — MUST: Keyboard navigation works for every interactive flow; focus order is logical; focus is visible; focus traps are intentional and escapable

**Rationale.** A flow that requires a mouse is a flow that excludes users. Test with the keyboard alone before considering a feature done.

---

### Rule 16.4 — MUST: Color is not the sole channel for state (error, success, required); pair it with text or icon

**Rationale.** Color-blind users and high-contrast modes break color-only signaling.

---

### Rule 16.5 — SHOULD: Use Radix UI primitives (or equivalent unstyled accessible primitives) under shadcn/ui for dialogs, menus, popovers, tabs, and tooltips

**Rationale.** Accessible interactive primitives are extremely hard to build correctly. Reuse the work.

---

## 17 — Testing

### Rule 17.1 — MUST: Component tests use React Testing Library; query by accessible role and name, not by `data-testid` or class

**Rationale.** Querying by accessibility surface tests the application the way a user (or assistive technology) experiences it. Test IDs decouple tests from accessibility, allowing accessibility regressions to pass tests.

**Do**
```typescript
screen.getByRole('button', { name: /submit/i })
```

---

### Rule 17.2 — MUST: Pure logic — reducers, selectors, validators, formatters — is tested with unit tests and, where applicable, fast-check property tests (TSF++ Rule 8.2)

**Rationale.** Pure logic is the easiest thing to test and the most rewarding to test exhaustively. There is no excuse to skip it.

---

### Rule 17.3 — MUST: Network is mocked with MSW (Mock Service Worker), not by stubbing `fetch` or query functions

**Rationale.** MSW intercepts at the network layer, so the application code under test runs unchanged — including TanStack Query, retries, and error handling. Stubbing higher up bypasses the integration that matters.

---

### Rule 17.4 — SHOULD: End-to-end tests (Playwright) cover critical user flows; do not duplicate component-level coverage at the e2e tier

**Rationale.** E2E tests are slow and flaky relative to unit tests. Reserve them for the few flows whose value justifies the cost.

---

### Rule 17.5 — SHOULD: Storybook stories double as visual regression and interaction tests via the `play` function

**Rationale.** Stories that already exist for design review can run as tests with no extra files, reducing drift between documentation and verification.

---

## 18 — File and Module Organisation

### Rule 18.1 — MUST: Top-level structure is feature-shaped, not role-shaped (TSF++ Rule 11.3)

**Do**
```
src/
  features/
    user-profile/
      UserCard.tsx
      UserCard.types.ts
      UserCard.test.tsx
      useUser.ts
      userKeys.ts
      userSchema.ts
  shared/
    ui/             ← shadcn primitives, generic UI atoms
    hooks/          ← cross-feature hooks
    lib/            ← cn, formatters, type guards
  routes/           ← route tree (TanStack Router)
  app/              ← root, providers, error boundary
```

---

### Rule 18.2 — MUST: Cross-feature imports go through a feature's barrel (`index.ts`); reaching into a sibling feature's internals is forbidden

**Rationale.** TSF++ Rule 11.4 at the feature boundary. A feature's public API is what its barrel re-exports; everything else is implementation detail.

---

### Rule 18.3 — MUST: Shared UI primitives (`shared/ui`) must not import from `features/*`

**Rationale.** Primitives are leaves of the dependency graph. A leaf that imports from a branch creates a cycle.

---

### Rule 18.4 — SHOULD: Path aliases (`@/features/...`, `@/shared/...`) are configured in `tsconfig.json` and Vite; deep relative imports (`../../../`) are forbidden

**Rationale.** Relative imports break under refactor; aliased imports do not.

---

## 19 — Forbidden Constructs (Summary, Profile-Specific)

| Construct | Rule | Level |
|-----------|------|-------|
| Class components | 1.1 | MUST NOT |
| `function` declarations for components | 1.1 | MUST NOT |
| Module-level mutable state in components/hooks | 1.5 | MUST NOT |
| Optional flag props for mutually exclusive variants | 2.2 | MUST NOT |
| Prop drilling beyond two levels | 2.3 | MUST NOT |
| Unrestricted `{...rest}` onto DOM | 2.4 | MUST NOT |
| DOM event types in domain callbacks | 2.7 | MUST NOT |
| Server state in `useState` | 3.2 | MUST NOT |
| URL-shaped state in component state | 3.3 | MUST NOT |
| Context for high-frequency state | 3.7 | MUST NOT |
| I/O inside reducers/store actions | 3.8 | MUST NOT |
| `useEffect` for derived state | 4.2 | MUST NOT |
| `useEffect` for data fetching | 4.3 | MUST NOT |
| `useEffect` for user-event reactions | 4.4 | MUST NOT |
| Effect without cleanup (when subscribing) | 4.5 | MUST NOT |
| Disabling exhaustive-deps lint | 4.6 | MUST NOT |
| Speculative `useMemo` / `useCallback` / `React.memo` | 5.1 | MUST NOT |
| Inline `fetch` in components | 7.1 | MUST NOT |
| Inline string-array query keys | 7.2 | MUST NOT |
| Throwing in submit handlers | 8.2 | MUST NOT |
| Per-field `useState` in forms | 8.5 | MUST NOT |
| Hand-built URL strings for navigation | 9.3 | MUST NOT |
| Whole-store `useStore((s) => s)` | 10.4 | MUST NOT |
| Inline hex / pixel literals in className | 11.4 | MUST NOT |
| Class-string concatenation for variants | 11.2, 11.3 | MUST NOT |
| `div` with `onClick` for an action | 16.1 | MUST NOT |
| `data-testid` queries in tests | 17.1 | MUST NOT |
| Stubbing `fetch` in tests | 17.3 | MUST NOT |
| Cross-feature deep imports | 18.2 | MUST NOT |

---

## Appendix A — Recommended `tsconfig.json` additions for React

Extends TSF++ Appendix A with React-specific options.

```jsonc
{
  "compilerOptions": {
    // JSX
    "jsx": "react-jsx",                     // automatic runtime, no React import needed
    "jsxImportSource": "react",

    // Library types
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],

    // Path aliases (mirror in vite.config.ts)
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "src/**/*.ts", "src/**/*.tsx"]
}
```

---

## Appendix B — Recommended ESLint additions for React

Extends TSF++ Appendix B with React-specific plugins.

```javascript
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import tanstackQueryPlugin from '@tanstack/eslint-plugin-query'

export default [
  // ... TSF++ base config ...
  {
    files: ['**/*.tsx'],
    plugins: {
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
      '@tanstack/query': tanstackQueryPlugin,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // --- React core ---
      'react/jsx-uses-react': 'off',                       // automatic runtime
      'react/react-in-jsx-scope': 'off',                   // automatic runtime
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/jsx-no-leaked-render': 'error',               // forbid `0 && <X />` rendering "0"
      'react/no-array-index-key': 'error',
      'react/no-unstable-nested-components': 'error',
      'react/self-closing-comp': 'error',
      'react/jsx-pascal-case': 'error',
      'react/jsx-no-useless-fragment': 'error',

      // --- Hooks ---
      'react-hooks/rules-of-hooks': 'error',               // Rule 14.1
      'react-hooks/exhaustive-deps': 'error',              // Rule 4.6

      // --- Accessibility ---
      'jsx-a11y/alt-text': 'error',                        // Rule 16.2
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',    // Rule 16.1
      'jsx-a11y/no-static-element-interactions': 'error',  // Rule 16.1
      'jsx-a11y/label-has-associated-control': 'error',    // Rule 16.2
      'jsx-a11y/no-autofocus': 'warn',

      // --- TanStack Query ---
      '@tanstack/query/exhaustive-deps': 'error',          // Rule 7.2
      '@tanstack/query/no-rest-destructuring': 'error',
      '@tanstack/query/stable-query-client': 'error',
    }
  }
]
```

> **Note:** Install plugins with
> `pnpm add -D eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y @tanstack/eslint-plugin-query`.

---

## Appendix C — Code review checklist (additive to TSF++ Rule 10.4)

- [ ] Component is an arrow `const` with explicit return type
- [ ] Props are `readonly`, suffixed `Props`, with discriminated unions for variants
- [ ] No prop drilling beyond two levels
- [ ] Every piece of state has been justified against the elimination ladder
- [ ] No `useEffect` for derived state, fetching, or event reactions
- [ ] Every effect that subscribes returns a cleanup
- [ ] Every memoization has a documented reason
- [ ] Server reads use TanStack Query with a typed query-key factory
- [ ] Forms use React Hook Form + Zod; submit returns `Result<T, E>`
- [ ] Routes and search params are typed and validated
- [ ] Global state is the conclusion of the elimination ladder, not the start
- [ ] Tailwind variants via `cva`; no inline class concatenation
- [ ] No hex codes or pixel literals in className
- [ ] Loading and error states are explicit
- [ ] Error boundary wraps the route or feature
- [ ] Interactive elements are semantic; a11y lints clean
- [ ] Tests query by role; network mocked with MSW
- [ ] Imports respect feature boundaries; no deep relative paths

---

## Appendix D — References

1. **TSF++ Coding Standard** — base standard, this repository, `CODING_STANDARD.md`.
2. **React documentation: You Might Not Need an Effect** — https://react.dev/learn/you-might-not-need-an-effect
3. **React documentation: Choosing the State Structure** — https://react.dev/learn/choosing-the-state-structure
4. **React documentation: Synchronizing with Effects** — https://react.dev/learn/synchronizing-with-effects
5. **TanStack Query** — https://tanstack.com/query
6. **TanStack Router** — https://tanstack.com/router
7. **TanStack Virtual** — https://tanstack.com/virtual
8. **React Hook Form** — https://react-hook-form.com/
9. **Zod** — https://zod.dev/
10. **Zustand** — https://zustand.docs.pmnd.rs/
11. **Jotai** — https://jotai.org/
12. **Radix UI** — https://www.radix-ui.com/
13. **shadcn/ui** — https://ui.shadcn.com/
14. **class-variance-authority** — https://cva.style/
15. **framer-motion** — https://www.framer.com/motion/
16. **Mock Service Worker (MSW)** — https://mswjs.io/
17. **React Testing Library** — https://testing-library.com/docs/react-testing-library/intro/
18. **eslint-plugin-jsx-a11y** — https://github.com/jsx-eslint/eslint-plugin-jsx-a11y
19. **eslint-plugin-react-hooks** — https://www.npmjs.com/package/eslint-plugin-react-hooks
20. **@tanstack/eslint-plugin-query** — https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query
21. **WAI-ARIA Authoring Practices** — https://www.w3.org/WAI/ARIA/apg/
22. **Web Content Accessibility Guidelines (WCAG) 2.2** — https://www.w3.org/TR/WCAG22/
