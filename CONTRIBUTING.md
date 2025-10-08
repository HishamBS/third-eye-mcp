# Contributing to Third Eye MCP

Thank you for your interest in contributing to Third Eye MCP! This document provides guidelines and instructions for contributing.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/HishamBS/third-eye-mcp.git
cd third-eye-mcp

# Install dependencies
bun install

# Seed the database
bun run setup

# Start development server
bun run dev
```

The server will start on `:7070` and the UI on `:3300`.

## 📂 Project Structure

```
third-eye-mcp/
├── apps/
│   ├── server/          # Bun server (Hono + WebSocket)
│   └── ui/              # Next.js 15 UI (App Router)
├── packages/
│   ├── core/            # Eye orchestrator, registry
│   ├── providers/       # AI provider adapters
│   ├── db/              # SQLite schema, migrations
│   ├── config/          # Configuration loader
│   └── types/           # Shared TypeScript types
├── cli/                 # bunx third-eye-mcp entrypoint
├── docker/              # Docker Compose setup
└── scripts/             # Build and seed scripts
```

## 🎯 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

### 2. Make Changes

- **Server**: Edit files in `apps/server/src/`
- **UI**: Edit files in `apps/ui/src/app/`
- **Core Logic**: Edit packages (`packages/core`, `packages/providers`, etc.)

### 3. Test Your Changes

```bash
# Unit tests
bun test

# E2E tests
bun run e2e

# Type check
tsc --noEmit
```

### 4. Commit

Follow conventional commits format:

```bash
git commit -m "feat(providers): add Claude support"
git commit -m "fix(ui): resolve WebSocket reconnection issue"
git commit -m "docs: update routing guide"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### 5. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Then create a Pull Request on GitHub.

## 🧪 Testing Guidelines

### Unit Tests (Vitest)

Test individual functions and modules:

```typescript
// packages/providers/__tests__/groq.test.ts
import { describe, test, expect } from 'vitest';
import { GroqProvider } from '../groq';

describe('GroqProvider', () => {
  test('lists models correctly', async () => {
    const provider = new GroqProvider('https://api.groq.com/openai/v1', 'key');
    const models = await provider.listModels();
    expect(models).toBeInstanceOf(Array);
  });
});
```

### Integration Tests

Test API endpoints and flows:

```typescript
// apps/server/__tests__/mcp.test.ts
test('POST /mcp/run returns valid envelope', async () => {
  const response = await fetch('http://localhost:7070/mcp/run', {
    method: 'POST',
    body: JSON.stringify({ eye: 'sharingan', input: 'test', sessionId: '123' }),
  });

  expect(response.ok).toBe(true);
  const envelope = await response.json();
  expect(envelope).toHaveProperty('tag');
});
```

### E2E Tests (Playwright)

Test full user flows:

```typescript
// apps/ui/tests/e2e/session-flow.spec.ts
test('create session and run eye', async ({ page }) => {
  await page.goto('http://localhost:3300');
  await page.click('text=New Session');
  await page.fill('textarea[placeholder*="Ask sharingan"]', 'Hello');
  await page.click('button:has-text("Run sharingan")');
  await expect(page.locator('.run-card')).toBeVisible();
});
```

## 🏗️ Code Style

### TypeScript

- **Strict mode enabled**: All types must be explicit
- **Use Zod** for validation schemas
- **No `any` types** unless absolutely necessary
- **Functional style preferred** over classes where appropriate

### Naming Conventions

- **Files**: kebab-case (`provider-factory.ts`)
- **Components**: PascalCase (`EyeCard.tsx`)
- **Functions**: camelCase (`runEye`, `fetchModels`)
- **Constants**: UPPER_SNAKE_CASE (`EYES_REGISTRY`)

### Imports

Use explicit imports and group them:

```typescript
// 1. External dependencies
import { Hono } from 'hono';
import { nanoid } from 'nanoid';

// 2. Workspace packages
import { getDb } from '@third-eye/db';
import { EyeOrchestrator } from '@third-eye/core';

// 3. Relative imports
import { wsManager } from './websocket';
```

## 📝 Documentation

### Code Comments

Add JSDoc for public APIs:

```typescript
/**
 * Run an Eye with input and session context
 *
 * @param eye - Eye identifier (sharingan, rinnegan, tenseigan)
 * @param input - User input text
 * @param sessionId - Session ID for tracking
 * @returns Envelope with Eye response
 */
async runEye(eye: string, input: string, sessionId: string): Promise<Envelope> {
  // ...
}
```

### README Updates

If adding features, update relevant sections in:
- `/README.md` - Main documentation
- `/docs/*.md` - Detailed guides
- `/docker/README.md` - Docker-specific docs

## 🔧 Adding New Features

### Adding a New Eye

1. **Register in Core**:
   ```typescript
   // packages/core/registry.ts
   export const EYES_REGISTRY = {
     // ...existing eyes
     byakugan: {
       name: 'Byakugan',
       version: '1.0.0',
       description: 'Your Eye description',
       personaTemplate: `Your system prompt...`,
       defaultRouting: { /* ... */ }
     }
   };
   ```

2. **Add UI Card**:
   ```typescript
   // Update apps/ui/src/app/session/[id]/page.tsx
   const EYES = ['sharingan', 'rinnegan', 'tenseigan', 'byakugan'];
   ```

3. **Seed Database**:
   ```bash
   bun run setup
   ```

### Adding a New Provider

1. **Create Provider Class**:
   ```typescript
   // packages/providers/your-provider.ts
   export class YourProvider implements ProviderClient {
     async listModels(): Promise<ModelInfo[]> { /* ... */ }
     async complete(req: CompletionRequest): Promise<CompletionResponse> { /* ... */ }
     async health(): Promise<HealthResponse> { /* ... */ }
   }
   ```

2. **Update Factory**:
   ```typescript
   // packages/providers/factory.ts
   case 'your-provider':
     return new YourProvider(config.baseUrl, config.apiKey);
   ```

3. **Update Types**:
   ```typescript
   // packages/types/providers.ts
   export type ProviderId = 'groq' | 'openrouter' | 'ollama' | 'lmstudio' | 'your-provider';
   ```

## 🐛 Reporting Issues

### Bug Reports

Include:
- **Description**: Clear description of the bug
- **Steps to Reproduce**: 1, 2, 3...
- **Expected**: What should happen
- **Actual**: What actually happens
- **Environment**: OS, Bun version, browser
- **Logs**: Console errors, server logs

### Feature Requests

Include:
- **Use Case**: Why is this needed?
- **Proposal**: How should it work?
- **Alternatives**: Other approaches considered

## 📜 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## 🙏 Thank You!

Your contributions make Third Eye MCP better for everyone. We appreciate your time and effort!

## 📞 Questions?

- **Discussions**: GitHub Discussions
- **Issues**: GitHub Issues
- **Docs**: `/docs` directory

Happy coding! 🧿
