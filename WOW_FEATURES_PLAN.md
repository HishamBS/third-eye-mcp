# 🎨 Third Eye MCP - WOW Features Implementation Plan

**Created:** October 5, 2025
**Goal:** Increase WOW Features from 40% → 60% (implement 3 features)
**Estimated Time:** 3-4 hours

---

## 🎯 **FEATURE SELECTION**

Based on user value and implementation complexity, implementing these 3 features:

### 1. **Duel Mode** 🥊 (HIGH VALUE)
**Priority:** 1 - Highest
**User Value:** Immediate comparison of multiple models
**Implementation Time:** 60-90 min
**Complexity:** Medium

### 2. **Leaderboards** 🏆 (HIGH VALUE)
**Priority:** 2 - High
**User Value:** Performance insights and motivation
**Implementation Time:** 45-60 min
**Complexity:** Low-Medium

### 3. **Replay & Export** 📄 (ESSENTIAL)
**Priority:** 3 - High
**User Value:** Share and review sessions
**Implementation Time:** 60-90 min
**Complexity:** Medium-High

---

## 📋 **FEATURE 1: DUEL MODE**

### Concept:
Side-by-side comparison of the same prompt across multiple models/providers.

### User Flow:
1. User selects an Eye (e.g., Sharingan, Rinnegan)
2. User enters a single prompt
3. User selects 2-4 models to compare
4. System executes Eye with same prompt on all models simultaneously
5. Results displayed side-by-side with diff highlighting
6. Performance metrics shown (latency, tokens, cost)

### Components Needed:

#### `apps/ui/src/components/DuelMode.tsx`
```typescript
interface DuelConfig {
  eye: string;
  prompt: string;
  models: Array<{
    provider: ProviderId;
    model: string;
    label?: string;
  }>;
}

interface DuelResult {
  model: string;
  response: Envelope;
  latency: number;
  tokens: { in: number; out: number };
  cost?: number;
}
```

**Features:**
- Model selector (multi-select, 2-4 models)
- Single prompt input
- Execute button
- Side-by-side result cards
- Performance comparison table
- Winner indicator (fastest, cheapest, most tokens)

#### `apps/server/src/routes/duel.ts`
```typescript
POST /api/duel/execute
{
  eye: string,
  prompt: string,
  models: [{ provider, model }]
}

Response:
{
  results: DuelResult[],
  winner: {
    fastest: string,
    cheapest: string,
    mostVerbose: string
  }
}
```

### Database Changes:
Add `duel_runs` table:
```sql
CREATE TABLE duel_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  eye TEXT,
  prompt TEXT,
  results_json JSON,
  winner_json JSON,
  created_at DATETIME
);
```

### UI Layout:
```
┌─────────────────────────────────────────────┐
│  🥊 DUEL MODE                               │
├─────────────────────────────────────────────┤
│  Eye:      [Sharingan ▼]                   │
│  Prompt:   [________________]               │
│  Models:   [✓ GPT-4] [✓ Claude] [ Llama]   │
│            [Execute Duel]                   │
├─────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐        │
│  │ GPT-4        │  │ Claude       │        │
│  │ ⏱ 1.2s       │  │ ⏱ 0.8s 🏆    │        │
│  │ 💰 $0.002    │  │ 💰 $0.001 🏆  │        │
│  │ 📊 250 tok   │  │ 📊 320 tok 🏆 │        │
│  │              │  │              │        │
│  │ [Response]   │  │ [Response]   │        │
│  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────┘
```

---

## 📋 **FEATURE 2: LEADERBOARDS**

### Concept:
Rankings of models by performance metrics across all sessions.

### Metrics Tracked:
- **Fastest Average** - Lowest average latency
- **Most Cost-Effective** - Best cost per 1K tokens
- **Most Reliable** - Highest success rate
- **Most Used** - Total run count
- **Highest Quality** - Best average approval scores

### Components Needed:

#### `apps/ui/src/components/Leaderboards.tsx`
```typescript
interface LeaderboardEntry {
  rank: number;
  provider: string;
  model: string;
  score: number;
  totalRuns: number;
  avgLatency: number;
  avgCost: number;
  successRate: number;
  trend: 'up' | 'down' | 'stable';
}
```

**Features:**
- Tab-based categories (Fastest, Cheapest, Most Reliable, etc.)
- Top 10 rankings per category
- Trend indicators (↑↓→)
- Filtering by Eye type
- Filtering by date range (last 7 days, 30 days, all time)

#### `apps/server/src/routes/leaderboards.ts`
```typescript
GET /api/leaderboards/:category?eye=sharingan&days=7

Response:
{
  category: 'fastest',
  eye: 'sharingan',
  timeRange: 7,
  rankings: LeaderboardEntry[]
}
```

### Database Query:
Aggregates from `runs` table:
```sql
SELECT
  provider,
  model,
  COUNT(*) as total_runs,
  AVG(latency_ms) as avg_latency,
  AVG(tokens_in + tokens_out) * 0.001 as avg_cost,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*) as success_rate
FROM runs
WHERE eye = ?
  AND created_at > DATE('now', '-7 days')
GROUP BY provider, model
ORDER BY avg_latency ASC
LIMIT 10;
```

### UI Layout:
```
┌─────────────────────────────────────────────┐
│  🏆 LEADERBOARDS                            │
├─────────────────────────────────────────────┤
│  [Fastest] [Cheapest] [Reliable] [Popular]  │
│  Eye: [All ▼]  Period: [7 days ▼]          │
├─────────────────────────────────────────────┤
│  Rank  Model            Score    Trend      │
│  ───────────────────────────────────────    │
│  🥇 1   Claude Sonnet   0.8s     ↑ +5%     │
│  🥈 2   GPT-4 Turbo     1.2s     → 0%      │
│  🥉 3   Llama 3         1.5s     ↓ -2%     │
│     4   Gemini Pro      1.8s     ↑ +3%     │
│     5   Mixtral         2.1s     → 0%      │
└─────────────────────────────────────────────┘
```

---

## 📋 **FEATURE 3: REPLAY & EXPORT**

### Concept:
Review past sessions and export to shareable formats.

### Export Formats:
1. **PDF** - Formatted report with timeline
2. **HTML** - Interactive standalone page
3. **JSON** - Raw data for analysis
4. **Markdown** - Human-readable summary

### Components Needed:

#### `apps/ui/src/components/ReplayViewer.tsx`
```typescript
interface ReplaySession {
  sessionId: string;
  events: PipelineEvent[];
  runs: Run[];
  timeline: TimelineEntry[];
  summary: SessionSummary;
}
```

**Features:**
- Session selector (date picker)
- Timeline playback (play/pause/speed)
- Event-by-event navigation
- Jump to specific Eye execution
- Export button with format selector

#### `apps/ui/src/components/ExportDialog.tsx`
**Features:**
- Format selection (PDF, HTML, JSON, MD)
- Include/exclude options (events, runs, summary)
- Generate preview
- Download button

#### `apps/server/src/routes/export.ts`
```typescript
POST /api/export/session/:id
{
  format: 'pdf' | 'html' | 'json' | 'md',
  options: {
    includeEvents: boolean,
    includeRuns: boolean,
    includeSummary: boolean
  }
}

Response: File download or JSON with content
```

### Export Templates:

#### PDF Template (using jsPDF):
```
┌─────────────────────────────────────┐
│  Third Eye MCP - Session Report    │
│  Session: abc123                    │
│  Date: 2025-10-05                   │
├─────────────────────────────────────┤
│  SUMMARY                             │
│  Status: Completed                   │
│  Eyes Used: Sharingan, Rinnegan     │
│  Total Events: 42                    │
│  Duration: 5m 23s                    │
├─────────────────────────────────────┤
│  TIMELINE                            │
│  [Visual timeline with events]       │
├─────────────────────────────────────┤
│  DETAILED EVENTS                     │
│  1. Sharingan - Clarify              │
│     Input: "Create user auth..."     │
│     Output: Score 85, 3 questions    │
│     ...                              │
└─────────────────────────────────────┘
```

#### HTML Template:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Third Eye Session - {sessionId}</title>
  <style>/* Embedded CSS */</style>
</head>
<body>
  <div class="session-report">
    <h1>Session Report</h1>
    <div class="summary">...</div>
    <div class="timeline">...</div>
    <div class="events">...</div>
  </div>
  <script>/* Interactive timeline */</script>
</body>
</html>
```

### UI Layout:
```
┌─────────────────────────────────────────────┐
│  📼 REPLAY & EXPORT                         │
├─────────────────────────────────────────────┤
│  Session: [2025-10-05 abc123 ▼]            │
│  [◀️ Previous] [▶️ Play] [Next ▶️]          │
│  Speed: [1x ▼]  Progress: ━━━━━━━●─── 75%  │
├─────────────────────────────────────────────┤
│  Current Event: Sharingan Clarify           │
│  Time: 00:03:42                             │
│  [Event details displayed here]             │
├─────────────────────────────────────────────┤
│  [Export] → [PDF] [HTML] [JSON] [MD]       │
└─────────────────────────────────────────────┘
```

---

## 🗂️ **DATABASE SCHEMA ADDITIONS**

### 1. Duel Runs Table:
```sql
CREATE TABLE IF NOT EXISTS duel_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  eye TEXT NOT NULL,
  prompt TEXT NOT NULL,
  results_json JSON NOT NULL,
  winner_json JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Leaderboard Cache Table (optional):
```sql
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  eye TEXT,
  time_range INTEGER,
  rankings_json JSON NOT NULL,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

CREATE INDEX idx_leaderboard_cache ON leaderboard_cache(category, eye, time_range);
```

---

## 📦 **NPM PACKAGES NEEDED**

### For PDF Export:
```bash
bun add jspdf
bun add jspdf-autotable  # For tables in PDF
```

### For HTML Export:
Built-in template strings (no extra deps)

### For Markdown Export:
Built-in string manipulation (no extra deps)

---

## 🧪 **IMPLEMENTATION ORDER**

### Phase 1: Leaderboards (Easiest) - 45 min
1. Create leaderboard API route (15 min)
2. Create Leaderboards component (20 min)
3. Add to UI navigation (5 min)
4. Test with existing data (5 min)

### Phase 2: Duel Mode (Medium) - 90 min
1. Create duel API route (20 min)
2. Add duel_runs schema/migration (10 min)
3. Create DuelMode component (30 min)
4. Create model selector UI (15 min)
5. Add side-by-side comparison view (10 min)
6. Add to UI navigation (5 min)

### Phase 3: Replay & Export (Complex) - 90 min
1. Create export API route (20 min)
2. Create PDF generator (25 min)
3. Create HTML template (15 min)
4. Create ReplayViewer component (20 min)
5. Create ExportDialog component (10 min)

**Total Estimated Time:** 3.75 hours

---

## ✅ **SUCCESS CRITERIA**

### Duel Mode:
- [ ] Can select 2-4 models
- [ ] Executes Eye on all models simultaneously
- [ ] Shows side-by-side results
- [ ] Highlights winner (fastest/cheapest)
- [ ] Saves duel results to database

### Leaderboards:
- [ ] Shows top 10 models per category
- [ ] Filters by Eye type
- [ ] Filters by time range
- [ ] Shows trend indicators
- [ ] Updates in real-time

### Replay & Export:
- [ ] Can select and load past session
- [ ] Shows timeline playback
- [ ] Exports to PDF successfully
- [ ] Exports to HTML successfully
- [ ] Downloaded files are readable

---

## 🎯 **AFTER COMPLETION**

### Progress Update:
- WOW Features: 40% → 60% (+20%)
- Overall: 78% → 82% (+4%)
- Phase: Beta+ → RC Candidate

### Next Steps:
- Implement remaining 6 WOW features (60% → 90%)
- Increase test coverage (35% → 50%)
- Add screenshots to documentation

---

**Plan Created:** October 5, 2025
**Ready to Implement:** Yes ✅
**Estimated Completion:** 3-4 hours
