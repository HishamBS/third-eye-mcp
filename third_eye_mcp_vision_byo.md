# 🧿 THIRD‑EYE MCP — Final Vision (BYO, Local‑First, WOW)

> **This is the canonical, bring‑your‑own (BYO) vision** for **Third‑Eye MCP**. It merges your original Overseer concept (Eyes as strict gatekeepers) with a modern, local‑first developer experience and every WOW factor we designed. This document is implementation‑ready: it specifies architecture, features, APIs, UI, providers, testing, and acceptance gates with **checklists**.
>
> **Install target:** `npx third-eye-mcp` (open‑source). Optional Docker compose. No multi‑tenant admin baggage. Developers run it locally with their own keys or local models.

---

## 0) Non‑Negotiables
- [ ] **Overseer principle**: Eyes **never** author deliverables; host agents do. Eyes only clarify, plan, validate, gate, and approve.
- [ ] **Local‑first DX**: one command boots **server + UI + SQLite**; no accounts.
- [ ] **BYO providers** v1: **Groq**, **OpenRouter**, **Ollama**, **LM Studio** (UI label: **Provider**; vendor names are not shown to end users).
- [ ] **Routing**: map **any model** to **any Eye tool** with a fallback model.
- [ ] **Personas**: built‑in editor & versioning per Eye. Stored locally; hot‑reload.
- [ ] **Theme**: Single **Third‑Eye MCP** dashboard (Naruto Eyes visual language).
- [ ] **Privacy**: data stays on disk; telemetry strictly **opt‑in**.
- [ ] **Docs**: professional, linked from README; no stale files.

---

## 1) Architecture (Monorepo)
```
third-eye-mcp/
├─ apps/
│  ├─ ui/                  # Next.js 15 (App Router), Tailwind + shadcn/ui + Framer Motion
│  └─ server/              # Bun + Hono, REST + WebSockets, MCP host
├─ packages/
│  ├─ core/                # Eyes registry, runEye orchestrator, envelope validation
│  ├─ providers/           # groq, openrouter, ollama, lmstudio adapters
│  ├─ db/                  # SQLite schema, migrations, query layer (Drizzle/Kysely)
│  ├─ config/              # zod schemas, loader (env + ~/.third-eye-mcp/config.json)
│  └─ types/               # shared TS types (envelopes, tools, provider payloads)
├─ cli/
│  └─ index.ts             # `npx third-eye-mcp` entry
├─ docker/
│  ├─ Dockerfile
│  └─ docker-compose.yml
├─ .github/workflows/      # CI (typecheck, unit/int/e2e, release)
└─ docs/                   # mdx docs (Vision, Architecture, Providers, Routing, Personas, MCP API, Security, FAQ)
```

**Why Bun?** One ultrafast runtime for server + CLI + tests; minimal overhead.

---

## 2) Data Model (SQLite)
**DB path:** `~/.third-eye-mcp/mcp.db` (override `MCP_DB`).

- [ ] `app_settings(key TEXT PRIMARY KEY, value TEXT)` — JSON for theme, auto‑open, telemetry opt‑in.
- [ ] `provider_keys(id INTEGER PK, provider TEXT, label TEXT, encrypted_key BLOB, metadata JSON, created_at)`
- [ ] `models_cache(provider TEXT, model TEXT, display_name TEXT, family TEXT, capability_json JSON, last_seen)`
- [ ] `eyes_routing(eye TEXT PRIMARY KEY, primary_provider TEXT, primary_model TEXT, fallback_provider TEXT, fallback_model TEXT)`
- [ ] `personas(eye TEXT, version INTEGER, content TEXT, active INTEGER, created_at, PRIMARY KEY(eye,version))`
- [ ] `sessions(id TEXT PRIMARY KEY, created_at, status TEXT, config_json JSON)`
- [ ] `runs(id TEXT PRIMARY KEY, session_id TEXT, eye TEXT, provider TEXT, model TEXT, input_md TEXT, output_json JSON, tokens_in INTEGER, tokens_out INTEGER, latency_ms INTEGER, created_at)`

**Security**: keys encrypted in OS keychain when available; fallback AES‑256‑GCM with user passphrase (file perms 600).

---

## 3) Provider Layer (BYO)
- [ ] Unified interface: `listModels()`, `complete(req)`, `health()`.
- [ ] Adapters: **groq**, **openrouter**, **ollama**, **lmstudio** (fetch‑based, small).
- [ ] Model cache refresh at startup + manual refresh in UI.
- [ ] Local endpoints default: Ollama `http://127.0.0.1:11434`, LM Studio `http://127.0.0.1:1234`.

**Checklist**
- [ ] Keys saved via encrypted store.
- [ ] Health badge in UI.
- [ ] Error normalization (rate‑limit, timeout) → problem+json.

---

## 4) Routing (Eye → Provider/Model)
- [ ] Routing matrix page (grid: Eyes × Models). Drag‑drop to set primary; click to set fallback.
- [ ] Resolution:
  1) Load active persona for Eye.
  2) Call primary (provider+model).
  3) If invalid envelope → retry once with strict JSON prefix.
  4) If still invalid and fallback exists → call fallback.
  5) Persist `runs`; broadcast WS `eye_update`.
- [ ] Validation with **zod** (shared types). Unknown codes forbidden.

---

## 5) Eyes (Tools Registry)
Eyes act as **contracts**: strict JSON envelopes + status codes. No authoring.

- [ ] **Sharingan** — Ambiguity Radar (+ smart code detection). Outputs: score, x questions, `is_code_related`, reasoning.
- [ ] **Prompt Helper** — Prompt Engineer (ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT). No content generation.
- [ ] **Jōgan** — Intent confirmation.
- [ ] **Rinnegan** — Plan schema + plan review + final approval aggregator.
- [ ] **Mangekyō** — Code gates (Scaffold → Impl → Tests → Docs). Requires `diffs_md` fences + reasoning.
- [ ] **Tenseigan** — Evidence validator (per‑claim citations + confidence cutoff).
- [ ] **Byakugan** — Consistency vs history (local runs).

**Checklist**
- [ ] Envelope schemas implemented in `packages/types` with `zod`.
- [ ] Status code registry enforced at compile‑time + tests.

---

## 6) Server (Bun + Hono)
**Routes**
- [ ] `GET /health` → `{ ok:true }`
- [ ] `POST /session` → create session; returns `{ sessionId, portalUrl }`; auto‑open if `AUTO_OPEN=true`.
- [ ] `GET /session/:id/runs` → timeline
- [ ] `POST /mcp/run` → `{ eye, input, sessionId }` → returns envelope
- [ ] `GET /models/:provider` → list models
- [ ] `GET /routing` | `POST /routing` → CRUD
- [ ] `GET /personas` | `POST /personas` → list, stage (`version+1`), publish (set `active=1`)

**WebSocket**
- [ ] `/ws/monitor?sessionId=…` → streams `eye_update`, persona/routing changes.

**Config**
- [ ] `packages/config` merges env + `~/.third-eye-mcp/config.json`; typed via zod.

---

## 7) Unified Dashboard (Next.js 15)
**Look & feel**: Naruto Eyes PNG icons; dark, premium, motion. No emojis.

**Pages & WOW Factors**
1) **Sessions** — New Session, recent list, auto‑open newest.  
   - [ ] Auto‑open toggle in Settings.  
2) **Monitor** — Truth Monitor (7 Eye cards with live WS), timeline, **Replay** (speed slider), **Evidence Lens** (green/red spans with citation popovers).  
   - [ ] Live status chips 🟢/🔴/🟡.  
3) **Adaptive Clarification** — Sharingan shows Ambiguity score bar; questions answered inline.  
   - [ ] Post answers → Prompt Helper auto‑runs.  
4) **Modes** — Novice (plain) / Expert (raw JSON envelopes & metrics).  
5) **Hallucination Kill Switch** — Re‑run Tenseigan + Byakugan; block on failure with actionable fixes.  
6) **Custom Strictness** — Sliders for ambiguity threshold, citation cutoff, consistency tolerance, Mangekyō strictness; saved per session.  
7) **Persona Voice (toggle)** — UI decoration + optional TTS (local or provider TTS—**UI only**, never required).  
8) **Session Memory** — Byakugan references prior runs; side panel with links.  
9) **Duel of Agents** — Run two providers/models; side‑by‑side verdict chips; winner ribbon.  
10) **Strictness Profiles** — Casual / Enterprise / Security buttons applying preset sliders.  
11) **Visual Plan Renderer** — File Impact tree + Kanban columns for Plan/Scaffold/Impl/Tests/Docs.  
12) **User Contribution Mode** — Answer clarifications inline; all answers logged to timeline.  
13) **Why Not Approved?** — ❌ opens Issues + Fixes modal with **Resubmit** CTA.  
14) **Leaderboards / Metrics** — First‑try approvals, hallucinations caught, average clarifications.  
15) **Replay Export** — PDF transcript or static HTML replay (admin/offline mode OK).

**Checklist**
- [ ] Every view reads **real data**; skeletons/errors only if pending or failed.  
- [ ] Evidence Lens uses Tenseigan claim spans.

---

## 8) CLI — `npx third-eye-mcp`
- [ ] `up` — start server + UI; open browser to portal.  
- [ ] `db open` — open DB browser route.  
- [ ] `reset` — wipe local data after confirmation.  
- [ ] (optional) `docker up` — run compose for server+ui(+ollama).

`package.json` bin: `{ "third-eye-mcp": "cli/index.ts" }`

---

## 9) Security & Performance
- [ ] Bind `127.0.0.1` by default; warn on `0.0.0.0`.
- [ ] Keys encrypted at rest; passphrase stored with file perms 600 when keychain unavailable.
- [ ] Markdown sanitized (DOMPurify) everywhere.
- [ ] Provider timeouts & retries; report tokens & latency; WS flood test (≥1000 events/min) keeps UI responsive.

---

## 10) Testing & CI/CD
- [ ] **Unit** (Vitest): providers, runEye, envelope validator, routing fallback.  
- [ ] **Integration**: `/mcp/run` + timeline persistence; WS events.  
- [ ] **E2E** (Playwright): `npx third-eye-mcp up` → create session → Sharingan questions → Prompt Helper → Monitor updates.  
- [ ] **CI**: bun install, typecheck, unit+integration+E2E, build; semantic‑release → npm publish.

---

## 11) Docker (optional)
- [ ] Compose launches server, ui, and optional `ollama` container using host networking; volume‑mount `~/.third-eye-mcp`.

---

## 12) Documentation (linked from README)
- [ ] **README** — Problem, Features, Quickstart, Screenshots, Commands.  
- [ ] **docs/VISION.md** — this file condensed.  
- [ ] **docs/ARCHITECTURE.md** — diagrams, data flow.  
- [ ] **docs/PROVIDERS.md** — BYO keys, local endpoints.  
- [ ] **docs/ROUTING.md** — matrix usage, fallback.  
- [ ] **docs/PERSONAS.md** — editing/publishing.  
- [ ] **docs/MCP_API.md** — `/mcp/run`, envelopes, error codes.  
- [ ] **docs/SECURITY.md** — local‑first privacy, encryption.  
- [ ] **docs/FAQ.md** — common issues.  
- [ ] **docs/CONTRIBUTING.md** — style, checks, PR flow.

---

## 13) Acceptance Gates (Go/No‑Go)
- [ ] `npx third-eye-mcp up` opens the portal; **Sessions → Monitor** shows WS updates for Eyes in real time.  
- [ ] Personas: stage new version, publish; next run uses it without restart.  
- [ ] Routing matrix: primary+fallback; fallback triggers on invalid JSON; timeline shows both attempts.  
- [ ] Providers: Groq/OpenRouter (BYO keys) + Ollama/LM Studio (local) all list models & run.  
- [ ] Evidence Lens: unsupported claim highlighted red until cited.  
- [ ] Kill Switch reruns validation and blocks on missing citations/contradictions.  
- [ ] Duel mode renders side‑by‑side verdicts and winner.  
- [ ] Leaderboards populate; export PDF/HTML works offline.  
- [ ] CI green; npm publish succeeded; version tag & changelog created.

---

## 14) Roadmap (post‑v1 ideas)
- [ ] Plugins for budgets/rate limits (opt‑in).  
- [ ] WebRTC P2P session sync.  
- [ ] Embeddings store for richer Byakugan memory.  
- [ ] TTS voice presets (local→edge providers) as separate package.

---

> When all boxes are `[x]`, cut **v1.0.0** on npm, attach screenshots in README, and post a demo video. This delivers the exact experience you envisioned: **strict, explainable Eyes** + **beautiful dashboard** + **BYO providers** with the simplest possible developer story.

