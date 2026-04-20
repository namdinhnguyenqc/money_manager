export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('vi-VN').format(num || 0);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const toISODate = (date) => {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

export const calculateProratedRent = (price, month, year, startDateStr, endDateStr) => {
  try {
    const daysInMonth = new Date(year, month, 0).getDate();
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return { amount: price, days: daysInMonth, totalDays: daysInMonth };
    
    const end = endDateStr ? new Date(endDateStr) : null;
    if (end && isNaN(end.getTime())) return { amount: price, days: daysInMonth, totalDays: daysInMonth };

    // Invoice month range
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month - 1, daysInMonth);

    // Effective start in this month
    let effectiveStart = monthStart;
    if (start > monthStart && start <= monthEnd) {
      effectiveStart = start;
    } else if (start > monthEnd) {
      return { amount: 0, days: 0, totalDays: daysInMonth };
    }

    // Effective end in this month
    let effectiveEnd = monthEnd;
    if (end && end < monthEnd && end >= monthStart) {
      effectiveEnd = end;
    } else if (end && end < monthStart) {
      return { amount: 0, days: 0, totalDays: daysInMonth };
    }

    const diffTime = Math.abs(effectiveEnd - effectiveStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays >= daysInMonth) return { amount: price, days: daysInMonth, totalDays: daysInMonth };
    
    // Round to nearest 1000 for "đẹp bảng kê"
    const raw = (price / daysInMonth) * diffDays;
    if (isNaN(raw)) return { amount: price, days: daysInMonth, totalDays: daysInMonth };
    
    const rounded = Math.round(raw / 1000) * 1000;
    return { amount: rounded, days: diffDays, totalDays: daysInMonth };
  } catch (e) {
    console.error("Proration error:", e);
    return { amount: price, days: 30, totalDays: 30 }; // Absolute fallback
  }
};

export const getCurrentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

export const stripToDigits = (t) => {
  if (typeof t !== 'string' && typeof t !== 'number') return '';
  return String(t).replace(/[^0-9]/g, '');
};
