import type { ComponentProps } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import SessionHeader from '../SessionHeader';
import type { SessionOverview } from '../../types/pipeline';

expect.extend(toHaveNoViolations);

function buildSessions(): SessionOverview[] {
  return [
    {
      session_id: 'alpha',
      title: 'Alpha Session',
      status: 'in_progress',
      created_at: '2024-02-01T10:00:00Z',
      last_event_at: '2024-02-01T10:05:00Z',
      tenant: 'tenant-a',
      eye_counts: { approvals: 3, rejections: 1 },
    },
    {
      session_id: 'beta',
      title: 'Beta Session',
      status: 'approved',
      created_at: '2024-02-02T10:00:00Z',
      last_event_at: '2024-02-02T10:05:00Z',
      tenant: 'tenant-b',
      eye_counts: { approvals: 5, rejections: 0 },
    },
  ];
}

function buildProps(): ComponentProps<typeof SessionHeader> {
  return {
    sessionId: 'alpha',
    onSessionSubmit: vi.fn(),
    apiKey: 'key',
    onApiKeyChange: vi.fn(),
    noviceMode: true,
    personaMode: false,
    onNoviceToggle: vi.fn(),
    onPersonaToggle: vi.fn(),
    settings: { ambiguity_threshold: 0.35 },
    onSettingsSave: vi.fn(),
    onApplyProfile: vi.fn(),
    settingsSaving: false,
    connected: true,
    connectionAttempts: 1,
    sessions: buildSessions(),
    sessionsLoading: false,
    sessionsError: null,
    onRefreshSessions: vi.fn(),
    autoFollow: true,
    onAutoFollowChange: vi.fn(),
  };
}

describe('SessionHeader accessibility', () => {
  it('has no detectable accessibility violations', async () => {
    const { container } = render(<SessionHeader {...buildProps()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
