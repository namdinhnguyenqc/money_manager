import React, { useState } from 'react';
import Modal from './ui/Modal';
import apiClient from '../services/apiClient';

export function ContractModal({ isOpen, onClose, room, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    tenantName: '',
    phone: '',
    startDate: new Date().toISOString().slice(0, 10),
    deposit: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.tenantName) {
      setError('Vui lòng nhập tên khách thuê');
      return;
    }

    setLoading(true);
    try {
      // Create tenant first
      const tenantRes = await apiClient.post('/rental/tenants', {
        name: formData.tenantName,
        phone: formData.phone
      });
      const tenantId = tenantRes.data.id;

      // Create contract
      await apiClient.post('/rental/contracts', {
        roomId: room.id,
        tenantId: tenantId,
        startDate: formData.startDate,
        deposit: Number(formData.deposit) || 0,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi ký hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ký Hợp Đồng Mới">
      <div className="bg-primary-light p-3 rounded-xl mb-4 text-sm text-primary font-medium">
        Bạn đang lập hợp đồng cho: <b>{room?.name}</b>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="p-3 bg-danger-light text-danger text-sm rounded-xl">{error}</div>}
        
        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Tên khách thuê (*)</label>
          <input
            type="text"
            name="tenantName"
            value={formData.tenantName}
            onChange={handleChange}
            placeholder="VD: Nguyễn Văn A"
            className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary font-medium text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Số điện thoại</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="VD: 0987654321"
            className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary font-medium text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Ngày bắt đầu</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary font-medium text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wide">Tiền cọc (VNĐ)</label>
            <input
              type="number"
              name="deposit"
              value={formData.deposit}
              onChange={handleChange}
              placeholder="VD: 2000000"
              className="w-full px-4 py-2.5 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl text-text-primary font-medium text-sm"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? 'Đang tạo...' : 'Xác nhận Ký Hợp Đồng'}
        </button>
      </form>
    </Modal>
  );
}

export function TerminateModal({ isOpen, onClose, room, contractId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post(`/rental/contracts/${contractId}/terminate`, {
        roomId: room.id,
        refundAmount: 0 // Simplification for Web UI MVP
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi thanh lý');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thanh Lý Phòng">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="p-3 bg-danger-light text-danger text-sm rounded-xl">{error}</div>}
        
        <div className="text-sm text-text-secondary">
          Xác nhận thanh lý hợp đồng cho phòng <b>{room?.name}</b> hiện đang thuê bởi <b>{room?.tenant_name}</b>?
        </div>
        <div className="bg-danger-light text-danger p-3 rounded-xl text-sm font-semibold">
          Phòng sẽ được làm trống và có thể nhận khách mới.
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full mt-2 bg-danger hover:bg-danger-dark">
          {loading ? 'Đang xử lý...' : 'Xác nhận Thanh Lý'}
        </button>
      </form>
    </Modal>
  );
}

export function BillingModal({ isOpen, onClose, room, contractId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [meters, setMeters] = useState({
    elecOld: 100,
    elecNew: 150,
    waterOld: 20,
    waterNew: 25,
  });
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [showQR, setShowQR] = useState(false);
  
  // Fake config for demo
  const services = {
    elec: 3500,
    water: 20000,
    wifi: 100000,
    trash: 30000
  };

  const handleCalc = () => {
    const elecUsed = Math.max(0, meters.elecNew - meters.elecOld);
    const waterUsed = Math.max(0, meters.waterNew - meters.waterOld);
    
    // Total = Room + (Elec * 3.5k) + (Water * 20k) + Wifi + Trash(xNumPeople)
    const total = 
      (room?.price || 0) + 
      (elecUsed * services.elec) + 
      (waterUsed * services.water) + 
      services.wifi + 
      (services.trash * (room?.num_people || 1));
      
    setInvoiceTotal(total);
    setShowQR(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!showQR) {
      handleCalc();
      return;
    }
    
    setLoading(true);
    // Simulate updating mock API
    setTimeout(() => {
      setLoading(false);
      alert('Đã lưu hóa đơn!');
      onSuccess();
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lập Hóa Đơn - ${room?.name}`}>
      <div className="flex flex-col gap-4">
        
        {!showQR ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="bg-primary-light p-4 rounded-xl text-sm border border-primary/20">
              <div className="flex justify-between items-center mb-1">
                <span className="text-primary font-medium">Tiền phòng cơ bản:</span>
                <span className="font-black text-primary">{new Intl.NumberFormat('vi-VN').format(room?.price || 0)} ₫</span>
              </div>
              <div className="flex justify-between items-center text-xs text-primary/70">
                <span>Khách thuê: {room?.tenant_name}</span>
                <span>{room?.num_people} người</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bento-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="font-bold text-xs uppercase tracking-wide">Điện (3.5k/kWh)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-text-muted">Số cũ</label>
                    <input 
                      type="number" className="w-full text-sm font-bold bg-background p-2 rounded-lg border border-border mt-1" 
                      value={meters.elecOld} onChange={e => setMeters({...meters, elecOld: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted">Số mới</label>
                    <input 
                      type="number" className="w-full text-sm font-bold bg-background p-2 rounded-lg border border-primary mt-1" 
                      value={meters.elecNew} onChange={e => setMeters({...meters, elecNew: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="bento-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="font-bold text-xs uppercase tracking-wide">Nước (20k/khối)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-text-muted">Số cũ</label>
                    <input 
                      type="number" className="w-full text-sm font-bold bg-background p-2 rounded-lg border border-border mt-1" 
                      value={meters.waterOld} onChange={e => setMeters({...meters, waterOld: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted">Số mới</label>
                    <input 
                      type="number" className="w-full text-sm font-bold bg-background p-2 rounded-lg border border-primary mt-1" 
                      value={meters.waterNew} onChange={e => setMeters({...meters, waterNew: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 text-sm text-text-secondary">
              <span>Phí cố định (Rác, Wifi):</span>
              <span className="font-bold">{new Intl.NumberFormat('vi-VN').format(services.wifi + (services.trash * (room?.num_people||1)))} ₫</span>
            </div>

            <button type="submit" className="btn-primary w-full mt-2 py-3 rounded-xl">
              Tính Tổng Tiền
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-full bg-success-light p-4 rounded-xl text-center border border-success/20 mb-4">
              <div className="text-success text-xs font-bold uppercase tracking-wide mb-1">Tổng Cần Thu</div>
              <div className="text-3xl font-black text-success">{new Intl.NumberFormat('vi-VN').format(invoiceTotal)} <span className="text-xl">₫</span></div>
            </div>
            
            <div className="p-4 bg-white border border-border rounded-2xl shadow-sm mb-4">
              <img 
                src={`https://img.vietqr.io/image/970436-0987654321-compact2.png?amount=${invoiceTotal}&addInfo=ThuTienNha${room?.name}&accountName=CHUNHATRO`} 
                alt="VietQR" 
                className="w-48 h-48 rounded-xl object-contain"
              />
            </div>
            <div className="text-xs text-text-muted mb-4 uppercase tracking-wider font-bold">Mã QR Thanh Toán</div>

            <div className="flex gap-3 w-full">
              <button onClick={() => setShowQR(false)} className="flex-1 py-3 bg-background font-bold text-text-secondary rounded-xl hover:bg-border transition-colors">
                Nhập Lại
              </button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors">
                {loading ? 'Đang lưu...' : 'Lưu & Khóa Sổ'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
