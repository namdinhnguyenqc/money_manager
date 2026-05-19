import { getDaysInMonth, differenceInDays, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

/**
 * Tính số ngày thực tế trong tháng của một ngày cụ thể
 */
export const getActualDaysInMonth = (date: Date): number => {
  return getDaysInMonth(date);
};

/**
 * Tính tiền trọ theo ngày dựa trên số ngày thực tế của tháng
 * daily_rent = monthly_rent / days_in_month
 */
export const calculateDailyRent = (monthlyRent: number, dateInMonth: Date): number => {
  const days = getActualDaysInMonth(dateInMonth);
  return monthlyRent / days;
};

/**
 * Tính tiền trọ cho một khoảng thời gian trong tháng (Prorated Rent)
 * Áp dụng cho vào phòng giữa tháng hoặc trả phòng giữa tháng
 */
export const calculateProratedRent = (
  monthlyRent: number,
  startDate: Date,
  endDate: Date
) => {
  if (!isSameMonth(startDate, endDate)) {
    // Nếu khoảng ngày xuyên tháng, nghiệp vụ này thường được tách thành 2 hóa đơn hoặc tính phức tạp hơn.
    // Tuy nhiên theo yêu cầu hiện tại, chúng ta tập trung vào việc tính trong cùng 1 kỳ/tháng.
  }

  const daysInMonth = getActualDaysInMonth(startDate);
  const dailyRent = monthlyRent / daysInMonth;
  
  // differenceInDays của date-fns trả về (end - start). 
  // Ví dụ: từ ngày 5 đến ngày 31 là 26 ngày chênh lệch, nhưng thực tế ở là 27 ngày (tính cả ngày 5).
  const stayedDays = differenceInDays(endDate, startDate) + 1;
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
