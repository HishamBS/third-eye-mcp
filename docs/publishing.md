# Publishing Third Eye MCP

This guide walks through the release workflow for tagging and publishing `third-eye-mcp` to npm.

## One-command pipeline

Prefer automation? Run the bundled release pipeline; it will prompt for the version bump, execute the gate, publish to npm, create a tag, and offer to push:

```bash
bunx third-eye-mcp release:ship
```

Make sure your git working tree is clean before running the pipeline; the command stages a release commit, publishes to npm, tags the release, and can push to `origin` on your behalf.

The sections below document each step if you need manual control.

## 1. Prerequisites

- Clean `release/go-live` branch checked out (`git status` should be clean).
- All tests and linting pass locally (`pnpm release:prepare --dry-run`).
- npm credentials configured (`npm whoami`).
- Two-factor authentication enabled on the npm account.

## 2. Update Version & Changelog

Run the interactive release assistant:

```bash
bunx third-eye-mcp release
```

This flow will:

1. Show current version and git status.
2. Prompt for the new semantic version (patch / minor / major / custom).
3. Optionally generate release notes into `CHANGELOG.md`.
4. Stage version updates and changelog.

> ⚠️ Do **not** publish yet. Verify all staged changes first.

## 3. Validate Release Artifacts

```bash
bun run build:cli       # refresh dist/ binaries before packing
pnpm release:prepare --dry-run
pnpm health:check       # capture JSON response for release notes
pnpm ws:check           # capture reconnect transcript
```

This command executes the release gate pipeline locally:

- Linting (`pnpm lint`)
- Tests with coverage (`pnpm test:coverage`)
- Build (packages, server, UI, CLI)
- `pnpm pack` artifact generation
- `npm publish --dry-run`

Artifacts are written to `dist/` and `third-eye-mcp-<version>.tgz`.

## 4. Commit & Tag

```bash
git add package.json pnpm-lock.yaml CHANGELOG.md
# Include other versioned files if present

git commit -m "chore(release): vX.Y.Z"
git tag -s vX.Y.Z -m "Third Eye MCP vX.Y.Z"
```

## 5. Publish

```bash
pnpm release:publish
```

This runs `release:prepare` (non-dry) and calls `npm publish --access public`.

Verify the release:

- npm: `https://www.npmjs.com/package/third-eye-mcp`
- GitHub tag: `git push origin vX.Y.Z`
- Branch: `git push origin release/go-live`
- Archive diagnostics (`health.json`, `ws.log`) with the release notes

## 6. Post-Publish Checklist

- Run `pnpm health:check` against the deployed instance.
- Execute `pnpm ws:check` for WebSocket verification.
- Update documentation screenshots and badges if coverage changed.
- Announce release with changelog summary.

## Automation Notes

- GitHub Actions workflow `release.yml` enforces the same gates as `release:prepare`.
- Coverage badge can be refreshed via `pnpm coverage:badge` once coverage data exists.
- All release commands require Bun to be installed locally.
