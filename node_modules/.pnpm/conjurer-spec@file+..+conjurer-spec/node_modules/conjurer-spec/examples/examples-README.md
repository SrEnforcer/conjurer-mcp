# Conjurer examples

Two patterns for organising Conjurer projects.

---

## Single-file pattern — `conjurer-site.cnj`

Everything in one file: charter, assets, assumptions, context, domain work,
targets, handovers. Best for:

- Projects that fit in a single session
- Demos and examples (this file is both)
- Early exploration before concerns solidify
- Sharing a complete project spec in one attachment

Attach the single file to any chat session. The MCP server parses the full
context from that one file.

**→ See [`conjurer-site.cnj`](conjurer-site.cnj)**

---

## Multi-file pattern — `conjurer-site/`

One file per concern. Best for:

- Projects spanning multiple sessions and team members
- Domains large enough that a single file becomes unwieldy
- When different concerns evolve at different speeds
- When different team members own different concerns

```
conjurer-site/
├── project.cnj        ← ROOT — charter, assets, assumptions
│                         Attach this when you are unsure which file to use
├── domain.cnj         ← entities, shapes, business rules, taxonomy
├── frontend.cnj       ← React app, routes, components, UI targets
├── api.cnj            ← Hono API, endpoints, MCP proxy
└── infrastructure.cnj ← CI/CD, deployment, environment config
```

**Attach pattern per task:**

| Task | Attach |
|---|---|
| Understand the project | `project.cnj` only |
| Model a new entity | `project.cnj` + `domain.cnj` |
| Build a React component | `project.cnj` + `domain.cnj` + `frontend.cnj` |
| Build an API endpoint | `project.cnj` + `domain.cnj` + `api.cnj` |
| CI/CD or deployment | `project.cnj` + `infrastructure.cnj` |

The MCP server resolves `:references` transitively — you don't need to
attach every file in the dependency chain manually. Attaching `frontend.cnj`
makes `domain.cnj` and `project.cnj` context available automatically via the
workspace service.

**→ See [`conjurer-site/`](conjurer-site/)**

---

## Form evaluation

Any form in a `.cnj` file can be evaluated in isolation.

In VS Code with the Conjurer MCP server running:
1. Select the form (the full s-expression, e.g. a `target` block)
2. Right-click → "Send to Copilot Chat"
3. Or type in the chat: `evaluate this: #domain.cnj:54:70`

The MCP server injects the full workspace context before evaluating, so
a form from `domain.cnj` has `project.cnj` assets and assumptions available
without you attaching them manually.

Forms are annotated in these files with `@eval filename.cnj:start:end`
comments so you can quickly find the line ranges.

---

## Naming conventions for multi-file projects

| File | What goes in it |
|---|---|
| `project.cnj` | Root charter, all assets, all operative assumptions |
| `domain.cnj` | `d/model`, `shape`, `r/rules`, `t/define`, `lore` |
| `frontend.cnj` | `target` for web/UI, component structure, route design |
| `api.cnj` | `target` for API/backend, endpoint contracts, auth rules |
| `infrastructure.cnj` | `target` for CI/CD, deployment, env config |
| `{feature}.cnj` | A specific feature's domain work + targets, when large |

Each concern file has its own `charter` with `:version` tracking
independently. Cross-cutting decisions always go in `project.cnj`.
