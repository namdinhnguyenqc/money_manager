import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'TrọCare có miễn phí không?',
    a: 'Có. Bạn có thể bắt đầu sử dụng miễn phí để quản lý phòng, khách thuê, hóa đơn và thu chi cơ bản. Không cần thẻ tín dụng, không có phí ẩn.',
  },
  {
    q: 'Tôi không rành công nghệ có dùng được không?',
    a: 'Có. TrọCare được thiết kế đơn giản, dễ hiểu, ưu tiên thao tác nhanh trên điện thoại. Bạn không cần biết kỹ thuật — chỉ cần biết dùng điện thoại là đủ.',
  },
  {
    q: 'App có tính tiền điện nước tự động không?',
    a: 'Có. Bạn chỉ cần nhập chỉ số điện/nước đầu kỳ và cuối kỳ — hệ thống sẽ tự tính số dùng và thành tiền theo đơn giá bạn cài sẵn.',
  },
  {
    q: 'Có quản lý phòng trống không?',
    a: 'Có. Bạn có thể xem ngay phòng nào đang cho thuê, phòng nào còn trống để dễ theo dõi và tìm khách mới.',
  },
  {
    q: 'Có theo dõi khách chưa đóng tiền không?',
    a: 'Có. TrọCare giúp bạn biết hóa đơn nào đã thu, chưa thu hoặc còn nợ — không cần nhớ trong đầu hay ghi sổ tay.',
  },
  {
    q: 'Có dùng được cho nhiều phòng không?',
    a: 'Có. TrọCare hỗ trợ quản lý từ vài phòng đến nhiều phòng — từ nhà trọ nhỏ gia đình đến dãy trọ lớn hơn đều dùng tốt.',
  },
];

function FAQItem({ faq, isOpen, onToggle, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
        isOpen ? 'border-blue-200 shadow-[0_4px_20px_rgba(37,99,235,0.08)]' : 'border-slate-100 hover:border-blue-100'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left bg-white hover:bg-blue-50/40 transition-colors"
        aria-expanded={isOpen}
        id={`faq-btn-${index}`}
      >
        <span className="text-sm font-bold text-slate-800">{faq.q}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex-shrink-0"
        >
          <ChevronDown size={18} className={`transition-colors ${isOpen ? 'text-blue-600' : 'text-slate-400'}`} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-6 pb-5 bg-blue-50/30">
              <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section id="faq" className="py-20 md:py-28 bg-gradient-to-b from-blue-50/30 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-4">
            <span className="text-base">❓</span>
            <span className="text-xs font-semibold text-blue-700">Câu hỏi thường gặp</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">FAQ</h2>
          <p className="text-slate-500 text-lg">
            Câu hỏi phổ biến từ chủ trọ — chúng tôi trả lời thẳng, rõ ràng.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openIndex === i}
              onToggle={() => toggle(i)}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
