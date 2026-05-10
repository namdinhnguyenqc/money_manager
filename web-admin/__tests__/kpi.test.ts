import { describe, it, expect } from 'vitest'
import { computeRoomsKpi } from '../src/utils/kpi'

describe('computeRoomsKpi', () => {
  it('calculates correct KPI for mixed statuses', () => {
    const rooms = [
      { status: 'AVAILABLE' },
      { status: 'OCCUPIED' },
      { status: 'MAINTENANCE' },
    ]
    const res = computeRoomsKpi(rooms as any)
    expect(res.total).toBe(3)
    expect(res.available).toBe(1)
    expect(res.occupied).toBe(1)
    expect(res.maintenance).toBe(1)
    expect(res.occupancy).toBe(33)
  })

  it('handles zero rooms gracefully', () => {
    const res = computeRoomsKpi([])
    expect(res.total).toBe(0)
    expect(res.occupancy).toBe(0)
  })
})
