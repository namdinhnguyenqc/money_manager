import { describe, expect, it } from 'vitest';
import { buildAppliedServicesSnapshot } from '../src/utils/billing.js';

const elec = { id: 's1', name: 'Tiền điện', type: 'metered', unit: 'kWh', unit_price: 3500, unit_price_ac: 4000 };
const water = { id: 's2', name: 'Tiền nước', type: 'metered', unit: 'm³', unit_price: 15000, unit_price_ac: 0 };
const parking = { id: 's3', name: 'Gửi xe', type: 'per_person', unit: 'xe', unit_price: 100000, unit_price_ac: 0 };
const rubbish = { id: 's4', name: 'Tiền rác', type: 'per_room', unit: 'phòng', unit_price: 20000, unit_price_ac: 0 };

describe('applied services snapshot', () => {
  it('charges the air-conditioned electricity rate only for an AC room', () => {
    const withAc = buildAppliedServicesSnapshot([elec], { occupantCount: 2, roomHasAc: true });
    const withoutAc = buildAppliedServicesSnapshot([elec], { occupantCount: 2, roomHasAc: false });

    expect(withAc[0].applied_unit_price).toBe(4000);
    expect(withoutAc[0].applied_unit_price).toBe(3500);
  });

  it('does not apply the AC rate to water, even in an AC room', () => {
    const [snapshot] = buildAppliedServicesSnapshot([water], { occupantCount: 2, roomHasAc: true });
    expect(snapshot.applied_unit_price).toBe(15000);
  });

  it('falls back to the base rate when no AC price is configured', () => {
    const noAcPrice = { ...elec, unit_price_ac: 0 };
    const [snapshot] = buildAppliedServicesSnapshot([noAcPrice], { occupantCount: 1, roomHasAc: true });
    expect(snapshot.applied_unit_price).toBe(3500);
  });

  it('multiplies a per-person service by the occupant count', () => {
    const [snapshot] = buildAppliedServicesSnapshot([parking], { occupantCount: 3, roomHasAc: false });
    expect(snapshot.amount).toBe(300_000);
  });

  it('keeps a per-room service flat regardless of occupants', () => {
    const [snapshot] = buildAppliedServicesSnapshot([rubbish], { occupantCount: 4, roomHasAc: false });
    expect(snapshot.amount).toBe(20_000);
  });

  it('treats a missing or zero occupant count as one person', () => {
    const [zero] = buildAppliedServicesSnapshot([parking], { occupantCount: 0, roomHasAc: false });
    const [missing] = buildAppliedServicesSnapshot([parking], { occupantCount: undefined as any, roomHasAc: false });
    expect(zero.amount).toBe(100_000);
    expect(missing.amount).toBe(100_000);
  });

  it('categorises services so the invoice screen can find electricity and water', () => {
    const snapshot = buildAppliedServicesSnapshot([elec, water, parking], { occupantCount: 1, roomHasAc: false });
    expect(snapshot.map((s) => s.category)).toEqual(['electricity', 'water', 'other']);
  });

  it('records both configured prices, so a later renewal can show what changed', () => {
    const [snapshot] = buildAppliedServicesSnapshot([elec], { occupantCount: 1, roomHasAc: true });
    expect(snapshot.unit_price).toBe(3500);
    expect(snapshot.unit_price_ac).toBe(4000);
    expect(snapshot.applied_unit_price).toBe(4000);
  });

  it('handles an empty selection without throwing', () => {
    expect(buildAppliedServicesSnapshot([], { occupantCount: 2, roomHasAc: true })).toEqual([]);
  });
});
