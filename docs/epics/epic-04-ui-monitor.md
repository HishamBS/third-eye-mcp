# Epic 04 · UI, Pipeline Builder & Live Monitor

**Goal:** Restore the complete Next.js UI experience for non-technical operators, including polished markdown rendering, pipeline editor, monitor timeline, sessions management, replay, and wow factors.

## Outcomes
- UI adheres to design principles (clean, human-friendly, accessible) with session-aware navigation.
- Pipeline builder offers intuitive drag/zoom interactions and validation.
- Live monitor renders capability timeline, clarifications, intent confirmation, validation evidence, and raw JSON in real time.
- Personas/Eyes CRUD, Sessions, Replay, Settings, Dashboard all function with restored UX enhancements.

## Stories

### Story 4.1 · Global Layout, Navigation & Session Context
- **Objective:** Reconstruct layout, navigation, and session dropdown wiring.
- **Acceptance Criteria**
  1. Header includes session selector, theme switcher, quick search, and tagline.
  2. Sidebar navigation matches original sections (Dashboard, Personas, Eyes, Pipelines, Sessions, Monitor, Replay, Settings, Wow Factors).
  3. Session dropdown writes query param; all pages react to selected session via shared context.
  4. Webhook opening monitor auto-selects session in dropdown.
- **Testing**
  - Playwright scenario verifying session selection updates across pages.

### Story 4.2 · Personas & Eyes Management
- **Objective:** Restore CRUD interfaces for personas and eyes with human-readable views.
- **Acceptance Criteria**
  1. List tables show metadata (icon, name, version, capabilities, updated date).
  2. Create/Edit forms use multi-step layout with input types (text, textarea, numbered list, capability tags) reflecting blueprint structure.
  3. Detail view renders Markdown article style with anchors for Mission, Overview, Phases, Examples.
  4. Version history or audit info accessible.
- **Testing**
  - Playwright coverage for create/edit; snapshot tests for markdown rendering.

### Story 4.3 · Pipeline Builder Experience
- **Objective:** Rebuild pipeline editor to match polished UX described in vision.
- **Acceptance Criteria**
  1. Canvas supports zoom, pan, drag, double-click to add nodes, mini-map.
  2. Nodes show eye icon, stage badge, capability chips; edges curved with arrowheads.
  3. Validation ensures guidance precedes validation, at least one final approval, no orphan nodes.
  4. Templates available; import/export pipeline JSON; saved graph persists positions.
- **Testing**
  - Playwright interactions; unit tests for validation rules.

### Story 4.4 · Monitor Timeline & Clarification Tabs
- **Objective:** Deliver immersive monitor showing pipeline progress and clarifications.
- **Acceptance Criteria**
  1. Timeline tab shows chronological events with stage tokens, icons, markdown summary.
  2. Clarifications tab splits Outstanding vs Resolved, showing questions, answers, ambiguity/confidence bars.
  3. Intent tab shows Jōgan status, human responder, timestamp, "Resume" action.
  4. Evidence tab summarises Kyuubi/Mangekyō/Tenseigan/Byakugan results with tables, citations, risk levels.
  5. Raw JSON tab provides collapsible viewer with copy button.
- **Testing**
  - WebSocket-driven integration; Playwright verifying tabs update with mocked events.

### Story 4.5 · Sessions, Replay & Wow Factors
- **Objective:** Reinstate session list/detail, replay playback, and wow factor dashboard.
- **Acceptance Criteria**
  1. Sessions page lists status chips, agent metadata, creation/update times, filters/search.
  2. Session detail shows timeline summary, clarification status, buttons to resume/terminate.
  3. Replay page allows stepping through events, exporting Markdown/PDF transcripts.
  4. Dashboard hero + metrics cards highlight Third Eye value; quick actions accessible.
- **Testing**
  - UI smoke tests; manual QA verifying export outputs.

### Story 4.6 · Settings & Theme Showcase
- **Objective:** Provide configuration screens for providers, themes, admin preferences.
- **Acceptance Criteria**
  1. Provider key management with validation, encrypted storage, warnings on missing keys.
  2. Theme preview gallery with live switching; describes each theme story.
  3. Global toggles for strictness defaults, webhook behaviour.
- **Testing**
  - Manual validation; unit tests for settings hooks.

## Dependencies
- Epics 01–03 supply constants, personas, orchestration, telemetry.

## Risks & Mitigations
- **Risk:** UI regressions due to missing theme tokens.
  - *Mitigation:* Use SSOT tokens only; run visual QA per theme.
- **Risk:** WebSocket updates drift from server payload shape.
  - *Mitigation:* Integrate telemetry contract tests; stub server responses during development.

## Acceptance Checklist
- [ ] Layout + session context restored.
- [ ] Personas/Eyes CRUD + detail views functional.
- [ ] Pipeline builder polished with validation.
- [ ] Monitor timeline + tabs render dynamic data.
- [ ] Sessions, Replay, Dashboard, Settings operate as before.
