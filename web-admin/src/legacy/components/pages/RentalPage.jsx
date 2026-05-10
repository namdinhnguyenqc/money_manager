import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, FileText, Home, Plus, Receipt, RefreshCw, User, Wallet } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import { BillingModal, ContractModal, TerminateModal } from '../RentalModals';

const fmt = (n) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n || 0))} ₫`;

const billingStatusMeta = (room) => {
  switch (room?.latest_invoice_status) {
    case 'PAID':
      return {
        label: room?.latest_invoice_label ? `Đã thu ${room.latest_invoice_label}` : 'Đã thu',
        tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        helper: 'Kỳ gần nhất đã chốt tiền.',
      };
    case 'PARTIAL':
      return {
        label: `Thu một phần ${fmt(room?.outstanding_amount || 0)}`,
        tone: 'bg-orange-50 text-orange-700 border-orange-200',
        helper: 'Còn công nợ cần thu tiếp.',
      };
    case 'UNPAID':
      return {
        label: `Chờ thu ${fmt(room?.outstanding_amount || 0)}`,
        tone: 'bg-red-50 text-red-700 border-red-200',
        helper: room?.latest_invoice_label ? `Hóa đơn ${room.latest_invoice_label} đã lập, chưa thu đủ.` : 'Đã có hóa đơn chưa thu đủ.',
      };
    case 'READY_TO_BILL':
      return {
        label: 'Cần lập hóa đơn',
        tone: 'bg-amber-50 text-amber-700 border-amber-200',
        helper: 'Phòng đang thuê, chưa có hóa đơn kỳ hiện tại.',
      };
    default:
      return {
        label: 'Chưa vận hành',
        tone: 'bg-slate-100 text-slate-600 border-slate-200',
        helper: 'Phòng trống hoặc chưa có hợp đồng.',
      };
  }
};

const roomStatusMeta = (room) => {
  if (room?.is_expired) return { label: 'Quá hạn HĐ', tone: 'bg-danger-light text-danger border border-danger' };
  if (room?.status === 'occupied') return { label: 'Đang thuê', tone: 'bg-primary-light text-primary' };
  if (room?.status === 'maintenance') return { label: 'Bảo trì', tone: 'bg-slate-100 text-slate-700' };
  return { label: 'Phòng trống', tone: 'bg-background text-text-muted' };
};

export default function RentalPage({ navigate, initialRoomId }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [modalType, setModalType] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get('/rental/rooms');
      const nextRooms = res?.data || [];
      setRooms(nextRooms);
      setSelectedRoom((current) => {
        if (!current) return current;
        return nextRooms.find((room) => String(room.id) === String(current.id)) || current;
      });
    } catch (e) {
      setError(e.message || 'Không tải được danh sách phòng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!initialRoomId || rooms.length === 0) return;
    const matchedRoom = rooms.find((room) => String(room.id) === String(initialRoomId));
    if (matchedRoom) setSelectedRoom(matchedRoom);
  }, [initialRoomId, rooms]);

  const occupiedRooms = useMemo(() => rooms.filter((room) => room.status === 'occupied'), [rooms]);
  const vacantRooms = useMemo(() => rooms.filter((room) => room.status !== 'occupied'), [rooms]);
  const billingReadyCount = useMemo(
    () => occupiedRooms.filter((room) => room.latest_invoice_status === 'READY_TO_BILL').length,
    [occupiedRooms]
  );
  const unpaidCount = useMemo(
    () => occupiedRooms.filter((room) => ['UNPAID', 'PARTIAL'].includes(room.latest_invoice_status)).length,
    [occupiedRooms]
  );
  const collectedCount = useMemo(
    () => occupiedRooms.filter((room) => room.latest_invoice_status === 'PAID').length,
    [occupiedRooms]
  );
  const selectedBillingMeta = selectedRoom ? billingStatusMeta(selectedRoom) : null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-text-primary">Quản lý nhà trọ</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Đi theo đúng flow: chọn phòng, kiểm tra hợp đồng, lập hóa đơn, xác nhận đã thu tiền.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Làm mới
          </button>
          <button onClick={() => navigate?.('rooms')} className="btn-ghost flex items-center gap-2 text-sm">
            <Building2 size={14} />
            Cơ sở & phòng
          </button>
          <button onClick={() => navigate?.('transactions')} className="btn-primary flex items-center gap-2 text-sm">
            <Wallet size={14} />
            Thu chi nhà trọ
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <div className="bento-card flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">Tổng phòng</span>
          <span className="text-2xl font-black text-text-primary">{rooms.length}</span>
        </div>
        <div className="bento-card flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">Đang thuê</span>
          <span className="text-2xl font-black text-success">{occupiedRooms.length}</span>
          <span className="text-xs text-text-muted">Phòng đang có khách ở thực tế</span>
        </div>
        <div className="bento-card flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">Cần lập hóa đơn</span>
          <span className="text-2xl font-black text-warning">{billingReadyCount}</span>
          <span className="text-xs text-text-muted">Đã có khách nhưng chưa chốt kỳ này</span>
        </div>
        <div className="bento-card flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">Đang chờ thu</span>
          <span className="text-2xl font-black text-danger">{unpaidCount}</span>
          <span className="text-xs text-text-muted">{collectedCount} phòng đã thu đủ kỳ gần nhất</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="bento-card py-10 text-center text-sm text-text-muted">
          Chưa có phòng nào trong luồng vận hành nhà trọ.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => {
            const roomStatus = roomStatusMeta(room);
            const billingMeta = billingStatusMeta(room);
            const isSelected = selectedRoom?.id === room.id;

            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(isSelected ? null : room)}
                className={`bento-card text-left transition-all hover:-translate-y-0.5 hover:shadow-bento ${isSelected ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-text-primary">{room.name}</div>
                    <div className="mt-1 text-sm font-semibold text-success">{fmt(room.price)}</div>
                  </div>
                  <div className={`rounded-full px-2.5 py-1 text-xs font-bold ${roomStatus.tone}`}>
                    {roomStatus.label}
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
                  <User size={13} className="text-text-muted" />
                  <span className="truncate">{room.tenant_name || 'Chưa có khách thuê'}</span>
                </div>

                <div className={`rounded-xl border px-3 py-2 text-sm ${billingMeta.tone}`}>
                  <div className="font-bold">{billingMeta.label}</div>
                  <div className="mt-1 text-xs opacity-80">{billingMeta.helper}</div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                  <span>{room.contract_id ? `HĐ #${room.contract_id}` : 'Chưa có hợp đồng'}</span>
                  <span>{room.latest_invoice_id ? `HD #${room.latest_invoice_id}` : 'Chưa có hóa đơn'}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedRoom && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white p-4 animate-slide-up lg:left-[18rem]">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary">
                <Home size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-black text-text-primary">{selectedRoom.name}</div>
                <div className="text-xs text-text-muted">
                  {selectedRoom.tenant_name || 'Chưa có khách thuê'} · {selectedBillingMeta?.helper}
                </div>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="btn-ghost text-sm">Đóng</button>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Tình trạng công nợ</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${selectedBillingMeta?.tone}`}>
                    {selectedBillingMeta?.label}
                  </span>
                  <span className="font-black text-text-primary">
                    {fmt(selectedRoom.outstanding_amount || 0)}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Hợp đồng</div>
                <div className="mt-2 font-semibold text-text-primary">
                  {selectedRoom.contract_id ? `HĐ #${selectedRoom.contract_id}` : 'Chưa ký hợp đồng'}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-text-muted">Kỳ gần nhất</div>
                <div className="mt-2 font-semibold text-text-primary">
                  {selectedRoom.latest_invoice_label || 'Chưa phát hành'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  id: 'billing',
                  icon: Receipt,
                  label: ['UNPAID', 'PARTIAL'].includes(selectedRoom.latest_invoice_status) ? 'Hóa đơn / Thu tiền' : 'Lập Hóa Đơn',
                  disabled: selectedRoom.status !== 'occupied',
                  tone: 'primary',
                },
                {
                  id: 'contract',
                  icon: User,
                  label: selectedRoom.contract_id ? 'Xem Hợp Đồng' : 'Ký Hợp Đồng',
                  disabled: selectedRoom.status === 'occupied' && Boolean(selectedRoom.contract_id),
                  tone: 'primary',
                },
                {
                  id: 'room',
                  icon: Building2,
                  label: 'Mở danh sách phòng',
                  disabled: false,
                  tone: 'neutral',
                },
                {
                  id: 'terminate',
                  icon: AlertCircle,
                  label: 'Thanh Lý',
                  disabled: selectedRoom.status !== 'occupied' || !selectedRoom.contract_id,
                  tone: 'danger',
                },
              ].map(({ id, icon: Icon, label, disabled, tone }) => (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (id === 'room') {
                      navigate?.('rooms', selectedRoom.owner_room_id);
                      return;
                    }
                    setModalType(id);
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    disabled
                      ? 'cursor-not-allowed border-border bg-background text-text-muted opacity-50'
                      : tone === 'danger'
                        ? 'border-danger/20 bg-danger-light text-danger hover:bg-danger hover:text-white'
                        : tone === 'neutral'
                          ? 'border-border bg-background text-text-secondary hover:border-primary/20 hover:bg-primary-light hover:text-primary'
                          : 'border-border bg-background text-text-secondary hover:border-primary/20 hover:bg-primary-light hover:text-primary'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-xs font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedRoom && (
        <>
          <ContractModal
            isOpen={modalType === 'contract'}
            onClose={() => setModalType(null)}
            room={selectedRoom}
            onSuccess={() => {
              setModalType(null);
              load();
            }}
          />
          <TerminateModal
            isOpen={modalType === 'terminate'}
            onClose={() => setModalType(null)}
            room={selectedRoom}
            contractId={selectedRoom.contract_id}
            onSuccess={() => {
              setModalType(null);
              setSelectedRoom(null);
              load();
            }}
          />
          <BillingModal
            isOpen={modalType === 'billing'}
            onClose={() => setModalType(null)}
            room={selectedRoom}
            contractId={selectedRoom.contract_id}
            onSuccess={() => {
              load();
            }}
          />
        </>
      )}
    </div>
  );
}
