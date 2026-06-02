import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SCREENS = [
  {
    label: 'Dashboard tổng quan',
    emoji: '📊',
    content: (
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs text-slate-400">Tháng 5 / 2025</p>
            <p className="text-base font-black text-slate-900">Xin chào, chủ trọ! 👋</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm">👤</div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-600 text-white rounded-2xl p-3">
            <p className="text-xs opacity-75 mb-1">Doanh thu</p>
            <p className="text-xl font-black">18.5tr</p>
            <p className="text-xs opacity-75">↑ 12%</p>
          </div>
          <div className="bg-white border border-blue-100 rounded-2xl p-3">
            <p className="text-xs text-slate-500 mb-1">Phòng thuê</p>
            <p className="text-xl font-black text-slate-800">14/16</p>
            <p className="text-xs text-green-500">2 phòng trống</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
            <p className="text-xs text-slate-500 mb-1">Công nợ</p>
            <p className="text-lg font-black text-amber-600">2.3tr</p>
            <p className="text-xs text-amber-500">2 phòng</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
            <p className="text-xs text-slate-500 mb-1">Đã thu</p>
            <p className="text-lg font-black text-green-600">16.2tr</p>
            <p className="text-xs text-green-500">14 phòng</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: 'Danh sách phòng',
    emoji: '🏠',
    content: (
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-black text-slate-800">Tất cả phòng</p>
          <button className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-full">+ Thêm phòng</button>
        </div>
        {[
          { room: 'P.101', tenant: 'Nguyễn Văn Minh', status: 'Đã thu', amt: '3.200.000đ', s: 'paid' },
          { room: 'P.102', tenant: 'Trần Thị Lan', status: 'Chưa thu', amt: '2.800.000đ', s: 'pending' },
          { room: 'P.103', tenant: 'Lê Văn Hùng', status: 'Đã thu', amt: '3.500.000đ', s: 'paid' },
          { room: 'P.104', tenant: 'Phạm Thị Mai', status: 'Chưa thu', amt: '3.000.000đ', s: 'pending' },
          { room: 'P.105', tenant: 'Đỗ Quang Nam', status: 'Đã thu', amt: '2.600.000đ', s: 'paid' },
          { room: 'P.106', tenant: '— Phòng trống —', status: 'Trống', amt: '', s: 'empty' },
        ].map((r) => (
          <div key={r.room} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.s === 'paid' ? 'bg-green-500' : r.s === 'pending' ? 'bg-amber-400' : 'bg-slate-300'}`} />
              <div>
                <p className="text-xs font-bold text-slate-800">{r.room}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[100px]">{r.tenant}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-700">{r.amt}</p>
              <p className={`text-[10px] font-semibold ${r.s === 'paid' ? 'text-green-500' : r.s === 'pending' ? 'text-amber-500' : 'text-slate-400'}`}>{r.status}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Chi tiết hóa đơn',
    emoji: '📄',
    content: (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-sm">📄</div>
          <div>
            <p className="text-xs font-black text-slate-800">Hóa đơn tháng 5/2025</p>
            <p className="text-[10px] text-slate-400">Phòng 101 · Nguyễn Văn Minh</p>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          {[
            { label: 'Tiền phòng', val: '2.500.000đ' },
            { label: 'Tiền điện (120 kWh × 3.500đ)', val: '420.000đ' },
            { label: 'Tiền nước (6m³ × 15.000đ)', val: '90.000đ' },
            { label: 'Tiền rác / dịch vụ', val: '30.000đ' },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center text-xs">
              <span className="text-slate-500">{row.label}</span>
              <span className="font-bold text-slate-800">{row.val}</span>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-800">Tổng cộng</span>
            <span className="text-base font-black text-blue-600">3.040.000đ</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 bg-green-500 text-white text-xs font-bold py-2.5 rounded-xl">✓ Đánh dấu đã thu</button>
          <button className="flex-1 border border-blue-200 text-blue-600 text-xs font-bold py-2.5 rounded-xl">📋 Copy hóa đơn</button>
        </div>
      </div>
    ),
  },
  {
    label: 'Quản lý thu chi',
    emoji: '💰',
    content: (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-black text-slate-800">Thu chi tháng 5</p>
          <button className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-full">+ Ghi chép</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3">
            <p className="text-[10px] text-slate-500 mb-1">Tổng thu</p>
            <p className="text-lg font-black text-green-600">18.5tr</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
            <p className="text-[10px] text-slate-500 mb-1">Tổng chi</p>
            <p className="text-lg font-black text-red-500">1.2tr</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-slate-500 mb-1">Lợi nhuận tháng này</p>
          <p className="text-2xl font-black text-blue-700">17.3tr</p>
        </div>
        {[
          { label: 'Sửa máy bơm nước', type: 'chi', amt: '-350.000đ', date: '03/05' },
          { label: 'Tiền phòng 101 – Minh', type: 'thu', amt: '+3.200.000đ', date: '05/05' },
          { label: 'Tiền điện chung', type: 'chi', amt: '-820.000đ', date: '08/05' },
          { label: 'Tiền phòng 103 – Hùng', type: 'thu', amt: '+3.500.000đ', date: '07/05' },
        ].map((t, i) => (
          <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${t.type === 'thu' ? 'bg-green-500' : 'bg-red-400'}`} />
              <div>
                <p className="text-xs font-medium text-slate-700 truncate max-w-[130px]">{t.label}</p>
                <p className="text-[10px] text-slate-400">{t.date}/2025</p>
              </div>
            </div>
            <p className={`text-xs font-bold ${t.type === 'thu' ? 'text-green-600' : 'text-red-500'}`}>{t.amt}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Báo cáo tháng',
    emoji: '📈',
    content: (
      <div className="p-4 space-y-3">
        <p className="text-sm font-black text-slate-800 mb-3">Báo cáo 6 tháng gần đây</p>
        {/* Bar chart */}
        <div className="bg-slate-50 rounded-2xl p-3">
          <div className="flex items-end gap-2 h-24 mb-2">
            {[
              { m: 'T12', h: 55, val: '12.1tr' },
              { m: 'T1', h: 68, val: '14.8tr' },
              { m: 'T2', h: 60, val: '13.5tr' },
              { m: 'T3', h: 78, val: '16.0tr' },
              { m: 'T4', h: 70, val: '15.5tr' },
              { m: 'T5', h: 92, val: '18.5tr' },
            ].map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {i === 5 && <p className="text-[9px] font-bold text-blue-600">{d.val}</p>}
                <div
                  className={`w-full rounded-t-lg ${i === 5 ? 'bg-blue-500' : 'bg-blue-200'}`}
                  style={{ height: `${d.h}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {['T12', 'T1', 'T2', 'T3', 'T4', 'T5'].map((m) => (
              <span key={m} className="flex-1 text-center text-[9px] text-slate-400">{m}</span>
            ))}
          </div>
        </div>
        {/* Summary */}
        {[
          { label: 'Tổng thu T5', val: '18.500.000đ', color: 'text-green-600' },
          { label: 'Tổng chi T5', val: '1.200.000đ', color: 'text-red-500' },
          { label: 'Lợi nhuận T5', val: '17.300.000đ', color: 'text-blue-600' },
          { label: 'Công nợ còn lại', val: '2.300.000đ', color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
            <span className="text-slate-500 text-xs">{s.label}</span>
            <span className={`font-bold text-xs ${s.color}`}>{s.val}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function AppPreviewSection() {
  const [active, setActive] = useState(0);

  const prev = () => setActive((a) => (a - 1 + SCREENS.length) % SCREENS.length);
  const next = () => setActive((a) => (a + 1) % SCREENS.length);

  return (
    <section id="app-preview" className="py-20 md:py-28 bg-gradient-to-b from-slate-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-base">📱</span>
            <span className="text-xs font-semibold text-white/80">Xem trước giao diện</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Mọi dữ liệu quan trọng nằm trong{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              một màn hình dễ hiểu
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Thiết kế tối giản, thông tin đầy đủ. Nhìn vào là hiểu ngay tình trạng nhà trọ.
          </p>
        </motion.div>

        {/* Screen tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {SCREENS.map((screen, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                active === i
                  ? 'bg-blue-500 text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)]'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              <span>{screen.emoji}</span>
              <span className="hidden sm:inline">{screen.label}</span>
            </button>
          ))}
        </div>

        {/* Phone mockup */}
        <div className="flex justify-center items-center gap-6">
          <button
            onClick={prev}
            className="hidden sm:flex w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors"
            aria-label="Previous screen"
          >
            <ChevronLeft size={20} />
          </button>

          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Phone frame */}
            <div className="relative w-[300px] sm:w-[340px]">
              {/* Phone shell */}
              <div className="relative bg-slate-800 rounded-[3rem] p-3 shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10">
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-full z-10" />
                {/* Screen */}
                <div className="bg-white rounded-[2.5rem] overflow-hidden" style={{ minHeight: 520 }}>
                  {/* Status bar */}
                  <div className="bg-slate-50 px-4 py-3 pt-7 flex items-center justify-between border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 border border-slate-400 rounded-sm flex items-center pr-0.5">
                        <div className="w-2.5 h-1 bg-slate-400 rounded-sm" />
                      </div>
                    </div>
                  </div>
                  {/* App content */}
                  <div className="overflow-y-auto" style={{ maxHeight: 430 }}>
                    {SCREENS[active].content}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <button
            onClick={next}
            className="hidden sm:flex w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors"
            aria-label="Next screen"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Mobile nav */}
        <div className="flex justify-center gap-3 mt-8 sm:hidden">
          <button onClick={prev} className="px-5 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-full">← Trước</button>
          <button onClick={next} className="px-5 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-full">Tiếp →</button>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {SCREENS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`rounded-full transition-all duration-300 ${active === i ? 'w-6 h-2 bg-blue-400' : 'w-2 h-2 bg-white/30 hover:bg-white/50'}`}
              aria-label={`Go to screen ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
