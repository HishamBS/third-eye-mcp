# Wow Session Dataset

This curated snapshot feeds the “wow-factor” demo walkthrough. Import the JSON artifacts into a local SQLite/Postgres sandbox or mock server to drive the monitor UI without hitting production data.

## Contents
- `sessions.json` — roster entry exposed through `GET /sessions`.
- `hero_metrics.json` — live metrics slice for the Truth Monitor hero cards.
- `events.json` — representative pipeline events, including Sharingan, Mangekyō, and Tenseigan envelopes.

## Usage
1. Start the API in demo mode: `THIRD_EYE_DATA_ROOT=./data/demo/wow-session uvicorn third_eye.api.server:app`.
2. Point the Overseer dashboard at the demo API by setting `VITE_API_BASE_URL=http://127.0.0.1:8000`.
3. Visit `/session/wow-session-001` to follow the scripted walkthrough in `docs/wow_demo_walkthrough.md`.

> Note: No real tenant data is stored here; all identifiers are synthetic for demo purposes.
