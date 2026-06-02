import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function FinalCTASection({ onStart }) {
  return (
    <section id="cta-final" className="py-20 md:py-28 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600" />

      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-white/10 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute -bottom-32 -left-20 w-[600px] h-[400px] bg-white/10 rounded-full"
        />
        {/* Grid dots */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-white/90">Miễn phí — Bắt đầu ngay hôm nay</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
            Bắt đầu quản lý nhà trọ<br />
            <span className="text-cyan-300">gọn gàng hơn hôm nay</span>
          </h2>

          <p className="text-blue-100 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Không cần sổ tay. Không cần file Excel phức tạp. TrọCare giúp bạn quản lý phòng, hóa đơn, công nợ và thu chi trong một nơi dễ dùng.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              id="final-cta-btn"
              onClick={onStart}
              className="group flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-blue-700 bg-white rounded-2xl hover:bg-blue-50 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Dùng TrọCare miễn phí
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <span className="text-cyan-300">✓</span>
              <span>Không cần thẻ tín dụng</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300">✓</span>
              <span>Miễn phí hoàn toàn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300">✓</span>
              <span>Dùng ngay trên điện thoại</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
