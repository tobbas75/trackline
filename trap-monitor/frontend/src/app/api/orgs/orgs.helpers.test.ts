import { describe, it, expect } from 'vitest';
import { slugify, rolePriority } from './orgs.helpers';

// ── slugify ──────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('converts "My Organization" to "my-organization"', () => {
    expect(slugify('My Organization')).toBe('my-organization');
  });

  it('strips special characters', () => {
    expect(slugify('Hello World!!!')).toBe('hello-world');
  });

  it('trims leading/trailing whitespace', () => {
    expect(slugify('  spaces  ')).toBe('spaces');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('truncates to 50 characters', () => {
    const long = 'a'.repeat(100);
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it('converts uppercase to lowercase', () => {
    expect(slugify('UPPER CASE')).toBe('upper-case');
  });

  it('collapses consecutive dashes', () => {
    expect(slugify('special---chars')).toBe('special-chars');
  });

  it('removes leading and trailing dashes', () => {
    expect(slugify('-dash-')).toBe('dash');
  });

  it('handles mixed special characters and spaces', () => {
    expect(slugify('  My!! Org ** Name  ')).toBe('my-org-name');
  });
});

// ── rolePriority ─────────────────────────────────────────────────────────────

describe('rolePriority', () => {
  it('returns 4 for "owner"', () => {
    expect(rolePriority('owner')).toBe(4);
  });

  it('returns 3 for "admin"', () => {
    expect(rolePriority('admin')).toBe(3);
  });

  it('returns 2 for "member"', () => {
    expect(rolePriority('member')).toBe(2);
  });

  it('returns 1 for "viewer"', () => {
    expect(rolePriority('viewer')).toBe(1);
  });

  it('returns 0 for unknown role', () => {
    expect(rolePriority('unknown')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(rolePriority('')).toBe(0);
  });

  it('owner > admin > member > viewer priority ordering', () => {
    expect(rolePriority('owner')).toBeGreaterThan(rolePriority('admin'));
    expect(rolePriority('admin')).toBeGreaterThan(rolePriority('member'));
    expect(rolePriority('member')).toBeGreaterThan(rolePriority('viewer'));
    expect(rolePriority('viewer')).toBeGreaterThan(rolePriority('unknown'));
  });
});
