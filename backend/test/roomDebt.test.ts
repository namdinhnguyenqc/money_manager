import { describe, expect, it } from 'vitest';
import { summarizeRoomInvoices } from '../src/utils/billing.js';

describe('per-room outstanding debt', () => {
  it('sums the unpaid balance across a room\'s invoices', () => {
    const summary = summarizeRoomInvoices([
      { room_id: 'r1', total_amount: 3_000_000, paid_amount: 0, status: 'unpaid', month: 6, year: 2026 },
      { room_id: 'r1', total_amount: 3_200_000, paid_amount: 0, status: 'unpaid', month: 7, year: 2026 },
    ]);

    expect(summary.get('r1')?.outstanding).toBe(6_200_000);
  });

  it('counts only the remaining balance of a partially paid invoice', () => {
    const summary = summarizeRoomInvoices([
      { room_id: 'r1', total_amount: 3_000_000, paid_amount: 1_200_000, status: 'partial', month: 7, year: 2026 },
    ]);

    expect(summary.get('r1')?.outstanding).toBe(1_800_000);
  });

  it('excludes paid invoices, so a settled room reports zero debt', () => {
    const summary = summarizeRoomInvoices([
      { room_id: 'r1', total_amount: 3_000_000, paid_amount: 3_000_000, status: 'paid', month: 7, year: 2026 },
    ]);

    expect(summary.get('r1')?.outstanding).toBe(0);
  });

  it('never reports negative debt when a tenant overpays', () => {
    const summary = summarizeRoomInvoices([
      { room_id: 'r1', total_amount: 3_000_000, paid_amount: 3_500_000, status: 'partial', month: 7, year: 2026 },
    ]);

    expect(summary.get('r1')?.outstanding).toBe(0);
  });

  it('keeps each room separate', () => {
    const summary = summarizeRoomInvoices([
      { room_id: 'r1', total_amount: 3_000_000, paid_amount: 0, status: 'unpaid', month: 7, year: 2026 },
      { room_id: 'r2', total_amount: 2_000_000, paid_amount: 0, status: 'unpaid', month: 7, year: 2026 },
    ]);

    expect(summary.get('r1')?.outstanding).toBe(3_000_000);
    expect(summary.get('r2')?.outstanding).toBe(2_000_000);
  });

  it('reports the newest invoice status, including across a year boundary', () => {
    const summary = summarizeRoomInvoices([
      { room_id: 'r1', total_amount: 1_000_000, paid_amount: 1_000_000, status: 'paid', month: 12, year: 2025 },
      { room_id: 'r1', total_amount: 1_000_000, paid_amount: 0, status: 'unpaid', month: 1, year: 2026 },
    ]);

    expect(summary.get('r1')?.latestStatus).toBe('unpaid');
  });

  it('ignores rows with no room and tolerates an empty list', () => {
    expect(summarizeRoomInvoices([]).size).toBe(0);
    expect(summarizeRoomInvoices([
      { room_id: null, total_amount: 500_000, paid_amount: 0, status: 'unpaid', month: 7, year: 2026 },
    ]).size).toBe(0);
  });

  it('handles numeric strings, which is how Postgres NUMERIC arrives over the wire', () => {
    const summary = summarizeRoomInvoices([
      { room_id: 'r1', total_amount: '3000000.00', paid_amount: '1000000.00', status: 'partial', month: 7, year: 2026 },
    ]);

    expect(summary.get('r1')?.outstanding).toBe(2_000_000);
  });
});
