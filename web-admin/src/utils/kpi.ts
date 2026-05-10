// KPI helper for Rooms under a Boarding House
export type RoomForKPI = {
  id?: string
  status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | string
}

export type RoomsKPI = {
  total: number
  available: number
  occupied: number
  maintenance: number
  occupancy: number
}

export function computeRoomsKpi(rooms: RoomForKPI[]): RoomsKPI {
  const total = Array.isArray(rooms) ? rooms.length : 0
  const available = rooms.filter((r) => r.status === 'AVAILABLE').length
  const occupied = rooms.filter((r) => r.status === 'OCCUPIED').length
  const maintenance = rooms.filter((r) => r.status === 'MAINTENANCE').length
  const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0
  return { total, available, occupied, maintenance, occupancy }
}
