### Rule 1.4
MUST: Prefer type aliases over interfaces.
Use type aliases for most domain records.

### Rule react.4.3
SHOULD: Keep effects for synchronization only.
Use dedicated effects only when interacting with external systems.

## Never
- `let` - use `const`
- `var` - use `const`

### Pattern: smart constructor
Use validated constructors for branded domain values.

```ts
// Good
const mkUserId = (raw: string) =>
  raw.length > 0
    ? some(raw as UserId)
    : none
```

```ts
// Bad
const userId = raw as UserId
```
