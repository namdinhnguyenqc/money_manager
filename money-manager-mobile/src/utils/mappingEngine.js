/**
 * Thuật toán khớp chỉ số với phòng dựa trên giải thuật "Best Match"
 * @param {Array} readings - [{ value: number, type: 'electricity' }] từ AI
 * @param {Array} contracts - Danh sách hợp đồng đang hoạt động kèm chỉ số cũ
 * @returns {Array} - Danh sách kết quả gán [{ roomName: string, oldValue: number, newValue: number, status: 'match'|'ambiguous' }]
 */
export const matchReadingsToRooms = (readings, contracts) => {
  const result = [];
  const usedReadingIndices = new Set();

  // 1. Đếm số lượng ảnh AI không đọc được
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
        hasUnreadable: unreadableCount > 0 // Gợi ý nếu có ảnh AI mờ
      });
    }
  });

  return result;
};
