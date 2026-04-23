/**
 * Match meter readings to rooms using a "Best Match" strategy.
 * @param {Array} readings - [{ value: number, type: 'electricity' }] extracted by AI
 * @param {Array} contracts - Active contracts with previous readings
 * @returns {Array} - Mapping results [{ roomName: string, oldValue: number, newValue: number, status: 'match'|'ambiguous' }]
 */
export const matchReadingsToRooms = (readings, contracts) => {
  const result = [];
  const usedReadingIndices = new Set();

  // 1. Count how many images AI could not read
  const unreadableCount = readings.filter(r => r.value === null).length;

  contracts.forEach(contract => {
    const oldVal = contract.elec_old || 0;
    let bestMatchIdx = -1;
    let minGap = Infinity;

    readings.forEach((r, idx) => {
      if (usedReadingIndices.has(idx) || r.value === null) return;
      
      const gap = r.value - oldVal;
      if (gap >= 0 && gap < 1000) {
        if (gap < minGap) {
          minGap = gap;
          bestMatchIdx = idx;
        }
      }
    });

    if (bestMatchIdx !== -1) {
      usedReadingIndices.add(bestMatchIdx);
      result.push({
        contractId: contract.id,
        roomId: contract.room_id,
        roomName: contract.room_name,
        tenantName: contract.tenant_name,
        oldValue: oldVal,
        newValue: readings[bestMatchIdx].value,
        consumption: minGap,
        status: 'match'
      });
    } else {
      result.push({
        contractId: contract.id,
        roomId: contract.room_id,
        roomName: contract.room_name,
        tenantName: contract.tenant_name,
        oldValue: oldVal,
        newValue: 0,
        consumption: 0,
        status: 'not_found',
        hasUnreadable: unreadableCount > 0 // Hint when there are blurry images
      });
    }
  });

  return result;
};
