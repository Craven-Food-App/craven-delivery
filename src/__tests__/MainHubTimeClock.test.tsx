import { describe, it, expect } from 'vitest';
import { calculateDuration } from '../pages/MainHub';

describe('MainHub time clock - calculateDuration', () => {
  it('returns 00:00:00 when start and end are the same moment', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const result = calculateDuration(now, now);
    expect(result).toBe('00:00:00');
  });

  it('correctly calculates hours, minutes, and seconds for a 1 hour span', () => {
    const start = new Date('2024-01-01T12:00:00Z');
    const end = new Date('2024-01-01T13:00:00Z');
    const result = calculateDuration(start, end);
    expect(result).toBe('01:00:00');
  });

  it('correctly calculates a complex duration (2h 15m 30s)', () => {
    const start = new Date('2024-01-01T08:00:00Z');
    const end = new Date('2024-01-01T10:15:30Z');
    const result = calculateDuration(start, end);
    expect(result).toBe('02:15:30');
  });

  it('accepts ISO string inputs as well as Date objects', () => {
    const start = '2024-01-01T09:30:00Z';
    const end = '2024-01-01T11:00:00Z';
    const result = calculateDuration(start, end);
    expect(result).toBe('01:30:00');
  });
});

