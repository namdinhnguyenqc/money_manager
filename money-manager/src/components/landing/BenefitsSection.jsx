import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const BENEFITS = [
  { text: 'Tiết kiệm thời gian cuối tháng', desc: 'Không còn ngồi tính từng phòng, hóa đơn tự động tổng hợp.' },
  { text: 'Giảm sai sót khi tính tiền', desc: 'Hệ thống tự tính điện nước, tiền phòng — không tính nhầm.' },
  { text: 'Không cần Excel phức tạp', desc: 'Quản lý trực quan, dễ hiểu hơn bảng tính.' },
  { text: 'Dễ dùng trên điện thoại', desc: 'Quản lý nhà trọ ở đâu cũng được, chỉ cần có điện thoại.' },
  { text: 'Quản lý nhiều phòng vẫn rõ ràng', desc: 'Từ ít phòng đến nhiều phòng, vẫn nắm rõ từng căn.' },
  { text: 'Miễn phí để bắt đầu', desc: 'Không mất gì khi dùng thử, bắt đầu ngay hôm nay.' },
  { text: 'Dữ liệu tập trung, dễ kiểm tra', desc: 'Tất cả trong một nơi, xem lại bất cứ lúc nào cũng được.' },
  { text: 'Phù hợp nhà trọ nhỏ và vừa', desc: 'Dành riêng cho nhà trọ, dãy trọ, căn hộ dịch vụ Việt Nam.' },
];

function MiniDashboard() {
  return (
    <div className="bg-white rounded-3xl shadow-[0_24px_60px_rgba(37,99,235,0.14)] border border-blue-50 overflow-hidden">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          {['bg-white/30', 'bg-white/30', 'bg-white/50'].map((c, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${c}`} />
          ))}
        </div>
        <span className="text-white text-xs font-semibold">Tổng quan tháng 5/2025</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Big number */}
        <div className="text-center py-2">
          <p className="text-xs text-slate-400 font-medium mb-1">Tổng doanh thu</p>
          <p className="text-3xl font-black text-slate-900">18.500.000<span className="text-lg text-slate-400">đ</span></p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-xs text-green-500 font-bold">↑ 12%</span>
            <span className="text-xs text-slate-400">so với tháng trước</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Đã thu', val: '16.2tr', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Công nợ', val: '2.3tr', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Chi phí', val: '1.2tr', color: 'text-red-500', bg: 'bg-red-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
              <p className="text-[10px] text-slate-500 mb-0.5">{s.label}</p>
              <p className={`text-sm font-black ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Progress bar rooms */}
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Phòng đã cho thuê</span>
            <span className="font-bold text-blue-600">14/16</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: '87.5%' }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>2 phòng trống</span>
            <span>87.5%</span>
          </div>
        </div>

        {/* Quick room list */}
        <div className="space-y-2">
          {[
            { room: 'Phòng 101', status: 'paid', label: 'Đã thu', amount: '3.200.000đ' },
            { room: 'Phòng 102', status: 'pending', label: 'Chưa thu', amount: '2.800.000đ' },
            { room: 'Phòng 103', status: 'paid', label: 'Đã thu', amount: '3.500.000đ' },
          ].map((r) => (
            <div key={r.room} className="flex items-center justify-between bg-slate-50/80 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${r.status === 'paid' ? 'bg-green-500' : 'bg-amber-400'}`} />
                <span className="text-xs font-semibold text-slate-700">{r.room}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-700">{r.amount}</p>
                <p className={`text-[10px] font-semibold ${r.status === 'paid' ? 'text-green-500' : 'text-amber-500'}`}>{r.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BenefitsSection() {
  return (
    <section id="benefits" className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Left: Benefits list */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-5">
                <span className="text-base">💡</span>
                <span className="text-xs font-semibold text-blue-700">Lợi ích</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">
                Vì sao chủ trọ nên dùng{' '}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">TrọCare?</span>
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4">
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-3 group"
                >
                  <CheckCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-0.5">{b.text}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <MiniDashboard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
