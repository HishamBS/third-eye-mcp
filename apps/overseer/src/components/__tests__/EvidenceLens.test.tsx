import { render, screen } from '@testing-library/react';
import EvidenceLens, { buildEvidenceSegments } from '../EvidenceLens';

describe('EvidenceLens', () => {
  const draft = 'Revenue grew 15% in Q1 according to our audited report.';

  it('segments draft text based on claims', () => {
    const segments = buildEvidenceSegments(draft, [
      { text: 'Revenue grew 15% in Q1', start: 0, end: 24, citation: 'https://example.com/report', confidence: 0.92 },
      { text: 'audited report', start: 35, end: draft.length, citation: null, confidence: 0.4 },
    ]);

    expect(segments).toHaveLength(3);
    expect(segments[0].cited).toBe(true);
    expect(segments[1].cited).toBe(false);
    expect(segments[2].cited).toBe(false);
  });

  it('renders highlighted spans for cited and uncited claims', () => {
    render(
      <EvidenceLens
        draft={draft}
        claims={[
          { text: 'Revenue grew 15% in Q1', start: 0, end: 24, citation: 'https://example.com/report', confidence: 0.92 },
          { text: 'audited report', start: 35, end: draft.length, citation: null, confidence: 0.4 },
        ]}
        expertMode
      />,
    );

    expect(screen.getByText((content) => content.includes('Revenue grew 15% in Q1'))).toBeInTheDocument();
    const missing = screen.getAllByTitle('Missing citation')[0];
    expect(missing.textContent).toContain('audited report');
  });
});
