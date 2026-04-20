import React, { useState } from 'react';
import Modal from './ui/Modal';
import apiClient from '../services/apiClient';

export function AddTradingItemModal({ isOpen, onClose, walletId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    importPrice: '',
    quantity: 1,
    importDate: new Date().toISOString().slice(0, 10),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.importPrice || Number(formData.importPrice) <= 0) {
      setError('Vui lòng nhập tên sản phẩm và tổng giá nhập hợp lệ');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/trading/items', {
        walletId: Number(walletId),
        name: formData.name,
        category: formData.category,
        importPrice: Number(formData.importPrice), // Gross total
        quantity: Number(formData.quantity),
        importDate: formData.importDate
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi thêm hàng');
    } finally {
      setLoading(false);
    }
  };

  const unitPrice = formData.importPrice && formData.quantity ? (Number(formData.importPrice) / Number(formData.quantity)) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nhập Lô Hàng Mới">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="p-3 bg-danger-light text-danger text-sm rounded-xl">{error}</div>}
        
        <div className="bg-primary-light p-4 rounded-xl text-sm border border-primary/20">
          <p className="text-primary font-medium mb-1">
            <span className="font-bold">Nhập theo lô:</span> Nếu bạn nhập số lượng lớn hơn 1, hệ thống sẽ tự động chẻ nhỏ thành các sản phẩm đơn lẻ (sp 1, sp 2...) để bạn dễ theo dõi bán ra.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Tên kiện hàng/Sản phẩm (*)</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="VD: Lô Áo phông hè..."
            className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary font-medium text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Danh mục</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="VD: Quần áo"
              className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Ngày nhập</label>
            <input
              type="date"
              name="importDate"
              value={formData.importDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary text-sm font-medium"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Số lượng hàng lẻ</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary font-medium text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">TỔNG VỐN NHẬP (VNĐ)</label>
            <input
              type="number"
              name="importPrice"
              value={formData.importPrice}
              onChange={handleChange}
              placeholder="VD: 500000"
              className="w-full px-4 py-2.5 bg-background border border-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-primary font-black text-sm"
              required
            />
          </div>
        </div>

        {unitPrice > 0 && (
          <div className="text-right text-xs pt-1 text-text-muted">
            Trung bình vốn: <span className="font-bold text-text-primary">{new Intl.NumberFormat('vi-VN').format(Math.round(unitPrice))} ₫/sp</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? 'Đang thêm...' : 'Nhập Hàng (Trừ tiền vốn)'}
        </button>
      </form>
    </Modal>
  );
}

export function SellTradingItemModal({ isOpen, onClose, item, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    sellPrice: '',
    sellDate: new Date().toISOString().slice(0, 10),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.sellPrice || Number(formData.sellPrice) <= 0) {
      setError('Vui lòng nhập giá bán hợp lệ');
      return;
    }

    setLoading(true);
    try {
      await apiClient.patch(`/trading/items/${item.id}`, {
        status: 'sold',
        sellPrice: Number(formData.sellPrice),
        sellDate: formData.sellDate
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật bán hàng');
    } finally {
      setLoading(false);
    }
  };

  const profit = Number(formData.sellPrice) - (item?.import_price || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chốt Đơn">
      {item && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="bg-primary-light p-4 rounded-xl mb-2 text-sm border border-primary/20">
            <div className="font-bold text-primary mb-1">{item.name}</div>
            <div className="flex justify-between items-center text-primary/80">
              <span>Vốn nhập:</span>
              <span className="font-black">{new Intl.NumberFormat('vi-VN').format(Math.round(item.import_price || 0))} ₫</span>
            </div>
          </div>

          {error && <div className="p-3 bg-danger-light text-danger text-sm rounded-xl">{error}</div>}
          
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Giá chốt bán (Thu vào ví kinh doanh)</label>
            <input
              type="number"
              name="sellPrice"
              value={formData.sellPrice}
              onChange={handleChange}
              placeholder="VD: 150000"
              className="w-full px-4 py-3 bg-background border-2 border-primary/50 focus:border-primary focus:ring-0 outline-none rounded-xl text-primary font-black text-lg"
              required
            />
            {formData.sellPrice && profit !== 0 && (
              <div className="text-right text-xs pt-2">
                Dự kiến {profit > 0 ? 'Lãi' : 'Lỗ'}: <span className={`font-bold ${profit > 0 ? 'text-success' : 'text-danger'}`}>{new Intl.NumberFormat('vi-VN').format(Math.round(profit))} ₫</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Ngày bán</label>
            <input
              type="date"
              name="sellDate"
              value={formData.sellDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary text-sm font-medium"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-3 shadow-md border-0 bg-success hover:bg-success-dark">
            {loading ? 'Đang xuất kho...' : 'Xác nhận Bán & Thu Tiền'}
          </button>
        </form>
      )}
    </Modal>
  );
}
