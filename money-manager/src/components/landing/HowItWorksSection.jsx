import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const STEPS = [
  {
    number: '01',
    title: 'Tạo nhà trọ và danh sách phòng',
    desc: 'Thêm phòng, giá thuê, dịch vụ và thông tin cơ bản. Chỉ mất vài phút để thiết lập xong.',
    icon: '🏠',
    color: 'from-blue-600 to-blue-500',
    lightColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    details: ['Đặt tên phòng', 'Thêm giá thuê', 'Cài dịch vụ đi kèm'],
  },
  {
    number: '02',
    title: 'Thêm khách thuê và hợp đồng',
    desc: 'Lưu thông tin khách thuê, ngày vào ở, tiền cọc và giá phòng — có sẵn mẫu để điền nhanh.',
    icon: '👥',
    color: 'from-cyan-600 to-cyan-500',
    lightColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    details: ['Thêm thông tin khách', 'Lưu tiền cọc', 'Ghi ngày bắt đầu'],
  },
  {
    number: '03',
    title: 'Tạo hóa đơn và theo dõi thanh toán',
    desc: 'Nhập chỉ số điện nước, tạo hóa đơn tự động. Đánh dấu đã thu khi khách thanh toán xong.',
    icon: '💰',
    color: 'from-emerald-600 to-green-500',
    lightColor: 'bg-green-50',
    borderColor: 'border-green-200',
    details: ['Nhập điện nước', 'Tạo hóa đơn 1 nhấn', 'Theo dõi thu/chưa thu'],
  },
];

function StepCard({ step, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center text-center"
    >
      {/* Connector line */}
      {index < STEPS.length - 1 && (
        <div className="hidden lg:block absolute top-16 left-[calc(50%+80px)] right-0 h-0.5 w-[calc(100%-160px)]">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: index * 0.15 + 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full origin-left"
            style={{ background: 'linear-gradient(90deg, #DBEAFE, #BAE6FD)' }}
          />
        </div>
      )}

      {/* Step circle */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: index * 0.15 + 0.1, type: 'spring', stiffness: 200 }}
        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5 shadow-[0_8px_24px_rgba(37,99,235,0.25)] text-3xl`}
      >
        {step.icon}
      </motion.div>

      <div className={`text-xs font-black text-slate-400 mb-2`}>BƯỚC {step.number}</div>
      <h3 className="text-lg font-black text-slate-900 mb-3">{step.title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-5 max-w-[240px] mx-auto">{step.desc}</p>

      {/* Detail chips */}
      <div className={`${step.lightColor} border ${step.borderColor} rounded-2xl p-4 w-full max-w-[240px]`}>
        <ul className="space-y-2">
          {step.details.map((d, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span className="w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-500">
                {i + 1}
              </span>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-1.5 mb-4">
            <span className="text-base">🚀</span>
            <span className="text-xs font-semibold text-green-700">Cách hoạt động</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
            Bắt đầu quản lý nhà trọ{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              chỉ với 3 bước
            </span>
          </h2>
          <p className="text-slate-500 text-lg max-w-lg mx-auto">
            Thiết lập một lần, dùng mãi. Không cần hướng dẫn phức tạp.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
          {STEPS.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
