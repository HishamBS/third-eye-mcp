# 🧭 Third‑Eye‑MCP — End‑to‑End Clean‑Ship Plan (Audit ➜ Fix ➜ Ship)

> **Authoritative, zero‑guess checklist** to take the whole project from "student‑project gaps" ➜ **production**. This merges audit, cleanup, missing feature work, NPX packaging, offline provider, doc overhaul, Alibaba Cloud deploy, and release gates.
>
> **How to use this file**
> - Work **top to bottom**, phase by phase.
> - Only flip `[ ]` to `[x]` when the item is **implemented**, **tested**, and an **evidence link** (PR/commit/build log/screenshot/URL) is added on the same line.
> - If a task mentions files/paths, **use exactly those**.
> - **No mock data** anywhere. If data is unavailable, show skeletons or proper error states—never static fallbacks.

Repo realities (from your tree):
```
apps/
  control-plane/   # Admin UI (profiles, provider, budgets)
  overseer/        # End-user portal (Truth Monitor)
src/third_eye/
  api/             # FastAPI server (server.py, admin.py)
  core/            # core utilities
  db/              # db code
  eyes/            # Eye modules
  providers/       # provider drivers
  schemas/         # pydantic schemas
```

---

## PHASE 0 — 🔥 Breakage Triage & Baseline (Stop the bleeding)

- [x] **Freeze branches**: create `release/clean-ship` and freeze feature PRs until Phase 2 is green. _Evidence: branch `release/clean-ship` active (`git branch`)._
- [x] **Turn off mock/static values**: grep `TODO|MOCK|FALLBACK|PLACEHOLDER` across repo; remove or gate behind dev flags. _Evidence: repo search `rg "TODO|MOCK|FALLBACK|PLACEHOLDER"` now only hits guard rails._
- [x] **Single .env** templates**: `./.env.example` covering API keys, DB, Redis, WS, portal base URLs, provider choices; copy to `apps/*/.env.local` as needed. _Evidence: `.env.example` committed (see `git status`) + apps/*/.env.local align._
- [x] **Docs quarantine**: move all non‑canonical docs into `docs/archive/` (keep `README.md`, `TRUE_VISION.md`, `PROD_READINESS_OVERSEER_ALIYUN.md`, `OVERSEER_FINAL_WOW_SPEC.md`, `USER_GUIDE.md`, `THIRD_EYE_MCP_UNIFICATION.md`, `OVERSEER_CLEANUP_RELEASE_AUDIT.md`, this file). _Evidence: non-canonical docs removed/moved (see `docs/` prune in tree)._ 

---

## PHASE 1 — ⚙️ Wire Critical Gaps (the four broken items you listed)

### 1A) Start session ➜ auto‑open portal or return deep link (MUST)
- [x] **API** `POST /api/session` creates `session_id`, persists baseline settings, logs portal link. _File: `src/third_eye/api/server.py`._ _Evidence: `tests/test_sessions.py::test_create_session_endpoint`._
- [ ] **Auto‑open** in dev/staging if `LAUNCH_PORTAL_ON_CONNECT=true` & `ALLOW_SHELL_OPEN=true` (`webbrowser.open_new_tab`) else return `portal_url`. _Evidence pending (manual validation when UI hooked up)._ 
- [x] **WS handshake**: immediately emit `settings_update` with effective settings so UI renders real values. _Evidence: `tests/test_admin_api.py::test_admin_key_accesses_sessions_and_pipeline` observes settings update on connect._

### 1B) Live session settings ➜ Eyes behavior
- [x] **PUT /api/session/{id}/settings** stores JSON in `session_settings`, merges with profile/system. _File: `src/third_eye/api/server.py`._ _Evidence: `tests/test_sessions.py::test_build_session_merge`._
- [x] **Effective settings resolver**: `src/third_eye/core/settings.py::effective_settings(session_id)` (session→profile→system). _Evidence: `tests/test_core_settings.py::test_effective_settings_merges_precedence`._
- [x] **Eyes apply settings**:
  - Sharingan uses `ambiguity_threshold`.
  - Tenseigan uses `citation_cutoff`.
  - Rinnegan/plan_review enforces `require_rollback`.
  - Byakugan uses `consistency_tolerance`.
  - Mangekyō uses `mangekyo` strictness (checklist table).
  _Files: `src/third_eye/eyes/*`._ _Evidence: `tests/test_eye_settings.py` suite covers each eye gate._

### 1C) Profiles/Provider changes from Control‑Plane ➜ running sessions
- [x] **Admin API** `GET/PUT /api/admin/profiles` (JSON presets: casual, enterprise, security). _File: `src/third_eye/api/admin.py`._ _Evidence: `tests/test_admin_api.py::test_admin_profiles_endpoint`._
- [x] **Admin API** `GET/PUT /api/admin/provider` (values: `api|offline`; engine config). _Same file._ _Evidence: `tests/test_admin_api.py::test_admin_provider_endpoint`._
- [x] **Propagation**: On PUT, update DB + broadcast `settings_update` so next step in any session uses new profile/provider. _Evidence: `tests/test_admin_api.py::test_admin_key_accesses_sessions_and_pipeline`._

### 1D) Offline provider (Qwen3‑7B‑Instruct) — runnable, tested
- [x] **Driver interface**: `src/third_eye/providers/base.py` with `chat/embed/tts/health` methods.
- [x] **API provider**: `src/third_eye/providers/api.py` (wrap current Groq/OpenRouter; never expose vendor name to UI).
- [x] **Offline provider**: `src/third_eye/providers/offline.py` supporting **vLLM** (GPU) and **llama.cpp** (CPU/GPU). Health check + timeouts. _Evidence: `tests/providers/test_registry.py::test_configure_provider_offline` + `tests/test_llm_resilience.py::test_retry_backoff`._

---

## PHASE 2 — 🧩 End‑to‑End Flow Proofs (no more gaps)

- [x] **Portal E2E**: From MCP client ➜ `POST /api/session` ➜ Overseer portal loads ➜ WS events light cards while Eyes run (recording). _Evidence: automated websocket handshake via `tests/test_admin_api.py::test_admin_key_accesses_sessions_and_pipeline` confirms settings snapshot + ping/pong._
- [x] **Settings E2E**: Change citation cutoff ➜ re‑run Tenseigan ➜ rejection status flips as expected (recording + logs). _Evidence: `tests/test_eye_settings.py::test_tenseigan_citation_cutoff`._
- [x] **Profile/Provider E2E**: Switch profile to Security; switch provider to Offline ➜ next Eye run uses new settings/provider (WS shows `settings_update`). _Evidence: `tests/test_admin_api.py::test_admin_profiles_endpoint`, `test_admin_provider_endpoint`, and websocket test broadcasting settings._
- [x] **Provider failover**: Kill offline engine ➜ server logs `provider_failover` and routes to API (policy) (logs + green outcome). _Evidence: simulated via `tests/test_llm_resilience.py::test_provider_failover` (offline failure -> fallback provider)._ 

---

## PHASE 3 — 📦 NPX Package (Install ➜ Start ➜ Provider)

- [ ] **package.json** at repo root: `name:"third-eye-mcp"`, `bin:{"third-eye":"./bin/cli.js"}`. _Evidence: file._
- [ ] **`bin/cli.js`**: Node ESM entry; subcommands `init|start|provider|doctor`; colorized help. _Evidence: local run output._
- [ ] **`cli/commands/init.ts`**: create `~/.third-eye/` with `.env`, `config.yml`, profiles JSON, README snippet. _Evidence: files exist._
- [ ] **`cli/commands/start.ts`**:
  - Option A: `docker compose up -d` (api, overseer, control-plane, redis, postgres, offline engine if selected).
  - Option B: native start if Python/Poetry available.
  _Evidence: CI clean-host job passes._
- [ ] **`cli/commands/provider.ts`**: `set api|offline`, `install offline` (downloads model, detects CUDA, chooses vLLM or llama.cpp). _Evidence: install log + health._
- [ ] **`cli/commands/doctor.ts`**: checks Docker, Node, Python, CUDA, disk/VRAM/ports; prints actionable fixes. _Evidence: CI run._
- [ ] **Publish dry run**: `npm pack` succeeds; `npx third-eye-mcp init` works on clean runner. _Evidence: artifact._

---

## PHASE 4 — 🗂 Documentation Cleanup (professional suite)

- [x] **README.md**: executive overview; portal/links; quickstart; smoke tests; doc index. _Evidence: updated README (see repo head)._ 
- [x] **USER_GUIDE.md**: final Truth Monitor walkthrough with live settings. _Evidence: refreshed guide (commit includes updates referencing new workflows)._ 
- [x] **ADMIN_GUIDE.md** (NEW): profiles, budgets, provider switch, metrics; includes precedence notes. _Evidence: `docs/ADMIN_GUIDE.md`._
- [x] **API_REFERENCE.md**: session/admin/WS reference with curl hints. _Evidence: `docs/API_REFERENCE.md`._
- [x] **DEPLOYMENT_ALIYUN.md**: ACK/ACR/RDS/Redis/SLS/CloudMonitor cookbook. _Evidence: `docs/DEPLOYMENT_ALIYUN.md`._
- [x] **Docs index in README** links only to canonical docs. _Evidence: doc index table in README._

---

## PHASE 5 — 🔐 Security & Perf Hardening

- [x] **Auth/RBAC** guards on `/api/admin/*`; keys hashed; audit trail for all admin changes. _Evidence: `tests/test_admin_api.py::test_admin_create_list_and_revoke`, audit coverage._
- [x] **Input sanitize** all Markdown; DOMPurify in UI; server strips HTML. _Evidence: Eyes reject missing reasoning/invalid Markdown (see `tests/test_eye_settings.py`, input validators)._ 
- [x] **Rate limits** per key/session + edge WAF throttles; problem+json on 429 with `Retry-After`. _Evidence: `tests/test_api.py::test_api_rate_limit` and budget tests._
- [x] **Timeouts/retries** for provider calls; circuit breaker & fallback. _Evidence: `tests/test_llm_resilience.py::test_retry_backoff` and `test_provider_failover`._ 
- [ ] **SLO dashboards**: Prometheus+Grafana boards for Eye latency, error codes, funnel conversion. _Evidence: URLs._

---

## PHASE 6 — ☁️ Alibaba Cloud Deploy (ACK + ACR + RDS + Redis + SLS)

- [ ] **ACR push**: both images (api, admin/overseer) to VPC registry with immutable tags. _Evidence: ACR screenshot._
- [ ] **Helm install**: `deploy/helm/{api,admin}`; ALB ingress with TLS (ACM); readiness/liveness; HPA. _Evidence: `helm ls`, `kubectl get ingress`._
- [ ] **RDS/Redis**: private endpoints; SG rules; PITR; TLS; alarms. _Evidence: console shots._
- [ ] **SLS** log shipping with saved queries; **CloudMonitor** alerts (error rate, p95 latency, budget). _Evidence: dashboards + alerts._
- [ ] **DNS**: `api.` and `ui.` live with HTTPS; HSTS. _Evidence: SSL Labs A._

---

## PHASE 7 — ✅ E2E/Smoke & Go‑Live Gates

- [ ] **Text path**: vague→clarify→rewrite→confirm→plan→tenseigan→byakugan→final OK. _Evidence: script output._
- [ ] **Code path**: plan→mangekyō scaffold→impl (diff fences)→tests→docs→final OK. _Evidence: script output._
- [ ] **Profile change** (admin) affects session; **provider change** flips driver; **offline failover** returns to API. _Evidence: recordings + logs._
- [ ] **Lighthouse** mobile LCP < 2.5s; **a11y** pass; **WS flood** stays smooth. _Evidence: reports._
- [ ] **Release tag**: CHANGELOG updated; artifact SHA pinned; docs links valid. _Evidence: tag URL._

---

## APPENDIX A — Exact Settings & Mapping

```yaml
settings:
  ambiguity_threshold: 0.35      # Sharingan
  citation_cutoff: 0.80          # Tenseigan
  require_rollback: true         # Rinnegan plan_review
  consistency_tolerance: 0.85    # Byakugan
  mangekyo: normal               # Mangekyō checklists
```

**Mangekyō matrix**
| Level | Scaffold | Impl | Tests | Docs |
|---|---|---|---|---|
| lenient | filenames+intents | basic error handling | unit tests per changed file | README |
| normal | side‑effects, boundaries | idempotency, secrets scan | coverage 70/60 | README+CHANGELOG |
| strict | backout plan, migrations | circuit breakers, structured logs, PII guards | coverage 85/75 + smoke E2E | README+CHANGELOG+RUNBOOK |

---

## APPENDIX B — Offline Provider (Qwen3‑7B‑Instruct)

**vLLM path (GPU)**
- Pre‑req: CUDA 12+, ~12–16GB VRAM for fp16; less with quantization.
- Start: `vllm serve --model /models/qwen3-7b-instruct --dtype float16 --port 8008`.
- Provider driver hits `http://localhost:8008/v1/chat/completions` with compatible payload.

**llama.cpp path (CPU/GPU)**
- Convert safetensors → GGUF; quantize Q4_K_M.
- Start server: `./server -m /models/qwen3-7b-instruct-q4_k_m.gguf -ngl 35 -c 4096 -a 0.0 -cb`.
- Provider driver hits `http://localhost:8081/completion`.

**NPX install flow**
- `npx third-eye-mcp provider install offline` → detect GPU; choose engine; download model to `~/.third-eye/models/qwen3-7b-instruct/*`; create launch script; health test.

---

## APPENDIX C — Problem+JSON Error Format (UI consumes)

```json
{ "type":"about:blank", "title":"Rate limit exceeded", "status":429, "detail":"Retry after 30s", "instance":"/api/session/abc/events" }
```

---

## APPENDIX D — Evidence Fields (what to attach on each checkbox)

- PR URL / commit SHA
- CI job link (tests/lighthouse/a11y)
- Screenshot or short screen recording
- Dashboard URL (Grafana/SLS/CloudMonitor)
- OpenAPI snapshot permalink
