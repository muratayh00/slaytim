/**
 * Tests for client/src/lib/utils.ts
 *
 * Run with: npm install --save-dev jest ts-jest @types/jest && npx jest
 */
import { formatDate, formatRelative, getInitials, cn } from '../lib/utils';

describe('formatDate', () => {
  it('returns a Turkish-locale date string', () => {
    const result = formatDate('2024-06-15T00:00:00.000Z');
    expect(result).toMatch(/2024/);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts a Date object', () => {
    const d = new Date('2024-01-01T00:00:00.000Z');
    expect(() => formatDate(d)).not.toThrow();
  });

  it('returns safe fallback for invalid date value', () => {
    expect(formatDate('not-a-date')).toBe('-');
  });
});

describe('formatRelative', () => {
  const now = Date.now();

  it('returns "az önce" for times under 1 minute ago', () => {
    const recent = new Date(now - 30_000).toISOString();
    expect(formatRelative(recent)).toBe('az önce');
  });

  it('returns minutes label for 1-59 minutes ago', () => {
    const fiveMins = new Date(now - 5 * 60_000).toISOString();
    expect(formatRelative(fiveMins)).toBe('5 dk önce');
  });

  it('returns hours label for 1-23 hours ago', () => {
    const twoHours = new Date(now - 2 * 3_600_000).toISOString();
    expect(formatRelative(twoHours)).toBe('2 sa önce');
  });

  it('returns days label for 1-6 days ago', () => {
    const threeDays = new Date(now - 3 * 86_400_000).toISOString();
    expect(formatRelative(threeDays)).toBe('3 gün önce');
  });

  it('falls back to formatDate for dates older than 7 days', () => {
    const oldDate = new Date(now - 10 * 86_400_000).toISOString();
    const result = formatRelative(oldDate);
    // Should contain a year (falls through to full date format)
    expect(result).toMatch(/\d{4}/);
    // Should NOT contain "dk", "sa", or "gün"
    expect(result).not.toMatch(/dk|sa önce|gün önce/);
  });

  it('returns safe fallback for invalid date value', () => {
    expect(formatRelative('not-a-date')).toBe('-');
  });
});

describe('getInitials', () => {
  it('returns uppercase first letter for a single word', () => {
    expect(getInitials('alice')).toBe('A');
  });

  it('returns first letters of two words', () => {
    expect(getInitials('alice bob')).toBe('AB');
  });

  it('truncates to 2 characters for longer names', () => {
    const result = getInitials('alice bob carol');
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('handles empty string without throwing', () => {
    expect(() => getInitials('')).not.toThrow();
  });
});

describe('cn (class name merger)', () => {
  it('joins two class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('drops falsy values', () => {
    expect(cn('foo', false && 'bar', undefined, 'baz')).toBe('foo baz');
  });

  it('overrides earlier Tailwind utility with later one', () => {
    // tailwind-merge deduplicates conflicting utilities
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('merges conditional class objects', () => {
    const isActive = true;
    const result = cn('base', { active: isActive, inactive: !isActive });
    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).not.toContain('inactive');
  });
});
