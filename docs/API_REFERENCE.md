# Third Eye MCP — API Reference

All endpoints require the `X-API-Key` header unless noted. Responses conform to the JSON envelope defined in `src/third_eye/constants.py`.

## 1. Authentication & Admin

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/admin/auth/login` | Exchange admin email/password for a short-lived API key. |
| `POST` | `/admin/auth/change-password` | Update admin password. |
| `GET` | `/admin/bootstrap/status` | Check if bootstrap admin exists. |

### API Keys
- `GET /admin/api-keys` – list keys (`include_revoked` optional).
- `POST /admin/api-keys` – create key (role, tenant, TTL, limits).
- `POST /admin/api-keys/{id}/rotate` – rotate secret.
- `POST /admin/api-keys/{id}/revoke` / `/restore` – lifecycle.
- `PATCH /admin/api-keys/{id}` – update limits/expiry/display name.

### Tenants
- `GET /admin/tenants`
- `POST /admin/tenants`
- `PATCH /admin/tenants/{id}`
- `POST /admin/tenants/{id}/archive`
- `POST /admin/tenants/{id}/restore`

### Profiles & Provider
- `GET /admin/profiles`
- `PUT /admin/profiles` – body `{ "profiles": { "security": { ... } } }`.
- `GET /admin/provider`
- `PUT /admin/provider` – body `{ "mode": "api|offline", "engine": { ... } }`.

### Environment Settings
- `GET /admin/settings`
- `PUT /admin/settings`

### Audits & Metrics
- `GET /admin/audit`
- `GET /admin/metrics/overview`

Refer to `tests/test_admin_api.py` for request/response fixtures.

## 2. Session Lifecycle

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/session` | Create a new session; returns `{ session_id, profile, settings, provider, portal_url }`. |
| `GET` | `/sessions` | List sessions accessible to the caller (tenant-aware). |
| `GET` | `/sessions/{session_id}` | Detailed session info (events, settings, eye status). |
| `GET` | `/session/{session_id}/events` | Timeline events (eye updates, custom events). |
| `POST` | `/session/{session_id}/clarifications` | Submit clarifying answers. |
| `POST` | `/session/{session_id}/resubmit` | Request re-review for an Eye. |
| `POST` | `/session/{session_id}/duel` | Launch a duel between agents. |
| `POST` | `/session/{session_id}/export` | Export session (`fmt=pdf|html`). |
| `POST` | `/session/{session_id}/revalidate` | Re-run Tenseigan & Byakugan on latest draft. |
| `PUT` | `/session/{session_id}/settings` | Update profile/overrides; triggers websocket broadcast. |

## 3. Eye Endpoints

Each Eye endpoint accepts a request of the form:
```json
{
  "context": {
    "session_id": "sess-123",
    "tenant": "cli",
    "user_id": "agent-7",
    "lang": "en",
    "budget_tokens": 1200,
    "settings": { ... }  // injected automatically by the server
  },
  "payload": { ... },
  "reasoning_md": "### Reasoning\n..." // when required
}
```

| Method/Path | Eye | Notes |
| --- | --- | --- |
| `POST /eyes/overseer/navigator` | Overseer Navigator | No LLM, returns schema primer. |
| `POST /eyes/sharingan/clarify` | Sharingan | Uses session ambiguity threshold. |
| `POST /eyes/helper/rewrite_prompt` | Prompt Helper | Requires clarifications output. |
| `POST /eyes/jogan/confirm_intent` | Jōgan | Validates ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT. |
| `POST /eyes/rinnegan/plan_requirements` | Rinnegan plan schema | Ingests plan markdown for embeddings. |
| `POST /eyes/rinnegan/plan_review` | Rinnegan plan review | Enforces rollback based on settings. |
| `POST /eyes/mangekyo/review_scaffold` | Mangekyō scaffold | Strictness derived from `mangekyo`. |
| `POST /eyes/mangekyo/review_impl` | Mangekyō impl |
| `POST /eyes/mangekyo/review_tests` | Mangekyō tests | Checks coverage thresholds. |
| `POST /eyes/mangekyo/review_docs` | Mangekyō docs |
| `POST /eyes/tenseigan/validate_claims` | Tenseigan | Citation cutoff from settings. |
| `POST /eyes/byakugan/consistency_check` | Byakugan | Consistency tolerance from settings. |
| `POST /eyes/rinnegan/final_approval` | Final approval |

Helper endpoints:
- `POST /session/{id}/clarifications`
- `POST /session/{id}/duel`

See unit tests in `tests/test_api.py` and `tests/test_eye_settings.py` for payload examples.

## 4. Websocket

`GET /ws/pipeline/{session_id}` (header `X-API-Key`). Messages:
- `settings_update` — `{ "type": "settings_update", "session_id", "data": { profile, overrides, effective, provider, pipeline }, "ts" }`
- `eye_update` — standard event payload per Eye.
- Custom events: `user_input`, `resubmit_requested`, `duel_requested`, etc.

Example (from `tests/test_admin_api.py::test_admin_key_accesses_sessions_and_pipeline`):
```json
{
  "type": "settings_update",
  "session_id": "sess-1",
  "data": {
    "profile": "enterprise",
    "effective": { ... }
  },
  "ts": 1738620384.123
}
```

## 5. Health & Metrics

| Path | Description |
| --- | --- |
| `GET /health/live` | Liveness probe. |
| `GET /health/ready` | Readiness (checks DB + Redis). |
| `GET /metrics` | Prometheus metrics. |

---

For onboarding flows and UI walkthroughs see [USER_GUIDE.md](../USER_GUIDE.md) and [ADMIN_GUIDE.md](ADMIN_GUIDE.md).
