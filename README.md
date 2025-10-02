# 🧿 Third Eye MCP

> Overseer mode is the only mode. Third Eye never authors deliverables; it evaluates, enforces, and approves.

## Overseer Principles
- **Host agents create** all reports, code, and drafts. Third Eye supplies questions, schemas, checklists, and approvals only.
- **Every tool response** follows one JSON envelope: `tag`, `ok`, `code`, `md`, `data`, `next`.
- **Reasoning is mandatory** whenever the host submits work product (`reasoning_md` must be present or the Eye rejects).
- **Phase gates cannot be skipped.** Final approval is granted only when all required Eyes have issued their OK status codes.
- **Citations are required** for factual content and consistency must be proven before delivery.
- `true_vision.md` and `Third_Eye_MCP_Final_Overseer_Vision.md` are the canonical specifications for this repository.

## Request / Response Envelope
```json
Request (host → Eye)
{
  "context": {
    "session_id": "string",
    "user_id": "string|null",
    "lang": "auto|en|ar",
    "budget_tokens": 0
  },
  "reasoning_md": "string (required when submitting plans, diffs, drafts)",
  "payload": { }
}

Response (Eye → host)
{
  "tag": "[EYE/<NAME>]",
  "ok": false,
  "code": "OK_*|E_*",
  "md": "markdown surface for the user/host",
  "data": { },
  "next": "host’s next required action"
}
```

`src/third_eye/constants.py` enumerates every status code, heading, next-action string, and helper constant so the contracts stay consistent across Eyes, docs, and tests.

## Pipeline
0. **Overseer Navigator** (`overseer/navigator`) is the single entrypoint. It reminds agents that Third Eye is an Overseer and points them to Sharingan as the first active gate.
1. **Sharingan** clarifies the request and enforces ambiguity policy.
2. **Prompt Helper** engineers a structured ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT prompt.
3. **Jōgan** confirms scope and token budgets before execution continues.
4. **Rinnegan** provides plan schema, reviews submitted plans, and ensures final approval only happens when all Eyes have passed.
5. **Mangekyō** runs phased code gates (scaffold → implementation → tests → docs) for software work.
6. **Tenseigan** validates claims against citations for textual deliverables.
7. **Byakugan** checks for contradictions against session memory and history.
8. **Rinnegan/final_approval** aggregates all gate outcomes and either blocks or green-lights hand-off to the user.

Code and text pipelines share the same initial steps; Mangekyō is only used when the work involves code changes.

## Eye Contracts
Each persona in `src/third_eye/personas.py` mirrors the exact schema from the vision docs. The Groq-backed LLMs must return JSON that fits the envelope above.

### Overseer Navigator (`overseer/navigator`)
- Static onboarding tool; no LLM call required.
- Returns `OK_OVERSEER_GUIDE` with:
  - a summary reminding the host that Third Eye never authors deliverables,
  - the canonical request envelope (context, payload, reasoning_md),
  - a machine-readable contract that maps every tool to its required payload, and
  - pipeline instructions pointing to `sharingan/clarify`.
- `next` is always `Start with sharingan/clarify to evaluate ambiguity.`
- Use this tool as the universal entrypoint so even beginners learn the schema before touching other Eyes.

### Sharingan — Ambiguity Radar (`sharingan/clarify`)
- Computes a vagueness score and `ambiguous` flag; returns `x` clarifying questions (`x = clamp(2, ceil(score*5), 6)`).
- Markdown data fields: `questions_md` (starts with `### Clarifying Questions`) and `policy_md` (starts with `### Policy`).
- Status codes: `E_NEEDS_CLARIFICATION` or `OK_NO_CLARIFICATION_NEEDED`.
- Next actions: either gather answers or continue to Prompt Helper; never author deliverables.

### Prompt Helper (`helper/rewrite_prompt`)
- Produces `prompt_md` with ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT and `instructions_md` (### Instructions to Agent).
- Always returns `OK_PROMPT_READY` and routes to Jōgan.

### Jōgan (`jogan/confirm_intent`)
- Validates that the refined prompt contains every required section and respects token limits.
- Returns `OK_INTENT_CONFIRMED` or blocks with `E_INTENT_UNCONFIRMED`, including a checklist and next action markdown.

### Rinnegan (`rinnegan/plan_requirements`, `rinnegan/plan_review`, `rinnegan/final_approval`)
- `plan_requirements` supplies schema, example, and acceptance criteria markdown for the host’s plan.
- `plan_review` accepts the host plan plus reasoning, ticks every schema checkbox, and returns `OK_PLAN_APPROVED` or `E_PLAN_INCOMPLETE` with fix instructions.
- `final_approval` summarises phase outcomes and either raises `E_PHASES_INCOMPLETE` or `OK_ALL_APPROVED` when every gate is green.

### Mangekyō (`mangekyo/review_scaffold`, `review_impl`, `review_tests`, `review_docs`)
- Each phase demands reasoning, checks diffs or file manifests, and returns `approved`, `checklist_md`, `issues_md`, and `fix_instructions_md`.
- `review_tests` also emits `coverage_gate` describing expected thresholds.
- Status codes per phase: `OK_SCAFFOLD_APPROVED`, `OK_IMPL_APPROVED`, `OK_TESTS_APPROVED`, `OK_DOCS_APPROVED` (or matching `E_*` failure codes).

### Tenseigan (`tenseigan/validate_claims`)
- Extracts claims from the draft, verifies citations, and returns both `claims_md` and `citations_md`.
- Approves with `OK_TEXT_VALIDATED` or blocks using `E_CITATIONS_MISSING` / `E_UNSUPPORTED_CLAIMS`, each paired with fix instructions and next steps.

### Byakugan (`byakugan/consistency_check`)
- Reports `consistent` (bool) and `analysis_md` (`### Consistency` section) summarising comparison results.
- Approves with `OK_CONSISTENT` or halts with `E_CONTRADICTION_DETECTED`.

## Groq Integration
- `src/third_eye/groq_client.py` wraps the Groq HTTP API with retries, logging, and JSON enforcement.
- `src/third_eye/eyes/_llm.py` provides `invoke_llm`, routing each Eye/tool pair to the correct persona and Groq model.
- Model mappings live in `config.yaml` under `groq.models.tools` and match the final overseer specification:
  - Sharingan → `meta-llama/llama-4-scout-17b-16e-instruct`
  - Prompt Helper → `qwen/qwen3-32b`
  - Jōgan → `llama-3.1-8b-instant`
  - Rinnegan (plan, review, final) → `qwen/qwen3-32b` / `openai/gpt-oss-120b`
  - Mangekyō phases → `llama-3.3-70b-versatile` with fallback `deepseek-r1-distill-llama-70b`
  - Tenseigan → `openai/gpt-oss-120b`
  - Byakugan → `meta-llama/llama-4-maverick-17b-128e-instruct`
  - Optional policy filter → `meta-llama/llama-guard-4-12b`
- Set `GROQ_API_KEY` in the environment before running the API or CLI; tests monkeypatch `invoke_llm` with deterministic fixtures so they pass without network access.

## Development
1. Install dependencies:
   ```bash
   uv pip install -e .[test]
   ```
2. Run the test suite:
   ```bash
   pytest
   ```
3. Launch the FastAPI service:
   ```bash
   uvicorn third_eye.api.server:app --reload
   ```
4. (Optional) Start the MCP bridge UI:
   ```bash
   cd mcp-bridge
   bun install
   bun run start
   ```

SQLite state lives in `data/third_eye.db`; Redis helpers are unused in overseer mode but retained for potential caching if re-enabled.

## Logging & Telemetry
Each Eye emits a structured JSON log via `log_json`, e.g.:
```json
{"tag":"[EYE/MANGEKYO/REVIEW_IMPL]","code":"OK_IMPL_APPROVED","session_id":"sess-123","duration_ms":42,"input_tokens":0,"output_tokens":0,"replay_id":"run-abc"}
```
These logs enable replay and audit of every overseer decision.

## References
- `true_vision.md` — single source of truth for overseer behavior.
- `Third_Eye_MCP_Final_Overseer_Vision.md` — narrative specification of the final overseer flow.
- `tests/` — contract tests that assert every Eye obeys the schemas and status codes described above.
