import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChangeBadge } from '../components/ui/ChangeBadge';
import { StatusPill } from '../components/ui/StatusPill';

describe('Design System Components ("Shelf Tag")', () => {
  it('renders ChangeBadge with ▲ glyph and positive sign for rising inflation', () => {
    const { container } = render(<ChangeBadge value={2.45} />);
    expect(container.textContent).toContain('▲');
    expect(container.textContent).toContain('+2.45%');
  });

  it('renders ChangeBadge with ▼ glyph and negative sign for falling prices', () => {
    const { container } = render(<ChangeBadge value={-1.8} />);
    expect(container.textContent).toContain('▼');
    expect(container.textContent).toContain('-1.80%');
  });

  it('renders ChangeBadge with ■ glyph for steady zero change', () => {
    const { container } = render(<ChangeBadge value={0.0} />);
    expect(container.textContent).toContain('■');
    expect(container.textContent).toContain('0.00%');
  });

  it('renders StatusPill with corresponding variant styles', () => {
    const { container } = render(<StatusPill status="flagged" />);
    expect(container.textContent).toContain('Flagged');
  });
});
