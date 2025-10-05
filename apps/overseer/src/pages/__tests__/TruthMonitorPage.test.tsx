import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TruthMonitorPage from '../TruthMonitorPage';
import { usePipelineStore } from '../../store/pipelineStore';

vi.mock('../../hooks/usePipelineWS', () => ({
  usePipelineWS: vi.fn(),
}));

const fetchSessionSummary = vi.fn();
const updateSessionSettings = vi.fn();
const postResubmitRequest = vi.fn();
const fetchSessions = vi.fn();

vi.mock('../../lib/api', () => ({
  fetchSessionSummary: (...args: unknown[]) => fetchSessionSummary(...(args as Parameters<typeof fetchSessionSummary>)),
  updateSessionSettings: (...args: unknown[]) => updateSessionSettings(...(args as Parameters<typeof updateSessionSettings>)),
  postResubmitRequest: (...args: unknown[]) => postResubmitRequest(...(args as Parameters<typeof postResubmitRequest>)),
  fetchSessions: (...args: unknown[]) => fetchSessions(...(args as Parameters<typeof fetchSessions>)),
}));

const localStore = new Map<string, unknown>();

vi.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage<T>(key: string, initialValue: T) {
    const [value, setValue] = React.useState<T>(() => {
      if (localStore.has(key)) {
        return localStore.get(key) as T;
      }
      return initialValue;
    });

    const setStored = React.useCallback(
      (next: T | ((prev: T) => T)) => {
        setValue((prev) => {
          const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
          localStore.set(key, resolved);
          return resolved;
        });
      },
      [key],
    );

    return [value, setStored] as const;
  },
}));

describe('TruthMonitorPage', () => {
  beforeEach(() => {
    localStore.clear();
    fetchSessionSummary.mockReset();
    updateSessionSettings.mockReset();
    postResubmitRequest.mockReset();
    fetchSessions.mockReset();
    const store = usePipelineStore.getState();
    store.reset();
    usePipelineStore.setState({ sessionId: null, connected: false, connectionAttempts: 0, error: null });

    fetchSessionSummary.mockImplementation(({ sessionId }: { sessionId: string }) =>
      Promise.resolve({ session_id: sessionId, hero_metrics: null } as unknown as { session_id: string }),
    );
    updateSessionSettings.mockResolvedValue({});
    postResubmitRequest.mockResolvedValue(undefined);
    fetchSessions.mockResolvedValue([
      {
        session_id: 'session-1',
        title: 'Session One',
        status: 'in_progress',
        created_at: '2024-01-01T00:00:00Z',
        last_event_at: '2024-01-01T00:02:00Z',
        tenant: 'tenant-a',
        eye_counts: { approvals: 5, rejections: 1 },
      },
      {
        session_id: 'session-2',
        title: 'Session Two',
        status: 'approved',
        created_at: '2024-01-02T00:00:00Z',
        last_event_at: '2024-01-02T00:05:00Z',
        tenant: 'tenant-a',
        eye_counts: { approvals: 8, rejections: 0 },
      },
    ]);
  });

  it('auto-follows pipeline sessions when enabled', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/', search: '' }]}>
        <Routes>
          <Route path="/" element={<TruthMonitorPage />} />
          <Route path="/session/:sessionId" element={<TruthMonitorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchSessions).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchSessionSummary).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'session-1' })));

    act(() => {
      usePipelineStore.getState().switchSession('session-2');
    });

    await waitFor(() => expect(fetchSessionSummary).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'session-2' })));
    const selector = screen.getByLabelText('Session') as HTMLSelectElement;
    expect(selector.value).toBe('session-2');
  });
});
