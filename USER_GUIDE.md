# Third Eye MCP — User Guide (Truth Monitor)

> The Overseer enforces quality gates. Host agents remain the authors; Third Eye supplies questions, schemas, and approvals.

---

## 1. Start & Join Sessions
- Create sessions via `POST /session` (CLI/agent integrations surface this automatically). The response contains a `portal_url`; open it or let the CLI auto-launch when `LAUNCH_PORTAL_ON_CONNECT=true`.
- Open the portal and paste your API key once; it is stored locally only.
- The session dropdown is backed by `GET /sessions`. New runs appear instantly—enable **Auto-follow latest** to jump in automatically when a fresh session starts.
- You can pin another session by disabling auto-follow and selecting it manually.

**Landing page:** `/session/:id` (Truth Monitor) shows connection state, retry counters, and hero metrics streamed from live Eye events.

---

## 2. Eye Cards & Drawers
- Each Eye (Sharingan → Byakugan) is represented by a card with status:
  - 🟢 Approved
  - 🔴 Rejected
  - 🟡 Pending
- Click a card to open the drawer:
  - **Summary** — human-readable result
  - **Why / Issues / Fixes** — guidance for the host
  - **Raw** (Expert mode) — JSON envelope

Toggle Novice/Expert mode in the header; the setting persists per browser.

---

## 3. Clarifications Workflow
1. Sharingan surfaces an ambiguity score and asks `x` clarifying questions (threshold derived from session settings).
2. Use the **Clarifications** panel to submit answers.
3. Prompt Helper consumes the answers and crafts the structured ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT prompt.

Profiles (Casual / Enterprise / Security) control default thresholds; adjust them live via the gear icon (see section 6).

---

## 4. Plan & Code Gates
- **Rinnegan** issues the plan template and approves submitted plans when all sections are filled (Rollback requirement depends on the active profile/override).
- **Mangekyō** enforces scaffold → implementation → tests → docs with strictness (lenient/normal/strict) taken from session settings.
- **Tenseigan** ensures every factual claim has a citation meeting the confidence cutoff.
- **Byakugan** scores consistency against prior context.

Use the **Visual Plan Renderer** to follow step-by-step execution and file changes.

---

## 5. Evidence Lens & Re-validate
- Draft viewer highlights claims in green/red based on citations.
- Click **Re-validate Draft** to rerun Tenseigan + Byakugan at any point. Issues are overlaid with remediation steps.

---

## 6. Live Settings
Open the **Settings** drawer to tune per-session strictness:
- `ambiguity_threshold`
- `citation_cutoff`
- `require_rollback`
- `consistency_tolerance`
- `mangekyo` strictness

Changes propagate immediately via websocket `settings_update` events (`tests/test_sessions.py` validates the merge).

---

## 7. Duo Mode (Agent Duel)
- Launch a duel from the **Duel** panel by picking two agents (e.g. Claude vs GPT).
- The portal renders both outputs and tracks which agent cleared the gates.

---

## 8. Exports & Timeline
- Use the timeline scrubber to replay events with animation.
- Export sessions as PDF or interactive HTML (`POST /session/{id}/export`).

---

## 9. Persona Voice
- Speaker icons trigger optional TTS summaries (EN/AR). Toggle persona flair from the header as needed.

---

## 10. FAQ
- **Plan rejected?** Open Rinnegan → *Issues* tab for the missing sections.
- **Citations missing?** Tenseigan highlights unsupported claims in red.
- **Need stricter reviews?** Switch to Security profile or bump settings manually.
- **Can I skip gates?** No—phase gates are mandatory.

---

## 11. Troubleshooting
| Issue | Fix |
| --- | --- |
| Websocket disconnected | Portal auto-retries; verify API availability, key validity, and network path. |
| 403 responses | Ensure your API key role/tenant matches the session (`tests/test_api.py::test_api_tenant_enforced`). |
| Export failed | Retry; very large sessions export in batches. Confirm `/session/{id}/events` is reachable. |
| Provider switched mid-run | Watch for `settings_update` banners; reopen Eye drawers to refresh strictness details. |

Need admin-level tasks? See [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md). For endpoint schemas refer to [API_REFERENCE.md](docs/API_REFERENCE.md).
