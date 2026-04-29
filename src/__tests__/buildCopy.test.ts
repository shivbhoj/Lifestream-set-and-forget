import { buildCopy } from '../services/notifications';

describe('buildCopy', () => {
  // ---------------------------------------------------------------------------
  // Urgent tier: days <= 1
  // ---------------------------------------------------------------------------
  it('returns URGENT copy for days === 1', () => {
    const { notifTitle, body } = buildCopy('My Passport', 1);
    expect(notifTitle).toBe('URGENT: My Passport expires tomorrow!');
    expect(body).toBe('This is your final reminder. Act now.');
  });

  it('returns URGENT copy for days === 0 (expiring today)', () => {
    // days=0 falls into the <= 1 branch — copy says "tomorrow" but fires today
    const { notifTitle } = buildCopy('Lease', 0);
    expect(notifTitle).toContain('URGENT');
  });

  it('returns URGENT copy for negative days (already expired)', () => {
    const { notifTitle } = buildCopy('Lease', -3);
    expect(notifTitle).toContain('URGENT');
  });

  // ---------------------------------------------------------------------------
  // High tier: 2 <= days <= 7
  // ---------------------------------------------------------------------------
  it('returns high-urgency copy for days === 7', () => {
    const { notifTitle, body } = buildCopy('Car Insurance', 7);
    expect(notifTitle).toBe('Car Insurance — 7 days left');
    expect(body).toBe('Getting urgent. Tap to review.');
  });

  it('returns high-urgency copy for days === 2', () => {
    const { notifTitle } = buildCopy('Car Insurance', 2);
    expect(notifTitle).toBe('Car Insurance — 2 days left');
  });

  it('does NOT return URGENT copy for days === 7', () => {
    const { notifTitle } = buildCopy('Car Insurance', 7);
    expect(notifTitle).not.toContain('URGENT');
  });

  // ---------------------------------------------------------------------------
  // Normal tier: days > 7
  // ---------------------------------------------------------------------------
  it('returns normal copy for days === 8', () => {
    const { notifTitle, body } = buildCopy('Gym Membership', 8);
    expect(notifTitle).toBe('Reminder: Gym Membership');
    expect(body).toBe('Expires in 8 days.');
  });

  it('returns normal copy for days === 30', () => {
    const { notifTitle, body } = buildCopy('Annual Review', 30);
    expect(notifTitle).toBe('Reminder: Annual Review');
    expect(body).toBe('Expires in 30 days.');
  });

  it('returns normal copy for large values', () => {
    const { notifTitle } = buildCopy('Passport', 180);
    expect(notifTitle).toBe('Reminder: Passport');
  });

  // ---------------------------------------------------------------------------
  // Tier boundary: exactly days === 7 vs 8
  // ---------------------------------------------------------------------------
  it('uses high-urgency at exactly 7 but normal at 8', () => {
    expect(buildCopy('X', 7).body).toBe('Getting urgent. Tap to review.');
    expect(buildCopy('X', 8).body).toBe('Expires in 8 days.');
  });
});
