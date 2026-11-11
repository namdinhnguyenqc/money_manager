import { describe, expect, it } from 'vitest';
import { buildAppliedServicesSnapshot, refreshSnapshotEntries, syncActiveContractSnapshots } from '../src/utils/billing.js';

const water = { id: 's2', name: 'Tiền nước', type: 'per_person', unit: 'người', unit_price: 50000, unit_price_ac: 0 };
const wifi = { id: 's3', name: 'Wifi', type: 'fixed', unit: 'phòng', unit_price: 100000, unit_price_ac: 0 };

describe('re-pricing a contract snapshot after a service edit', () => {
  const snapshot = buildAppliedServicesSnapshot([water, wifi], { occupantCount: 2, roomHasAc: false });

  it('updates only the edited service and keeps its occupant count', () => {
    const next = refreshSnapshotEntries(snapshot, [{ ...water, unit_price: 60000 }], { occupantCount: 1, roomHasAc: false });
    expect(next?.[0]).toMatchObject({ service_id: 's2', applied_unit_price: 60000, amount: 120000, occupant_count: 2 });
    expect(next?.[1]).toBe(snapshot[1]);
  });

  it('reports no change when the price is the same', () => {
    expect(refreshSnapshotEntries(snapshot, [water], { occupantCount: 2, roomHasAc: false })).toBeNull();
  });
});

describe('syncActiveContractSnapshots', () => {
  it('writes the new price into active contracts that use the service', async () => {
    const snapshot = buildAppliedServicesSnapshot([water, wifi], { occupantCount: 1, roomHasAc: false });
    const updates: any[] = [];
    const tables: Record<string, any[]> = {
      services: [{ ...wifi, unit_price: 150000 }],
      contracts: [
        { id: 'c1', room_id: 'r1', occupant_count: 1, applied_services_snapshot: snapshot },
        { id: 'c2', room_id: 'r2', occupant_count: 1, applied_services_snapshot: buildAppliedServicesSnapshot([water], { occupantCount: 1, roomHasAc: false }) },
      ],
      rooms: [{ id: 'r1', has_ac: false }],
    };
    const db = {
      from(table: string) {
        const query: any = {
          select: () => query,
          eq: () => query,
          in: () => query,
          update: (payload: any) => { updates.push({ table, payload }); return { eq: () => ({ eq: async () => ({ error: null }) }) }; },
          then: (resolve: any) => resolve({ data: tables[table], error: null }),
        };
        return query;
      },
    };

    await expect(syncActiveContractSnapshots(db, 'u1', ['s3'])).resolves.toBe(1);
    expect(updates).toHaveLength(1);
    expect(updates[0].payload.applied_services_snapshot[1]).toMatchObject({ service_id: 's3', amount: 150000 });
  });
});

describe('older snapshot entries', () => {
  it('matches an entry with no service_id by name', () => {
    const old = [{ name: 'Wifi', type: 'fixed', unit_price: 70000, applied_unit_price: 70000, amount: 70000 }];
    const next = refreshSnapshotEntries(old, [{ ...wifi, unit_price: 50000 }], { occupantCount: 1, roomHasAc: false });
    expect(next?.[0]).toMatchObject({ service_id: 's3', applied_unit_price: 50000, amount: 50000 });
  });

  it('does not match by name when two services share it', () => {
    const old = [{ name: 'Wifi', type: 'fixed', applied_unit_price: 70000 }];
    const twins = [{ ...wifi, unit_price: 50000 }, { ...wifi, id: 's9', unit_price: 60000 }];
    expect(refreshSnapshotEntries(old, twins, { occupantCount: 1, roomHasAc: false })).toBeNull();
  });

  it('re-prices a snapshot stored as a JSON string', () => {
    const stored = JSON.stringify(buildAppliedServicesSnapshot([wifi], { occupantCount: 1, roomHasAc: false }));
    const next = refreshSnapshotEntries(stored, [{ ...wifi, unit_price: 50000 }], { occupantCount: 1, roomHasAc: false });
    expect(next?.[0]).toMatchObject({ applied_unit_price: 50000 });
  });
});
