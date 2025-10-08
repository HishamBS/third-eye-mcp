# Workflow Playbooks

Curated workflow templates for orchestrating multi-eye pipelines.

> **Status:** Initial version. Contributions welcome—submit pull requests with end-to-end scenarios.

## Included Templates

1. **Ambiguity Clarifier** — Sharingan → Prompt Helper → Jogan
2. **Enterprise Code Review** — Mangekyo → Tenseigan → Byakugan
3. **Incident Triage** — Overseer → Rinnegan → Sharingan
4. **Documentation Drafting** — Prompt Helper → Mangekyo → Overseer

Each template covers:
- Recommended strictness profile
- Required provider capabilities
- Suggested follow-up actions for agents

## Using Templates

1. Open the dashboard → **Pipelines**
2. Click **Import Workflow** and paste JSON from the template
3. Customize model routing per environment (e.g., fallback to local Ollama models)
4. Save and activate

For detailed JSON schemas and examples, see [MCP API](../MCP_API.md) and [Configuration](../configuration.md).

---

To contribute new playbooks, follow the guidelines in [CONTRIBUTING.md](../CONTRIBUTING.md).

