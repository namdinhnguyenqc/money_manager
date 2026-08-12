import { describe, expect, it } from 'vitest';
import { calculateProratedRoomFee, resolveInvoiceRoomFee } from '../src/utils/billing.js';

describe('first-month room fee proration', () => {
  it('charges from 17 July through 31 July inclusively', () => {
    expect(calculateProratedRoomFee(3_100_000, '2026-07-17', 7, 2026)).toBe(1_500_000);
  });

  it('keeps full rent for later months and a first-day move-in', () => {
    expect(calculateProratedRoomFee(3_100_000, '2026-07-17', 8, 2026)).toBe(3_100_000);
    expect(calculateProratedRoomFee(3_100_000, '2026-07-01', 7, 2026)).toBe(3_100_000);
  });

  it('preserves an explicit manual override', () => {
    expect(resolveInvoiceRoomFee({
      requestedRoomFee: 900_000,
      monthlyRent: 3_100_000,
      contractStartDate: '2026-07-17',
      month: 7,
      year: 2026,
    })).toBe(900_000);
  });
});
