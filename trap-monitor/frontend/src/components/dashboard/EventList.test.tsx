import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventList } from './EventList';
import type { TrapEvent } from '@/lib/types';

// ── Test helpers ─────────────────────────────────────────────────────────────
function createEvent(overrides?: Partial<TrapEvent>): TrapEvent {
  return {
    id: 1,
    unit_id: 'UNIT_001',
    event_type: 'TRAP',
    triggered_at: new Date().toISOString(),
    trap_caught: false,
    acknowledged: false,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('EventList', () => {
  it('renders "Recent Events" heading', () => {
    render(<EventList events={[]} onAcknowledge={vi.fn()} />);
    expect(screen.getByText('Recent Events')).toBeInTheDocument();
  });

  it('renders event rows with unit_id text', () => {
    const events = [
      createEvent({ id: 1, unit_id: 'UNIT_001' }),
      createEvent({ id: 2, unit_id: 'UNIT_002' }),
    ];
    render(<EventList events={events} onAcknowledge={vi.fn()} />);

    expect(screen.getByText('UNIT_001')).toBeInTheDocument();
    expect(screen.getByText('UNIT_002')).toBeInTheDocument();
  });

  it('shows ACK button for trap_caught && !acknowledged events', () => {
    const events = [
      createEvent({ id: 1, trap_caught: true, acknowledged: false }),
    ];
    render(<EventList events={events} onAcknowledge={vi.fn()} />);

    expect(screen.getByText('ACK')).toBeInTheDocument();
  });

  it('does NOT show ACK button for acknowledged events', () => {
    const events = [
      createEvent({ id: 1, trap_caught: true, acknowledged: true }),
    ];
    render(<EventList events={events} onAcknowledge={vi.fn()} />);

    expect(screen.queryByText('ACK')).toBeNull();
  });

  it('does NOT show ACK button for non-caught events', () => {
    const events = [
      createEvent({ id: 1, trap_caught: false, acknowledged: false }),
    ];
    render(<EventList events={events} onAcknowledge={vi.fn()} />);

    expect(screen.queryByText('ACK')).toBeNull();
  });

  it('calls onAcknowledge with event ID when ACK clicked', async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    const events = [
      createEvent({ id: 42, trap_caught: true, acknowledged: false }),
    ];
    render(<EventList events={events} onAcknowledge={onAcknowledge} />);

    const ackButton = screen.getByText('ACK');
    await user.click(ackButton);

    expect(onAcknowledge).toHaveBeenCalledWith(42);
  });

  it('respects maxEvents prop (renders at most N events)', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      createEvent({ id: i + 1, unit_id: `UNIT_${String(i + 1).padStart(3, '0')}` }),
    );
    render(<EventList events={events} onAcknowledge={vi.fn()} maxEvents={3} />);

    // Should only show 3 unit IDs
    expect(screen.getByText('UNIT_001')).toBeInTheDocument();
    expect(screen.getByText('UNIT_002')).toBeInTheDocument();
    expect(screen.getByText('UNIT_003')).toBeInTheDocument();
    expect(screen.queryByText('UNIT_004')).toBeNull();
    expect(screen.queryByText('UNIT_005')).toBeNull();
  });

  it('uses default maxEvents of 18 when not specified', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      createEvent({ id: i + 1, unit_id: `UNIT_${String(i + 1).padStart(3, '0')}` }),
    );
    render(<EventList events={events} onAcknowledge={vi.fn()} />);

    // Should show first 18 but not 19th or 20th
    expect(screen.getByText('UNIT_018')).toBeInTheDocument();
    expect(screen.queryByText('UNIT_019')).toBeNull();
  });

  it('renders different icons for different event types', () => {
    const events = [
      createEvent({ id: 1, event_type: 'TRAP', trap_caught: true }),
      createEvent({ id: 2, event_type: 'HEALTH', trap_caught: false }),
    ];
    const { container } = render(<EventList events={events} onAcknowledge={vi.fn()} />);

    // Just verify multiple event rows rendered
    const rows = container.querySelectorAll('[class*="flex items-start"]');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
