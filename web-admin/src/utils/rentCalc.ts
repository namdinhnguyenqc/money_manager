/**
 * Utility tính toán tiền thuê theo số ngày thực tế của tháng
 */

export const getActualDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const calculateProratedRent = (
  monthlyRent: number,
  startDate: Date,
  endDate: Date
) => {
  const daysInMonth = getActualDaysInMonth(startDate);
  const dailyRent = monthlyRent / daysInMonth;
  
  // Tính số ngày ở (bao gồm cả ngày bắt đầu)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const stayedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const totalAmount = dailyRent * stayedDays;

  return {
    monthlyRent,
    daysInMonth,
    dailyRent,
    stayedDays,
    totalAmount: Math.round(totalAmount),
    breakdown: `${monthlyRent.toLocaleString()} / ${daysInMonth} = ${Math.round(dailyRent).toLocaleString()} ₫/ngày | ${stayedDays} ngày x ${Math.round(dailyRent).toLocaleString()} = ${Math.round(totalAmount).toLocaleString()} ₫`
  };
};
