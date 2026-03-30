import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrgSelector } from './OrgSelector';

// ── Organization type matches the hook export ────────────────────────────────
interface Organization {
  id: string;
  name: string;
  role: string;
}

function createOrg(overrides?: Partial<Organization>): Organization {
  return { id: 'org-1', name: 'Test Org', role: 'owner', ...overrides };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('OrgSelector', () => {
  it('renders null when orgs array is empty', () => {
    const { container } = render(
      <OrgSelector orgs={[]} currentOrg={null} onOrgChange={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders a span badge (not select) when exactly 1 org', () => {
    const org = createOrg();
    render(
      <OrgSelector orgs={[org]} currentOrg={org} onOrgChange={vi.fn()} />,
    );

    // Should display org name in a span, not a select
    const badge = screen.getByText('Test Org');
    expect(badge.tagName).toBe('SPAN');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('displays current org name in badge for single org', () => {
    const org = createOrg({ name: 'My Conservation Group' });
    render(
      <OrgSelector orgs={[org]} currentOrg={org} onOrgChange={vi.fn()} />,
    );
    expect(screen.getByText('My Conservation Group')).toBeInTheDocument();
  });

  it('renders a select dropdown when 2+ orgs', () => {
    const orgs = [
      createOrg({ id: 'org-1', name: 'Alpha Org' }),
      createOrg({ id: 'org-2', name: 'Bravo Org' }),
    ];
    render(
      <OrgSelector orgs={orgs} currentOrg={orgs[0]} onOrgChange={vi.fn()} />,
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Should have 2 options
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Alpha Org');
    expect(options[1]).toHaveTextContent('Bravo Org');
  });

  it('calls onOrgChange when dropdown selection changes', async () => {
    const user = userEvent.setup();
    const onOrgChange = vi.fn();
    const orgs = [
      createOrg({ id: 'org-1', name: 'Alpha Org' }),
      createOrg({ id: 'org-2', name: 'Bravo Org' }),
    ];
    render(
      <OrgSelector orgs={orgs} currentOrg={orgs[0]} onOrgChange={onOrgChange} />,
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'org-2');

    expect(onOrgChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'org-2', name: 'Bravo Org' }),
    );
  });
});
