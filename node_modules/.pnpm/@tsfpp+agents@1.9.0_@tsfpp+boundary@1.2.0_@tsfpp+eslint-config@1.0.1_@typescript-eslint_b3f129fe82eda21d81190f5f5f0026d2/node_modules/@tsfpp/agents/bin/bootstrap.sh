#!/usr/bin/env bash
# tsfpp-bootstrap.sh — spin up a TSF++ sandbox in the current directory
# Usage: bash tsfpp-bootstrap.sh [project-name]
# If no name is given, the current directory is used as-is.

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
DIM='\033[2m'
RESET='\033[0m'

ok()  { echo -e "${GREEN}✓${RESET} $1"; }
dim() { echo -e "${DIM}$1${RESET}"; }

# ── Project directory ─────────────────────────────────────────────────────────

PROJECT_NAME="${1:-}"
PACKAGE_NAME="${2:-$PROJECT_NAME}"

if [[ -n "$PROJECT_NAME" ]]; then
  mkdir -p "$PROJECT_NAME"
  cd "$PROJECT_NAME"
  ok "Created directory: $PROJECT_NAME"
fi

# ── 1. git init ───────────────────────────────────────────────────────────────

if git rev-parse --git-dir > /dev/null 2>&1; then
  ok "Git repository already exists — skipping git init"
else
  dim "Initialising git repository…"
  git init -b main > /dev/null
  ok "git init -b main"
fi

# ── 2. pnpm init ──────────────────────────────────────────────────────────────

dim "Initialising package.json…"
pnpm init --silent > /dev/null 2>&1
ok "pnpm init"

# ── 3. Install TSF++ ecosystem ────────────────────────────────────────────────

dim "Installing TSF++ packages (this may take a moment)…"
pnpm add \
  @tsfpp/prelude \
  @tsfpp/boundary

pnpm add -D \
  typescript \
  @types/node \
  @tsfpp/standard \
  @tsfpp/tsconfig \
  @tsfpp/eslint-config \
  @tsfpp/agents
ok "Installed TSF++ ecosystem"

# ── 4. tsconfig.json ──────────────────────────────────────────────────────────

dim "Writing tsconfig.json…"
cat > tsconfig.json << 'EOF'
{
  "extends": "@tsfpp/tsconfig/app",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF
ok "tsconfig.json"

# ── 5. eslint.config.js ───────────────────────────────────────────────────────

dim "Writing eslint.config.js…"
cat > eslint.config.js << 'EOF'
import tsfpp from '@tsfpp/eslint-config'
export default tsfpp
EOF
ok "eslint.config.js"

# ── 6. package.json — type + scripts ─────────────────────────────────────────

dim "Patching package.json…"
npm pkg set type="module"                           --silent
npm pkg set version="0.1.0"                         --silent
[[ -n "$PACKAGE_NAME" ]] && npm pkg set name="$PACKAGE_NAME" --silent
npm pkg set scripts.typecheck="tsc --noEmit"        --silent
npm pkg set scripts.lint="eslint src"               --silent
npm pkg set scripts.check="pnpm typecheck && pnpm lint" --silent
ok "package.json scripts"

# ── 6b. release-please-manifest.json ─────────────────────────────────────────

if [[ ! -f release-please-manifest.json ]]; then
  dim "Writing release-please-manifest.json…"
  echo '{ ".": "0.1.0" }' > release-please-manifest.json
  ok "release-please-manifest.json"
else
  ok "release-please-manifest.json already exists — skipping"
fi

# ── 7. src/index.ts ───────────────────────────────────────────────────────────

dim "Creating src/index.ts…"
mkdir -p src
cat > src/index.ts << 'EOF'
// TSF++ sandbox — start here
// Import from @tsfpp/prelude to explore ADTs and combinators:
//
// import { ok, err, some, none, pipe, absurd } from '@tsfpp/prelude'
EOF
ok "src/index.ts"

# ── 8. README.md ──────────────────────────────────────────────────────────────

if [[ ! -f README.md ]]; then
  dim "Creating README.md…"
  cat > README.md << EOF
# ${PROJECT_NAME:-$(basename "$PWD")}

> Built with [TSF++](https://github.com/tsfpp/standard).

## Getting started

\`\`\`sh
pnpm install
pnpm check        # typecheck + lint
\`\`\`

## Scripts

| Command | Description |
|---|---|
| \`pnpm typecheck\` | Type-check all TypeScript |
| \`pnpm lint\` | Lint all TypeScript |
| \`pnpm check\` | Typecheck + lint |

## Standards

This project conforms to the [TSF++ coding standard](https://github.com/tsfpp/standard).
EOF
  ok "README.md"
else
  ok "README.md already exists — skipping"
fi

# ── 9. CHANGELOG.md ───────────────────────────────────────────────────────────

if [[ ! -f CHANGELOG.md ]]; then
  dim "Creating CHANGELOG.md…"
  cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.
This file follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

<!-- RELEASE-PLEASE-INSERTION-POINT -->

## [Unreleased]
EOF
  ok "CHANGELOG.md"
else
  ok "CHANGELOG.md already exists — skipping"
fi

# ── 10. Universal AI layout ────────────────────────────────────────────────────

dim "Generating universal AI sources and compatibility output…"
node node_modules/@tsfpp/agents/init.mjs --yes
ok "Universal AI layout installed"

# ── 11. .gitignore ──────────────────────────────────────────────────────────────

if [[ ! -f .gitignore ]]; then
  dim "Writing .gitignore…"
  cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules/

# Build output
dist/
build/
out/
coverage/
.turbo/

# TypeScript
*.tsbuildinfo

# Environment
.env
.env.*
!.env.example

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea/

# pnpm
.pnpm-store/

# Logs
*.log
npm-debug.log*
pnpm-debug.log*
GITIGNORE
  ok ".gitignore"
else
  ok ".gitignore already exists — skipping"
fi

# ── 12. Husky ────────────────────────────────────────────────────────────────────

dim "Activating Husky hooks…"
pnpm exec husky install > /dev/null 2>&1 && ok "Husky hooks activated" || ok "Husky not configured — skipping (run 'pnpm exec husky install' after adding husky to package.json)"

# ── 13. Done ────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}TSF++ sandbox ready.${RESET}"
echo ""
echo "  pnpm check               — typecheck + lint"
echo "  code .                   — open in VS Code"
echo "  /trunk-init-repo         — initialise git remote and push to GitHub"
echo ""