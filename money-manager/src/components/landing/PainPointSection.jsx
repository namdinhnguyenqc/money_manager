import React from 'react';
import { motion } from 'framer-motion';

const PAIN_POINTS = [
  {
    icon: '📓',
    title: 'Ghi tiền phòng bằng sổ tay dễ sai',
    desc: 'Chữ viết tay khó đọc, dễ nhầm số, mất sổ là mất hết.',
  },
  {
    icon: '😰',
    title: 'Khó nhớ phòng nào đã đóng tiền',
    desc: 'Thu từng phòng xong dễ quên, không biết ai còn nợ.',
  },
  {
    icon: '🧮',
    title: 'Tính điện nước thủ công mất thời gian',
    desc: 'Nhập tay từng số, tính nhẩm rồi viết lại — dễ tính sai.',
  },
  {
    icon: '📁',
    title: 'Khó theo dõi tiền cọc, hợp đồng, công nợ',
    desc: 'Hợp đồng chỗ này, cọc chỗ kia, nợ chỗ khác — rất loạn.',
  },
  {
    icon: '📉',
    title: 'Thu chi nhà trọ không rõ lời lỗ',
    desc: 'Không biết tháng này nhà trọ lãi hay lỗ, tiền đi đâu mất.',
  },
  {
    icon: '📨',
    title: 'Nhắn hóa đơn cho từng khách rất mất công',
    desc: 'Phải nhớ số điện, số nước, tính tay rồi nhắn từng người.',
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

export default function PainPointSection() {
  return (
    <section id="pain-points" className="py-20 md:py-28 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/50 to-white pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-full px-4 py-1.5 mb-4">
            <span className="text-base">😤</span>
            <span className="text-xs font-semibold text-amber-700">Nỗi đau thường gặp</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
            Chủ trọ thường mất quá nhiều thời gian<br className="hidden md:block" /> cho những việc{' '}
            <span className="text-amber-500">lặp đi lặp lại</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Cuối tháng bận rộn, lại phải ngồi tính tiền, ghi sổ, nhắn tin từng người — rất mệt.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {PAIN_POINTS.map((item, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(245,158,11,0.12)' }}
              className="group bg-white rounded-2xl border border-amber-100/80 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-default"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Resolution */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 text-center"
        >
          <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-base md:text-lg px-8 py-4 rounded-2xl shadow-[0_6px_24px_rgba(37,99,235,0.35)]">
            ✦ TrọCare gom tất cả về một nơi — rõ ràng, dễ kiểm tra, dễ quản lý.
          </div>
        </motion.div>
      </div>
    </section>
  );
}
