import React, { useState } from 'react';
import Modal from './ui/Modal';
import apiClient from '../services/apiClient';

export default function TransactionModal({ isOpen, onClose, wallets, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const categories = {
    expense: ['Ăn Uống', 'Di Chuyển', 'Nhà Ở', 'Tiện Ích', 'Sức Khỏe', 'Giải Trí', 'Mua Sắm', 'Khác'],
    income: ['Lương', 'Thưởng', 'Đầu Tư', 'Tiết Kiệm', 'Cho Thuê', 'Khác']
  };

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    walletId: wallets[0]?.id || '',
    category: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (!formData.walletId) {
      setError('Vui lòng chọn ví');
      return;
    }

    setLoading(true);
    try {
      const finalDescription = formData.category 
        ? `[${formData.category}] ${formData.description}`
        : formData.description;

      await apiClient.post('/transactions', {
        type: formData.type,
        amount: Number(formData.amount),
        description: finalDescription,
        walletId: Number(formData.walletId),
        date: formData.date
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo giao dịch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm Giao Dịch">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="p-3 bg-danger-light text-danger text-sm rounded-xl">{error}</div>}
        
        {/* Type Selector Tabs */}
        <div className="flex gap-2 p-1 bg-background rounded-xl border border-border">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'expense' ? 'bg-white shadow-sm text-danger' : 'text-text-muted hover:text-text-secondary'}`}
            onClick={() => setFormData({ ...formData, type: 'expense' })}
          >
            Khoản Chi
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'income' ? 'bg-white shadow-sm text-success' : 'text-text-muted hover:text-text-secondary'}`}
            onClick={() => setFormData({ ...formData, type: 'income' })}
          >
            Khoản Thu
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Số Tiền (VNĐ)</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="VD: 500000"
            className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary font-medium"
            required
          />
        </div>

        {/* Date & Wallet Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Ngày</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary text-sm font-medium"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Ví / Nguồn</label>
            <select
              name="walletId"
              value={formData.walletId}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary text-sm font-medium"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Danh Mục Nhóm</label>
          <div className="flex flex-wrap gap-2">
            {categories[formData.type].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat === formData.category ? '' : cat })}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                  formData.category === cat 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-background text-text-secondary border-border hover:border-primary/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Chi tiết khoản chi/thu</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={formData.type === 'expense' ? "VD: Phở bò bát đá..." : "VD: Lương tháng 4..."}
            className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary font-medium text-sm"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2"
        >
          {loading ? 'Đang lưu...' : 'Lưu Giao Dịch'}
        </button>
      </form>
    </Modal>
  );
}
