import React, { useEffect, useMemo, useState } from 'react';
import Modal from './ui/Modal';
import apiClient from '../services/apiClient';

const fmt = (n) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n || 0))} ₫`;

const getServiceLabel = (service) => {
  const name = String(service?.name || '').toLowerCase();
  if (name.includes('điện') || name.includes('dien')) return 'electricity';
  if (name.includes('nước') || name.includes('nuoc') || name.includes('water')) return 'water';
  return 'other';
};

export function ContractModal({ isOpen, onClose, room, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [error, setError] = useState('');
  const [services, setServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [formData, setFormData] = useState({
    tenantName: '',
    phone: '',
    startDate: new Date().toISOString().slice(0, 10),
    deposit: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const loadServices = async () => {
      try {
        setLoadingServices(true);
        const res = await apiClient.get('/rental/services');
        if (!mounted) return;
        const rows = res?.data || [];
        setServices(rows);
        setSelectedServiceIds(rows.map((service) => service.id));
      } catch (_) {
        if (mounted) setServices([]);
      } finally {
        if (mounted) setLoadingServices(false);
      }
    };

    loadServices();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleService = (serviceId) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.tenantName) {
      setError('Vui lòng nhập tên khách thuê.');
      return;
    }

    setLoading(true);
    try {
      const tenantRes = await apiClient.post('/rental/tenants', {
        name: formData.tenantName,
        phone: formData.phone,
      });
      const tenantId = tenantRes?.data?.id;

      await apiClient.post('/rental/contracts', {
        roomId: room.id,
        tenantId,
        startDate: formData.startDate,
        deposit: Number(formData.deposit) || 0,
        serviceIds: selectedServiceIds,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi ký hợp đồng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ký Hợp Đồng Mới">
      <div className="mb-4 rounded-xl bg-primary-light p-3 text-sm font-medium text-primary">
        Bạn đang lập hợp đồng cho: <b>{room?.name}</b>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">{error}</div>}

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Tên khách thuê (*)</label>
          <input
            type="text"
            name="tenantName"
            value={formData.tenantName}
            onChange={handleChange}
            placeholder="VD: Nguyễn Văn A"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Số điện thoại</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="VD: 0987654321"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Ngày bắt đầu</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Tiền cọc (VNĐ)</label>
            <input
              type="number"
              name="deposit"
              value={formData.deposit}
              onChange={handleChange}
              placeholder="VD: 2000000"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Dịch vụ áp dụng</div>
          {loadingServices ? (
            <div className="rounded-xl bg-background px-4 py-3 text-sm text-text-muted">Đang tải dịch vụ...</div>
          ) : services.length === 0 ? (
            <div className="rounded-xl bg-background px-4 py-3 text-sm text-text-muted">Chưa có dịch vụ nào được cấu hình.</div>
          ) : (
            <div className="grid gap-2">
              {services.map((service) => {
                const serviceId = service.id;
                const checked = selectedServiceIds.some((id) => String(id) === String(serviceId));
                return (
                  <label key={serviceId} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(serviceId)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-text-primary">{service.name}</div>
                      <div className="text-xs text-text-muted">
                        {service.type} · {fmt(service.unit_price)}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
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
        refundAmount: 0,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi thanh lý.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thanh Lý Phòng">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">{error}</div>}

        <div className="text-sm text-text-secondary">
          Xác nhận thanh lý hợp đồng cho phòng <b>{room?.name}</b> hiện đang thuê bởi <b>{room?.tenant_name}</b>?
        </div>
        <div className="rounded-xl bg-danger-light p-3 text-sm font-semibold text-danger">
          Phòng sẽ được làm trống và có thể nhận khách mới.
        </div>

        <button type="submit" disabled={loading} className="btn-primary mt-2 w-full bg-danger hover:bg-danger">
          {loading ? 'Đang xử lý...' : 'Xác nhận Thanh Lý'}
        </button>
      </form>
    </Modal>
  );
}

export function BillingModal({ isOpen, onClose, room, contractId, onSuccess }) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState('');
  const [services, setServices] = useState([]);
  const [previousDebt, setPreviousDebt] = useState(0);
  const [bankConfig, setBankConfig] = useState(null);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [period, setPeriod] = useState({ month: currentMonth, year: currentYear });
  const [meters, setMeters] = useState({
    elecOld: 0,
    elecNew: 0,
    waterOld: 0,
    waterNew: 0,
  });

  useEffect(() => {
    if (!isOpen || !room?.id || !contractId) return;
    let mounted = true;

    const loadMeta = async () => {
      try {
        setLoadingMeta(true);
        setError('');
        setSavedInvoice(null);

        const [contractServicesRes, allServicesRes, previousDebtRes, latestMeterRes, bankRes] = await Promise.all([
          apiClient.get(`/rental/contracts/${contractId}/services`),
          apiClient.get('/rental/services'),
          apiClient.get(`/invoices/previous-debt?roomId=${room.id}&month=${period.month}&year=${period.year}`),
          apiClient.get(`/invoices/latest-meter-readings?roomId=${room.id}`),
          apiClient.get('/bank-config'),
        ]);

        if (!mounted) return;

        const contractServices = contractServicesRes?.data || [];
        const activeServices = allServicesRes?.data || [];
        setServices(contractServices.length > 0 ? contractServices : activeServices);
        setPreviousDebt(Number(previousDebtRes?.data || 0));
        setBankConfig(bankRes?.data || null);

        const meterData = latestMeterRes?.data || {};
        setMeters((prev) => ({
          ...prev,
          elecOld: Number(meterData?.elec_old || 0),
          elecNew: Number(meterData?.elec_old || 0),
          waterOld: Number(meterData?.water_old || 0),
          waterNew: Number(meterData?.water_old || 0),
        }));
      } catch (err) {
        if (mounted) setError(err.message || 'Không tải được dữ liệu hóa đơn.');
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    };

    loadMeta();
    return () => {
      mounted = false;
    };
  }, [contractId, isOpen, period.month, period.year, room?.id]);

  const invoiceItems = useMemo(() => {
    return services
      .map((service) => {
        const type = String(service.type || '').toLowerCase();
        const label = getServiceLabel(service);
        let amount = 0;
        let detail = '';

        if (type === 'meter' || type === 'metered') {
          if (label === 'electricity') {
            const usage = Math.max(0, Number(meters.elecNew) - Number(meters.elecOld));
            const unitPrice = room?.has_ac && Number(service.unit_price_ac || 0) > 0
              ? Number(service.unit_price_ac)
              : Number(service.unit_price || 0);
            amount = usage * unitPrice;
            detail = `${meters.elecOld} -> ${meters.elecNew} (${usage} số)`;
          } else if (label === 'water') {
            const usage = Math.max(0, Number(meters.waterNew) - Number(meters.waterOld));
            amount = usage * Number(service.unit_price || 0);
            detail = `${meters.waterOld} -> ${meters.waterNew} (${usage} khối)`;
          } else {
            return null;
          }
        } else if (type === 'per_person') {
          amount = Number(service.unit_price || 0) * Number(room?.num_people || 1);
          detail = `${room?.num_people || 1} người`;
        } else {
          amount = Number(service.unit_price || 0);
        }

        return {
          serviceId: service.id,
          name: service.name,
          detail,
          amount,
        };
      })
      .filter(Boolean);
  }, [meters.elecNew, meters.elecOld, meters.waterNew, meters.waterOld, room?.has_ac, room?.num_people, services]);

  const invoiceTotal = useMemo(() => {
    return (
      Number(room?.price || 0) +
      Number(previousDebt || 0) +
      invoiceItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
  }, [invoiceItems, previousDebt, room?.price]);

  const qrUri = useMemo(() => {
    if (bankConfig?.qr_uri) return bankConfig.qr_uri;
    if (!bankConfig?.bank_id || !bankConfig?.account_no || !bankConfig?.account_name) return null;
    const accountName = encodeURIComponent(bankConfig.account_name);
    const addInfo = encodeURIComponent(`Thu tien phong ${room?.name || ''}`);
    return `https://img.vietqr.io/image/${bankConfig.bank_id}-${bankConfig.account_no}-compact2.png?amount=${Math.round(invoiceTotal)}&addInfo=${addInfo}&accountName=${accountName}`;
  }, [bankConfig, invoiceTotal, room?.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.post('/invoices', {
        roomId: room.id,
        contractId,
        month: Number(period.month),
        year: Number(period.year),
        roomFee: Number(room?.price || 0),
        previousDebt: Number(previousDebt || 0),
        items: invoiceItems,
        elecOld: Number(meters.elecOld || 0),
        elecNew: Number(meters.elecNew || 0),
        waterOld: Number(meters.waterOld || 0),
        waterNew: Number(meters.waterNew || 0),
      });
      setSavedInvoice(res?.data || null);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Không lưu được hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lập Hóa Đơn - ${room?.name || ''}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">{error}</div>}

        {loadingMeta ? (
          <div className="rounded-xl bg-background px-4 py-6 text-center text-sm text-text-muted">
            Đang tải dữ liệu công tơ, công nợ và dịch vụ...
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-primary-light p-4 text-sm border border-primary/20">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-primary">Tiền phòng cơ bản</span>
                <span className="font-black text-primary">{fmt(room?.price || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-primary/75">
                <span>Khách thuê: {room?.tenant_name || 'N/A'}</span>
                <span>{room?.num_people || 1} người</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Tháng</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={period.month}
                  onChange={(e) => setPeriod((prev) => ({ ...prev, month: Number(e.target.value) || currentMonth }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">Năm</label>
                <input
                  type="number"
                  min="2020"
                  value={period.year}
                  onChange={(e) => setPeriod((prev) => ({ ...prev, year: Number(e.target.value) || currentYear }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bento-card p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">Điện</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={meters.elecOld}
                    onChange={(e) => setMeters((prev) => ({ ...prev, elecOld: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                  />
                  <input
                    type="number"
                    value={meters.elecNew}
                    onChange={(e) => setMeters((prev) => ({ ...prev, elecNew: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-primary bg-background p-2 text-sm"
                  />
                </div>
              </div>

              <div className="bento-card p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">Nước</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={meters.waterOld}
                    onChange={(e) => setMeters((prev) => ({ ...prev, waterOld: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                  />
                  <input
                    type="number"
                    value={meters.waterNew}
                    onChange={(e) => setMeters((prev) => ({ ...prev, waterNew: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-primary bg-background p-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background">
              <div className="border-b border-border px-4 py-3 text-sm font-bold text-text-primary">Chi tiết hóa đơn</div>
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-text-secondary">Tiền phòng</span>
                  <span className="font-bold text-text-primary">{fmt(room?.price || 0)}</span>
                </div>
                {invoiceItems.map((item) => (
                  <div key={`${item.serviceId}-${item.name}`} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-text-primary">{item.name}</div>
                      {item.detail ? <div className="mt-1 text-xs text-text-muted">{item.detail}</div> : null}
                    </div>
                    <span className="font-bold text-text-primary">{fmt(item.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-text-secondary">Công nợ kỳ trước</span>
                  <span className="font-bold text-text-primary">{fmt(previousDebt)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-bold text-text-primary">Tổng cần thu</span>
                  <span className="text-lg font-black text-success">{fmt(invoiceTotal)}</span>
                </div>
              </div>
            </div>

            {savedInvoice ? (
              <div className="rounded-xl border border-success/20 bg-success-light p-4">
                <div className="text-sm font-bold text-success">Đã tạo hóa đơn #{savedInvoice.id}</div>
                <div className="mt-1 text-sm text-text-secondary">Tổng tiền: {fmt(savedInvoice.total_amount || invoiceTotal)}</div>
              </div>
            ) : null}

            {bankConfig ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 text-sm font-bold text-text-primary">Thông tin thanh toán</div>
                <div className="text-sm text-text-secondary">
                  {bankConfig.account_name} · {bankConfig.account_no}
                </div>
                {qrUri ? (
                  <img src={qrUri} alt="QR thanh toán" className="mt-4 h-48 w-48 rounded-xl border border-border object-contain" />
                ) : (
                  <div className="mt-3 text-xs text-text-muted">Chưa có QR tĩnh. Người dùng vẫn có thể dùng thông tin tài khoản để thu tiền.</div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-warning-light p-4 text-sm text-text-secondary">
                Chưa có cấu hình tài khoản nhận tiền. Thiết lập trong tab <b>Thiết lập</b> để hiện QR thu tiền.
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Đang lưu hóa đơn...' : savedInvoice ? 'Lưu lại hóa đơn mới' : 'Lưu hóa đơn'}
            </button>
          </>
        )}
      </form>
    </Modal>
  );
}
