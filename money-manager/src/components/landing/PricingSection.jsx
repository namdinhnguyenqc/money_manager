import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';

const FREE_FEATURES = [
  'Quản lý phòng, trạng thái phòng trống/đang thuê',
  'Quản lý khách thuê và hợp đồng',
  'Tạo hóa đơn hằng tháng',
  'Tính điện nước tự động',
  'Theo dõi thanh toán, công nợ',
  'Quản lý thu chi cơ bản',
  'Báo cáo doanh thu tổng quan',
  'Dùng trên điện thoại và máy tính',
];

export default function PricingSection({ onStart }) {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-gradient-to-b from-white to-blue-50/50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-100/40 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-1.5 mb-4">
            <span className="text-base">🎉</span>
            <span className="text-xs font-semibold text-green-700">Bảng giá</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
            Miễn phí để bắt đầu{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              quản lý nhà trọ
            </span>
          </h2>
          <p className="text-slate-500 text-lg max-w-lg mx-auto">
            Không có gói trả phí ẩn. Dùng đầy đủ, không cần thẻ tín dụng.
          </p>
        </motion.div>

        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white rounded-3xl border-2 border-blue-200 shadow-[0_32px_80px_rgba(37,99,235,0.15)] overflow-hidden max-w-[440px] w-full"
          >
            {/* Ribbon */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-center">
              <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 mb-2">
                <span className="text-white text-xs font-bold">✦ GÓI HIỆN TẠI</span>
              </div>
              <p className="text-white/80 text-sm font-medium">Tất cả tính năng</p>
            </div>

            <div className="p-8">
              {/* Plan name */}
              <div className="text-center mb-6">
                <p className="text-sm font-bold text-blue-600 mb-2 tracking-widest uppercase">Free Plan</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-slate-900">0</span>
                  <span className="text-xl font-bold text-slate-500">đ</span>
                  <span className="text-slate-400 text-sm">/tháng</span>
                </div>
                <p className="text-slate-500 text-sm mt-2">Miễn phí, không giới hạn thời gian</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {FREE_FEATURES.map((f, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-green-600" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm text-slate-700">{f}</span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA */}
              <button
                id="pricing-cta-btn"
                onClick={onStart}
                className="group w-full flex items-center justify-center gap-2 px-6 py-4 text-base font-bold text-white rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-[0_6px_24px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_32px_rgba(37,99,235,0.5)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Bắt đầu miễn phí
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-center text-xs text-slate-400 mt-4">
                Không cần thẻ tín dụng · Bắt đầu ngay hôm nay
              </p>
            </div>

            {/* Bottom note */}
            <div className="bg-blue-50/60 border-t border-blue-100 px-6 py-4">
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                💡 <strong className="text-slate-700">TrọCare đang trong giai đoạn phát triển</strong> — nhiều tính năng mới sẽ được cập nhật liên tục cho chủ trọ Việt Nam.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
