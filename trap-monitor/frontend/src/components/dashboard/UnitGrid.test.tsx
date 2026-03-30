import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnitGrid } from './UnitGrid';
import type { UnitGridProps } from './UnitGrid';
import type { Unit, TrapEvent, UnitStatus } from '@/lib/types';

// ── Test helpers ─────────────────────────────────────────────────────────────
function createUnit(overrides?: Partial<Unit>): Unit {
  return {
    id: 'UNIT_001',
    name: 'Test Trap',
    battery_pct: 85,
    solar_ok: true,
    armed: true,
    last_seen: new Date().toISOString(),
    ...overrides,
  };
}

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

function createDefaultProps(overrides?: Partial<UnitGridProps>): UnitGridProps {
  const units = [
    createUnit({ id: 'UNIT_001', name: 'Trap Alpha' }),
    createUnit({ id: 'UNIT_002', name: 'Trap Bravo' }),
  ];
  return {
    units,
    events: [],
    filteredUnits: units,
    selected: null,
    onSelect: vi.fn<(unitId: string) => void>(),
    statusFilter: 'all',
    onStatusFilterChange: vi.fn<(filter: UnitStatus | 'all') => void>(),
    searchQuery: '',
    onSearchQueryChange: vi.fn<(query: string) => void>(),
    sortKey: 'status',
    onSortKeyChange: vi.fn<(key: 'status' | 'last_seen' | 'battery_pct' | 'name') => void>(),
    onAcknowledge: vi.fn<(eventId: number) => void>(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('UnitGrid', () => {
  it('renders filter buttons for all statuses', () => {
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    // Check all filter buttons exist — use getAllByRole to find buttons
    const buttons = screen.getAllByRole('button');
    const buttonTexts = buttons.map(b => b.textContent?.trim() ?? '');

    // Filter buttons include count suffixes like "All 2", "Caught 0", etc.
    expect(buttonTexts.some(t => t.startsWith('All'))).toBe(true);
    expect(buttonTexts.some(t => t.startsWith('Caught'))).toBe(true);
    expect(buttonTexts.some(t => t.startsWith('Offline'))).toBe(true);
    expect(buttonTexts.some(t => t.startsWith('Lowbatt'))).toBe(true);
    expect(buttonTexts.some(t => t.startsWith('Disarmed'))).toBe(true);
    expect(buttonTexts.some(t => t.startsWith('Normal'))).toBe(true);
  });

  it('renders search input with correct placeholder', () => {
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    const searchInput = screen.getByPlaceholderText('Search by name or unit ID');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders sort dropdown with 4 options', () => {
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    // The sort select has specific option text
    expect(screen.getByText('Sort: Critical First')).toBeInTheDocument();
    expect(screen.getByText('Sort: Name')).toBeInTheDocument();
    expect(screen.getByText('Sort: Last Seen')).toBeInTheDocument();
    expect(screen.getByText('Sort: Battery')).toBeInTheDocument();
  });

  it('renders unit cards for each filteredUnit', () => {
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    expect(screen.getByText('Trap Alpha')).toBeInTheDocument();
    expect(screen.getByText('Trap Bravo')).toBeInTheDocument();
  });

  it('displays unit count', () => {
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    // The header shows "Units 2"
    expect(screen.getByText('Units 2')).toBeInTheDocument();
  });

  it('calls onSelect when a unit card is clicked', async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    // Click on a unit card — find by name then click its container
    const unitCard = screen.getByText('Trap Alpha').closest('[class*="cursor-pointer"]');
    expect(unitCard).not.toBeNull();
    await user.click(unitCard!);

    expect(props.onSelect).toHaveBeenCalledWith('UNIT_001');
  });

  it('calls onStatusFilterChange when filter button is clicked', async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    // Click the "Caught" filter button
    const caughtButton = screen.getByText(/^Caught/);
    await user.click(caughtButton);

    expect(props.onStatusFilterChange).toHaveBeenCalledWith('caught');
  });

  it('calls onSearchQueryChange when search input changes', async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    const searchInput = screen.getByPlaceholderText('Search by name or unit ID');
    await user.type(searchInput, 'Alpha');

    // userEvent.type fires onChange for each character
    expect(props.onSearchQueryChange).toHaveBeenCalled();
    // Last call should have full text
    const lastCall = vi.mocked(props.onSearchQueryChange).mock.calls.at(-1);
    expect(lastCall?.[0]).toContain('a');
  });

  it('calls onSortKeyChange when sort dropdown changes', async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    // Find the sort select (second combobox) and change it
    const selects = screen.getAllByRole('combobox');
    const sortSelect = selects.find(s =>
      s.querySelector('option[value="name"]'),
    );
    expect(sortSelect).toBeDefined();
    await user.selectOptions(sortSelect!, 'name');

    expect(props.onSortKeyChange).toHaveBeenCalledWith('name');
  });

  it('shows fleet battery bar when units exist', () => {
    const props = createDefaultProps();
    render(<UnitGrid {...props} />);

    expect(screen.getByText('Fleet Battery')).toBeInTheDocument();
    expect(screen.getByText('2 units')).toBeInTheDocument();
  });

  it('renders "Recent Events" section from embedded EventList', () => {
    const props = createDefaultProps({
      events: [createEvent({ id: 1, unit_id: 'UNIT_001' })],
    });
    render(<UnitGrid {...props} />);

    expect(screen.getByText('Recent Events')).toBeInTheDocument();
  });

  it('renders empty state when no filteredUnits', () => {
    const props = createDefaultProps({ filteredUnits: [] });
    render(<UnitGrid {...props} />);

    // Unit count should show 0
    expect(screen.getByText('Units 0')).toBeInTheDocument();
  });

  it('highlights selected unit card', () => {
    const props = createDefaultProps({ selected: 'UNIT_001' });
    const { container } = render(<UnitGrid {...props} />);

    // The selected card should have the accent border class
    const cards = container.querySelectorAll('[class*="cursor-pointer"]');
    const selectedCard = Array.from(cards).find(c =>
      c.className.includes('accent'),
    );
    expect(selectedCard).toBeDefined();
  });
});
