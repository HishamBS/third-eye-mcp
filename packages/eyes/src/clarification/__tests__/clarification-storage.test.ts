/**
 * Tests for Clarification Storage
 */

import { describe, it, expect } from 'vitest';
import {
  addClarificationRequest,
  resolveClarification,
  getPendingClarifications,
  getResolvedFacts,
  storeIntentConfirmation,
  recordIntentConfirmationResponse,
  getIntentConfirmationStatus,
} from '../clarification-storage';

describe('clarification-storage', () => {
  describe('addClarificationRequest', () => {
    it('should add clarification requests to database', async () => {
      const sessionId = 'test-session-1';
      const requests = [
        { field: 'audience', question: 'Who is the intended audience?' },
        { field: 'scope', question: 'What is the scope of this project?' },
      ];

      await addClarificationRequest(sessionId, requests);

      const pending = await getPendingClarifications(sessionId);
      expect(pending.length).toBe(2);
      expect(pending[0].field).toBe('audience');
      expect(pending[1].field).toBe('scope');
    });
  });

  describe('resolveClarification', () => {
    it('should mark clarification as answered', async () => {
      const sessionId = 'test-session-2';
      
      await addClarificationRequest(sessionId, [
        { field: 'deliverable', question: 'What should be delivered?' },
      ]);

      await resolveClarification(sessionId, {
        field: 'deliverable',
        answer: 'A comprehensive guide',
      });

      const facts = await getResolvedFacts(sessionId);
      expect(facts['deliverable']).toBe('A comprehensive guide');
    });
  });

  describe('getResolvedFacts', () => {
    it('should return all resolved facts as key-value pairs', async () => {
      const sessionId = 'test-session-3';

      await addClarificationRequest(sessionId, [
        { field: 'audience', question: 'Who?' },
        { field: 'scope', question: 'What scope?' },
      ]);

      await resolveClarification(sessionId, { field: 'audience', answer: 'Engineers' });
      await resolveClarification(sessionId, { field: 'scope', answer: 'Full system' });

      const facts = await getResolvedFacts(sessionId);
      expect(facts.audience).toBe('Engineers');
      expect(facts.scope).toBe('Full system');
    });
  });

  describe('storeIntentConfirmation', () => {
    it('should store intent confirmation request', async () => {
      const sessionId = 'test-session-4';
      const intentAnalysis = {
        primary: 'CREATE',
        secondary: ['EDUCATE'],
        scope: 'small',
        estimatedEffort: '30-45 minutes',
        deliverables: ['500-word article'],
      };

      const id = await storeIntentConfirmation(
        sessionId,
        intentAnalysis,
        'Confirm intent?',
      );

      expect(id).toBe(`intent_${sessionId}`);

      const status = await getIntentConfirmationStatus(sessionId);
      expect(status).not.toBeNull();
      expect(status!.confirmationPrompt).toBe('Confirm intent?');
    });
  });

  describe('recordIntentConfirmationResponse', () => {
    it('should update confirmation with user response', async () => {
      const sessionId = 'test-session-5';
      const intentAnalysis = {
        primary: 'CREATE',
        secondary: [],
        scope: 'small',
        estimatedEffort: '30 min',
        deliverables: [],
      };

      const confirmationId = await storeIntentConfirmation(
        sessionId,
        intentAnalysis,
        'Approve?',
      );

      await recordIntentConfirmationResponse(
        confirmationId,
        'approved',
        'user1',
      );

      const status = await getIntentConfirmationStatus(sessionId);
      expect(status!.response).toBe('approved');
      expect(status!.userIdentity).toBe('user1');
    });
  });
});

