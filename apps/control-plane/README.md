# Overseer Control Plane

React + Vite dashboard for operating the Third Eye API. The console handles admin authentication, API key lifecycle, budgets, audit trail access, and Prometheus summaries.

## Prerequisites
- Node.js 20+
- pnpm 9+
- Running Third Eye API (set `VITE_API_BASE_URL`) so the dashboard can call `/admin/*` endpoints.

## Installation
```bash
pnpm install --filter overseer-control-plane --workspace-root
```

## Local Development
```bash
pnpm --filter overseer-control-plane dev
```
The dev server listens on port 5174 (hot reload). Provide `VITE_API_BASE_URL` via `.env.local` or the shell when the API lives elsewhere.

## Testing
```bash
pnpm --filter overseer-control-plane test
```
Tests run in Vitest `run` mode (non-watch) to keep CI deterministic. Use `pnpm --filter overseer-control-plane test:watch` for interactive feedback.

## Production Build
```bash
pnpm --filter overseer-control-plane build
```
Artifacts land in `apps/control-plane/dist`. A production-ready container image is defined in `docker/Dockerfile.control-plane.prod` (multi-stage build → Nginx static hosting). The dev Dockerfile (`docker/Dockerfile.control-plane`) remains available for hot-reload containers.

## Authentication Workflow
1. Visit the dashboard and sign in with your admin email/password.
2. On first login, the server forces a password rotation and issues a fresh admin API key.
3. Once authenticated, the app stores the scoped API key in local storage (browser only) and enables API key management, metrics, and audit views.
4. Administrators can update their profile or rotate their password at any time; doing so invalidates previous keys automatically.

Bootstrap status, forced resets, and password updates map to:
- `GET /admin/bootstrap/status`
- `POST /admin/auth/login`
- `POST /admin/auth/change-password`
- `PATCH /admin/account`

Ensure the API enforces TLS and retrieves secrets from Alibaba Cloud Secrets Manager in production.
