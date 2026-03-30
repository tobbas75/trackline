import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductToggle } from './ProductToggle';
import type { DeviceType } from '@/lib/types';

// -- Tests ------------------------------------------------------------------

describe('ProductToggle', () => {
  it('renders nothing when only one product available', () => {
    const { container } = render(
      <ProductToggle
        availableProducts={['trap_monitor'] as DeviceType[]}
        activeProduct="trap_monitor"
        onProductChange={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no products available', () => {
    const { container } = render(
      <ProductToggle
        availableProducts={[] as DeviceType[]}
        activeProduct="all"
        onProductChange={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders toggle buttons when both products available', () => {
    render(
      <ProductToggle
        availableProducts={['trap_monitor', 'camera_trap'] as DeviceType[]}
        activeProduct="all"
        onProductChange={vi.fn()}
      />,
    );

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Trap Monitor')).toBeInTheDocument();
    expect(screen.getByText('Camera Trap')).toBeInTheDocument();
  });

  it('marks active product with aria-checked=true', () => {
    render(
      <ProductToggle
        availableProducts={['trap_monitor', 'camera_trap'] as DeviceType[]}
        activeProduct="camera_trap"
        onProductChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Camera Trap')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('All')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Trap Monitor')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onProductChange when button clicked', async () => {
    const user = userEvent.setup();
    const onProductChange = vi.fn();
    render(
      <ProductToggle
        availableProducts={['trap_monitor', 'camera_trap'] as DeviceType[]}
        activeProduct="all"
        onProductChange={onProductChange}
      />,
    );

    await user.click(screen.getByText('Camera Trap'));
    expect(onProductChange).toHaveBeenCalledWith('camera_trap');
  });

  it('calls onProductChange with "all" when All clicked', async () => {
    const user = userEvent.setup();
    const onProductChange = vi.fn();
    render(
      <ProductToggle
        availableProducts={['trap_monitor', 'camera_trap'] as DeviceType[]}
        activeProduct="camera_trap"
        onProductChange={onProductChange}
      />,
    );

    await user.click(screen.getByText('All'));
    expect(onProductChange).toHaveBeenCalledWith('all');
  });

  it('has radiogroup role for accessibility', () => {
    render(
      <ProductToggle
        availableProducts={['trap_monitor', 'camera_trap'] as DeviceType[]}
        activeProduct="all"
        onProductChange={vi.fn()}
      />,
    );

    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup).toHaveAttribute('aria-label', 'Filter by product type');
  });
});
