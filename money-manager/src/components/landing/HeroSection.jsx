import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, TrendingUp, Home, FileText, AlertCircle } from 'lucide-react';

const useReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const FLOAT_BADGES = [
  { text: 'Tạo hóa đơn trong 30 giây', icon: '⚡', delay: 0.4, pos: 'top-[12%] right-[8%]' },
  { text: 'Theo dõi công nợ rõ ràng', icon: '📊', delay: 0.6, pos: 'bottom-[28%] left-[2%]' },
  { text: 'Miễn phí cho chủ trọ', icon: '🎉', delay: 0.8, pos: 'bottom-[12%] right-[5%]' },
  { text: 'Dễ dùng trên điện thoại', icon: '📱', delay: 0.5, pos: 'top-[38%] left-[0%]' },
];

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-[500px] mx-auto">
      {/* Main Dashboard Card */}
      <div className="bg-white rounded-3xl shadow-[0_30px_80px_rgba(37,99,235,0.18)] border border-blue-100/60 overflow-hidden">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/brand/transparent/trocare-symbol-tc-transparent-128.png" alt="TrọCare" className="h-7 w-7 object-contain" />
            <span className="text-white font-bold text-sm">TrọCare Dashboard</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
          </div>
        </div>

        <div className="p-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-blue-50 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-slate-500 font-medium mb-1">Doanh thu T5</p>
              <p className="text-base font-black text-blue-700 leading-tight">18.5tr</p>
              <p className="text-[9px] text-green-500 font-bold mt-0.5">↑ 12%</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-slate-500 font-medium mb-1">Đã thu</p>
              <p className="text-base font-black text-green-600 leading-tight">16.2tr</p>
              <p className="text-[9px] text-slate-400 font-medium mt-0.5">14/16 p</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-3 text-center">
              <p className="text-[10px] text-slate-500 font-medium mb-1">Công nợ</p>
              <p className="text-base font-black text-amber-600 leading-tight">2.3tr</p>
              <p className="text-[9px] text-amber-500 font-bold mt-0.5">2 p.chưa thu</p>
            </div>
          </div>

          {/* Room status */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-slate-700">Danh sách phòng</p>
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">16 phòng</span>
            </div>
            <div className="space-y-2">
              {[
                { room: 'Phòng 101', tenant: 'Anh Minh', amount: '3.200.000đ', status: 'paid', label: 'Đã thu' },
                { room: 'Phòng 102', tenant: 'Chị Lan', amount: '2.800.000đ', status: 'pending', label: 'Chưa thu' },
                { room: 'Phòng 103', tenant: 'Anh Hùng', amount: '3.500.000đ', status: 'paid', label: 'Đã thu' },
                { room: 'Phòng 104', tenant: 'Chị Mai', amount: '3.000.000đ', status: 'pending', label: 'Chưa thu' },
              ].map((item) => (
                <div key={item.room} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'paid' ? 'bg-green-500' : 'bg-amber-400'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-700">{item.room}</p>
                      <p className="text-[10px] text-slate-400">{item.tenant}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">{item.amount}</p>
                    <p className={`text-[10px] font-semibold ${item.status === 'paid' ? 'text-green-500' : 'text-amber-500'}`}>{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini chart */}
          <div className="bg-slate-50 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-600">Thu chi 6 tháng</p>
              <p className="text-[10px] text-blue-600 font-semibold">Xem chi tiết →</p>
            </div>
            <div className="flex items-end gap-1.5 h-14">
              {[55, 72, 63, 88, 76, 92].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md ${i === 5 ? 'bg-blue-500' : 'bg-blue-200'}`}
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {['T12', 'T1', 'T2', 'T3', 'T4', 'T5'].map((m) => (
                <span key={m} className="text-[9px] text-slate-400 flex-1 text-center">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection({ onStart }) {
  const reduced = useReducedMotion();
  const fadeUp = reduced ? {} : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } };
  const floating = reduced ? {} : {
    animate: { y: [0, -12, 0] },
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
  };

  return (
    <section
      id="hero"
      className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden"
      aria-label="Hero section"
    >
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-blue-100/60 rounded-full blur-[120px]"
          animate={reduced ? {} : { scale: [1, 1.1, 1], x: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-100/50 rounded-full blur-[100px]"
          animate={reduced ? {} : { scale: [1, 1.15, 1], y: [0, 30, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 w-[500px] h-[300px] bg-blue-50/70 rounded-full blur-[80px]"
          animate={reduced ? {} : { scale: [1, 1.05, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-blue-700">Miễn phí cho chủ trọ Việt Nam</span>
            </motion.div>

            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-5xl lg:text-[3.5rem] font-black text-slate-900 leading-tight mb-5"
            >
              Quản lý nhà trọ{' '}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                dễ hơn
              </span>{' '}
              mỗi ngày
            </motion.h1>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg text-slate-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0"
            >
              TrọCare giúp chủ trọ tạo hóa đơn, theo dõi tiền phòng, quản lý khách thuê, hợp đồng, điện nước và thu chi chỉ trong một nơi —{' '}
              <strong className="text-blue-700 font-semibold">miễn phí để bắt đầu.</strong>
            </motion.p>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <button
                id="hero-cta-primary"
                onClick={onStart}
                className="group flex items-center justify-center gap-2 px-7 py-4 text-base font-bold text-white rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-[0_6px_24px_rgba(37,99,235,0.45)] hover:shadow-[0_8px_32px_rgba(37,99,235,0.55)] transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Dùng TrọCare miễn phí
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                id="hero-cta-secondary"
                onClick={() => {
                  const el = document.querySelector('#features');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold text-slate-700 rounded-2xl border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
              >
                Xem tính năng
                <ChevronDown size={18} />
              </button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-4 mt-8 justify-center lg:justify-start text-sm text-slate-500"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-green-500">✓</span>
                <span>Không cần thẻ tín dụng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-500">✓</span>
                <span>Dễ dùng trên điện thoại</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-500">✓</span>
                <span>Bắt đầu ngay hôm nay</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Dashboard Mockup */}
          <div className="relative">
            {/* Floating badges */}
            {FLOAT_BADGES.map((badge, i) => (
              <motion.div
                key={badge.text}
                initial={reduced ? {} : { opacity: 0, scale: 0.8 }}
                animate={reduced ? {} : { opacity: 1, scale: 1, y: [0, -6, 0] }}
                transition={{
                  opacity: { delay: badge.delay + 0.4, duration: 0.5 },
                  scale: { delay: badge.delay + 0.4, duration: 0.5 },
                  y: { delay: badge.delay, duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
                }}
                className={`absolute z-10 hidden lg:flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-blue-100 shadow-[0_4px_20px_rgba(37,99,235,0.12)] rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 ${badge.pos}`}
              >
                <span className="text-base">{badge.icon}</span>
                {badge.text}
              </motion.div>
            ))}

            <motion.div
              {...floating}
              className="relative z-0"
            >
              <DashboardMockup />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
