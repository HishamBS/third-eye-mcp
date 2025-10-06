import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SessionHeader from '../SessionHeader';
import type { SessionOverview, SessionSettingsPayload } from '../../types/pipeline';

const baseSessions: SessionOverview[] = [
  {
    session_id: 'session-a',
    title: 'Session A',
    status: 'in_progress',
    created_at: '2024-01-01T00:00:00Z',
    last_event_at: '2024-01-01T00:05:00Z',
    tenant: 'tenant-a',
    eye_counts: { approvals: 2, rejections: 1 },
  },
  {
    session_id: 'session-b',
    title: 'Session B',
    status: 'approved',
    created_at: '2024-01-02T00:00:00Z',
    last_event_at: '2024-01-02T00:10:00Z',
    tenant: 'tenant-b',
    eye_counts: { approvals: 6, rejections: 0 },
  },
];

function renderHeader(extra?: Partial<ComponentProps<typeof SessionHeader>>) {
  const settings: SessionSettingsPayload = { ambiguity_threshold: 0.4 };
  const props: ComponentProps<typeof SessionHeader> = {
    sessionId: 'session-a',
    onSessionSubmit: vi.fn(),
    apiKey: 'key',
    onApiKeyChange: vi.fn(),
    noviceMode: true,
    personaMode: true,
    onNoviceToggle: vi.fn(),
    onPersonaToggle: vi.fn(),
    settings,
    onSettingsSave: vi.fn(),
    onApplyProfile: vi.fn(),
    settingsSaving: false,
    connected: true,
    connectionAttempts: 0,
    sessions: baseSessions,
    sessionsLoading: false,
    sessionsError: null,
    onRefreshSessions: vi.fn(),
    autoFollow: true,
    onAutoFollowChange: vi.fn(),
    ...extra,
  };
  return render(<SessionHeader {...props} />);
}

describe('SessionHeader', () => {
  it('orders sessions by most recent activity', () => {
    renderHeader();
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.value)).toEqual(['session-b', 'session-a']);
  });

  it('submits and updates when selecting a session', () => {
    const onSubmit = vi.fn();
    renderHeader({ onSessionSubmit: onSubmit });

    const selector = screen.getByLabelText('Session') as HTMLSelectElement;
    fireEvent.change(selector, { target: { value: 'session-b' } });

    expect(onSubmit).toHaveBeenCalledWith('session-b');
    expect(selector.value).toBe('session-b');
  });

  it('displays session metadata for the selected entry', () => {
    renderHeader({ sessionId: 'session-b' });
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('tenant-b')).toBeInTheDocument();
  });
});
