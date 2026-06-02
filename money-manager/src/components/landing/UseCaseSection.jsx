import React from 'react';
import { motion } from 'framer-motion';

const USE_CASES = [
  {
    icon: '🏘️',
    title: 'Chủ trọ có 5–20 phòng',
    desc: 'Quản lý đủ loại phòng, thu chi, hóa đơn mà không cần nhớ từng phòng trong đầu.',
  },
  {
    icon: '👨‍👩‍👧‍👦',
    title: 'Dãy trọ gia đình',
    desc: 'Nhà trọ nhỏ do gia đình tự quản lý — cần đơn giản, nhanh, không cần học nhiều.',
  },
  {
    icon: '🏢',
    title: 'Căn hộ dịch vụ mini',
    desc: 'Cho thuê theo tháng, hợp đồng ngắn hạn, nhiều dịch vụ đi kèm — quản lý dễ hơn.',
  },
  {
    icon: '🌱',
    title: 'Người mới bắt đầu cho thuê',
    desc: 'Lần đầu cho thuê nhà, chưa biết bắt đầu từ đâu — TrọCare giúp đi từng bước.',
  },
  {
    icon: '📊',
    title: 'Đang dùng Excel, muốn chuyển sang app',
    desc: 'Đã quen Excel nhưng muốn quản lý tiện hơn, không còn lo file bị mất hoặc nhầm số.',
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

export default function UseCaseSection() {
  return (
    <section id="use-cases" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-4">
            <span className="text-base">🎯</span>
            <span className="text-xs font-semibold text-blue-700">Phù hợp cho</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
            Phù hợp cho nhiều{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              mô hình cho thuê
            </span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Dù bạn đang quản lý nhà trọ theo kiểu nào, TrọCare đều có thể giúp bạn làm gọn hơn.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {USE_CASES.map((uc, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(37,99,235,0.10)', borderColor: 'rgba(37,99,235,0.2)' }}
              className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-default"
            >
              <div className="text-4xl mb-4">{uc.icon}</div>
              <h3 className="text-sm font-bold text-slate-800 mb-2">{uc.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{uc.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
