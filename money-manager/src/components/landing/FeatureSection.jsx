import React from 'react';
import { motion } from 'framer-motion';
import {
  Home, FileText, Zap, AlertCircle, TrendingUp, FileLock, BarChart2, Bell
} from 'lucide-react';

const FEATURES = [
  {
    icon: Home,
    title: 'Quản lý phòng',
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
    points: [
      'Theo dõi phòng trống, phòng đang thuê',
      'Xem thông tin khách, giá phòng, trạng thái thanh toán',
    ],
  },
  {
    icon: FileText,
    title: 'Tạo hóa đơn hằng tháng',
    iconColor: '#0891B2',
    iconBg: '#ECFEFF',
    points: [
      'Tính tiền phòng, điện, nước, dịch vụ',
      'Hỗ trợ tháng đầu tính theo ngày thực tế',
    ],
  },
  {
    icon: Zap,
    title: 'Quản lý điện nước',
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
    points: [
      'Nhập chỉ số đầu/cuối kỳ',
      'Tự tính số dùng và thành tiền',
    ],
  },
  {
    icon: AlertCircle,
    title: 'Theo dõi công nợ',
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
    points: [
      'Biết ngay phòng nào đã thu, phòng nào chưa thu',
      'Giảm quên sót khi thu tiền cuối tháng',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Quản lý thu chi',
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    points: [
      'Ghi nhận tiền vào, tiền ra dễ dàng',
      'Theo dõi lợi nhuận nhà trọ theo tháng',
    ],
  },
  {
    icon: FileLock,
    title: 'Hợp đồng & tiền cọc',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    points: [
      'Lưu thông tin hợp đồng, ngày bắt đầu/kết thúc',
      'Theo dõi tiền cọc rõ ràng, không thất thoát',
    ],
  },
  {
    icon: BarChart2,
    title: 'Báo cáo doanh thu',
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
    points: [
      'Xem tổng thu, tổng chi, công nợ theo tháng',
      'Biểu đồ trực quan, dễ hiểu',
    ],
  },
  {
    icon: Bell,
    title: 'Thông báo hóa đơn',
    iconColor: '#DB2777',
    iconBg: '#FDF2F8',
    points: [
      'Chuẩn bị nội dung gửi khách thuê',
      'Giúp chủ trọ nhắc tiền chuyên nghiệp hơn',
    ],
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

export default function FeatureSection() {
  return (
    <section id="features" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-4">
            <span className="text-base">✨</span>
            <span className="text-xs font-semibold text-blue-700">Tính năng</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
            Đủ tính năng cần thiết để quản lý{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              nhà trọ gọn hơn
            </span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Không cần học nhiều. Mở app lên là hiểu ngay, dùng được ngay.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                whileHover={{ y: -5, boxShadow: '0 24px 48px rgba(37,99,235,0.1)', borderColor: 'rgba(37,99,235,0.2)' }}
                className="group relative bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-default overflow-hidden"
              >
                {/* Top glow line on hover */}
                <div
                  className="absolute inset-x-0 top-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${feature.iconColor}80, ${feature.iconColor})` }}
                />

                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: feature.iconBg }}
                >
                  <Icon size={22} color={feature.iconColor} strokeWidth={2} />
                </div>

                <h3 className="text-sm font-bold text-slate-800 mb-3">{feature.title}</h3>
                <ul className="space-y-2">
                  {feature.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                      <span className="flex-shrink-0 mt-0.5 text-blue-500">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
