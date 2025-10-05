# Third Eye MCP — Admin Guide

This guide explains how to operate the Control Plane API and UI. All admin endpoints require an API key with role `admin`.

## 1. Bootstrap & Auth

1. Set `ADMIN_BOOTSTRAP_PASSWORD` in `.env`.
2. Start the API and call `POST /admin/bootstrap/status` to confirm an admin account exists.
3. Use `POST /admin/auth/login` to receive a short-lived admin API key. Store it securely.
4. Rotate keys via `POST /admin/api-keys/{id}/rotate` and revoke/restore as needed (`tests/test_admin_api.py::test_admin_create_list_and_revoke`).

## 2. Profiles

Profiles encapsulate default session settings (`ambiguity_threshold`, `citation_cutoff`, `require_rollback`, `consistency_tolerance`, `mangekyo`).

- `GET /admin/profiles` returns the merged list of canonical presets (casual/enterprise/security) plus any custom entries.
- `PUT /admin/profiles` accepts a JSON object of profile updates. Values are normalised before storage.
- Every change emits an audit event and is available immediately to sessions (`tests/test_admin_api.py::test_admin_profiles_endpoint`).

### Recommended Profiles
| Profile | Details |
| --- | --- |
| `casual` | Higher ambiguity tolerance, relaxed Mangekyō gates. |
| `enterprise` | Production defaults (balanced strictness). |
| `security` | Lowest ambiguity tolerance, strict Mangekyō requirements. |

## 3. Provider Management

Third Eye supports Groq, OpenRouter, and the Offline (vLLM/llama.cpp) provider.

- `GET /admin/provider` returns the current mode + engine metadata.
- `PUT /admin/provider` accepts `{ "mode": "api|offline", "engine": { ... } }`.
- Switching provider updates persistent state, reconfigures the runtime registry, and broadcasts a settings update (`tests/test_admin_api.py::test_admin_provider_endpoint`).
- Offline engines require `OFFLINE_PROVIDER_BASE_URL` to point at an OpenAI-compatible server. `tests/test_llm_resilience.py::test_provider_failover` confirms fallback behaviour.

## 4. Session Settings Overrides

Admins (or clients with the `admin` role) can override session settings live:

- `PUT /session/{id}/settings` body:
  ```json
  {
    "profile": "security",
    "ambiguity_threshold": 0.25,
    "citation_cutoff": 0.9,
    "consistency_tolerance": 0.9,
    "require_rollback": true,
    "mangekyo": "strict"
  }
  ```
- Overrides merge with the selected profile. Websocket subscribers receive an immediate `settings_update` (`tests/test_sessions.py::test_build_session_merge`).

## 5. Budgets, Rate Limits & Observability

- Rate limits and budgets are configurable per API key. Use `PATCH /admin/api-keys/{id}` to update quotas (`tests/test_api.py::test_api_rate_limit`).
- Metrics endpoints aggregate request counters and provider latency (see `tests/test_admin_api.py::test_admin_update_and_metrics`).
- Prometheus base URL can be updated via `PUT /admin/settings` for external dashboards.

## 6. Audit Trails

Every admin action is logged via `/admin/audit` (exposed through the Control Plane UI).
- Login, password change, key lifecycle, profile/provider updates, and websocket connections each emit audit entries.
- Export audits with `GET /admin/audit`. Default limit is 500 events (`tests/test_admin_api.py::test_admin_audit_export`).

## 7. Control Plane UI Quick Actions

1. Invite operators with scoped API keys (read-only or operator roles).
2. Switch strictness profile/global provider from the header; confirm the Truth Monitor updates in real time.
3. Use “Inspect Session” to replay any pipeline and export PDF/HTML artefacts.

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| 403 accessing admin endpoints | Ensure the API key role is `admin`. |
| Provider switch fails | Verify engine configuration, offline server health, and retry (`PUT /admin/provider`). |
| Sessions not updating | Check websocket connectivity and confirm `settings_update` events in the pipeline timeline. |

For detailed endpoint definitions see [API_REFERENCE.md](docs/API_REFERENCE.md).
