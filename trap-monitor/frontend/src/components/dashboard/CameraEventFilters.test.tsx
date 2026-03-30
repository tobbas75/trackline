import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraEventFilters } from './CameraEventFilters';
import type { CameraEventFiltersProps } from './CameraEventFilters';

// -- Test helpers -----------------------------------------------------------

function createDefaultProps(overrides?: Partial<CameraEventFiltersProps>): CameraEventFiltersProps {
  return {
    availableSpecies: ['Possum', 'Wallaby', 'Fox'],
    selectedSpecies: 'all' as string | 'all',
    onSpeciesChange: vi.fn(),
    confidenceThreshold: 50,
    onConfidenceChange: vi.fn(),
    dateRange: null as { start: string; end: string } | null,
    onDateRangeChange: vi.fn(),
    ...overrides,
  };
}

// -- Tests ------------------------------------------------------------------

describe('CameraEventFilters', () => {
  it('renders species dropdown with "All Species" default', () => {
    const props = createDefaultProps();
    render(<CameraEventFilters {...props} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('All Species')).toBeInTheDocument();
  });

  it('renders all available species as options', () => {
    const props = createDefaultProps();
    render(<CameraEventFilters {...props} />);

    expect(screen.getByText('Possum')).toBeInTheDocument();
    expect(screen.getByText('Wallaby')).toBeInTheDocument();
    expect(screen.getByText('Fox')).toBeInTheDocument();
  });

  it('calls onSpeciesChange when species selected', async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<CameraEventFilters {...props} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'Wallaby');

    expect(props.onSpeciesChange).toHaveBeenCalledWith('Wallaby');
  });

  it('calls onSpeciesChange with "all" when All Species selected', async () => {
    const user = userEvent.setup();
    const props = createDefaultProps({ selectedSpecies: 'Possum' });
    render(<CameraEventFilters {...props} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'all');

    expect(props.onSpeciesChange).toHaveBeenCalledWith('all');
  });

  it('renders confidence slider with current value', () => {
    const props = createDefaultProps({ confidenceThreshold: 75 });
    render(<CameraEventFilters {...props} />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('75');
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('calls onConfidenceChange when slider moved', () => {
    const props = createDefaultProps();
    render(<CameraEventFilters {...props} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '80' } });

    expect(props.onConfidenceChange).toHaveBeenCalledWith(80);
  });

  it('renders From and To date inputs', () => {
    const props = createDefaultProps();
    render(<CameraEventFilters {...props} />);

    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();

    const dateInputs = screen.getAllByDisplayValue('');
    // At least 2 date inputs (there may be others like the slider)
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onDateRangeChange when From date set', () => {
    const props = createDefaultProps();
    render(<CameraEventFilters {...props} />);

    // The From date input is the first type="date" input
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);

    fireEvent.change(dateInputs[0], { target: { value: '2024-01-15' } });
    expect(props.onDateRangeChange).toHaveBeenCalledWith({ start: '2024-01-15', end: '' });
  });

  it('calls onDateRangeChange(null) when From date cleared', () => {
    const props = createDefaultProps({
      dateRange: { start: '2024-01-01', end: '' },
    });
    render(<CameraEventFilters {...props} />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '' } });

    expect(props.onDateRangeChange).toHaveBeenCalledWith(null);
  });

  it('shows "Clear dates" button when dateRange is set', () => {
    const props = createDefaultProps({
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
    });
    render(<CameraEventFilters {...props} />);

    expect(screen.getByText('Clear dates')).toBeInTheDocument();
  });

  it('hides "Clear dates" button when dateRange is null', () => {
    const props = createDefaultProps({ dateRange: null });
    render(<CameraEventFilters {...props} />);

    expect(screen.queryByText('Clear dates')).not.toBeInTheDocument();
  });

  it('calls onDateRangeChange(null) when Clear dates clicked', async () => {
    const user = userEvent.setup();
    const props = createDefaultProps({
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
    });
    render(<CameraEventFilters {...props} />);

    await user.click(screen.getByText('Clear dates'));
    expect(props.onDateRangeChange).toHaveBeenCalledWith(null);
  });
});
