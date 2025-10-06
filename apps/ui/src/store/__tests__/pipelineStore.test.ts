import { describe, expect, it, beforeEach } from 'vitest';
import { usePipelineStore } from '../pipelineStore';

describe('pipelineStore', () => {
  beforeEach(() => {
    usePipelineStore.getState().reset();
  });

  it('adds events and enforces max length', () => {
    const { addEvent, events } = usePipelineStore.getState();
    for (let i = 0; i < 600; i += 1) {
      addEvent({ type: 'eye_update', session_id: 's', eye: 'SHARINGAN', ts: `${i}` });
    }
    expect(events.length).toBeLessThanOrEqual(500);
  });

  it('updates eye state map', () => {
    const { setEyeState } = usePipelineStore.getState();
    setEyeState('sharingan', {
      eye: 'SHARINGAN',
      ok: true,
      code: 'OK_OK',
      md: 'All good',
      toolVersion: '1.0.0',
      data: {},
      ts: '2025-01-01T00:00:00Z',
    });
    expect(usePipelineStore.getState().eyes.SHARINGAN?.ok).toBe(true);
  });

  it('switchSession clears derived state but preserves connection flags', () => {
    const store = usePipelineStore.getState();
    store.setSessionId('session-a');
    store.setConnectionState(true);
    store.incrementAttempts();
    store.incrementAttempts();
    store.setEyeState('sharingan', {
      eye: 'SHARINGAN',
      ok: true,
      code: 'OK',
      md: 'Snapshot',
      toolVersion: '1.2.3',
      data: {},
      ts: '2025-01-01T00:00:00Z',
    });
    store.addEvent({ type: 'eye_update', session_id: 'session-a', eye: 'SHARINGAN', ts: '1' });

    store.switchSession('session-b');

    const next = usePipelineStore.getState();
    expect(next.sessionId).toBe('session-b');
    expect(Object.keys(next.eyes)).toHaveLength(0);
    expect(next.events).toHaveLength(0);
    expect(next.connected).toBe(true);
    expect(next.connectionAttempts).toBe(2);
  });
});
