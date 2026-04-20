import React, { useState, useEffect, useCallback } from 'react';
import { Home, Plus, RefreshCw, User, FileText, Clock, AlertCircle } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { ContractModal, TerminateModal, BillingModal } from '../RentalModals';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' ₫';

export default function RentalPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null); // For action panel
  const [modalType, setModalType] = useState(null); // 'contract', 'terminate', 'billing'

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/rental/rooms');
      setRooms(res?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const occupiedRooms = rooms.filter(r => r.status === 'occupied');
  const vacantRooms = rooms.filter(r => r.status !== 'occupied');
  const totalRevenue = occupiedRooms.reduce((s, r) => s + Number(r.price || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="text-primary animate-spin" />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-text-primary">Quản lý Nhà Trọ</h2>
          <p className="text-sm text-text-muted mt-0.5">{rooms.length} phòng · {occupiedRooms.length} đang thuê</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {/* Stat Bentos */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bento-card flex flex-col gap-1.5">
          <span className="text-xs text-text-muted font-medium">Tổng phòng</span>
          <span className="text-2xl font-black text-text-primary">{rooms.length}</span>
        </div>
        <div className="bento-card flex flex-col gap-1.5">
          <span className="text-xs text-text-muted font-medium">Đang thuê</span>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-success">{occupiedRooms.length}</span>
            <span className="text-xs text-text-muted mb-0.5">/ {rooms.length}</span>
          </div>
          {rooms.length > 0 && (
            <div className="w-full bg-border rounded-full h-1.5 mt-1">
              <div
                className="h-1.5 rounded-full bg-success transition-all"
                style={{ width: `${(occupiedRooms.length / rooms.length) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="bento-card flex flex-col gap-1.5">
          <span className="text-xs text-text-muted font-medium">Dự kiến thu</span>
          <span className="text-lg font-black text-warning">{fmt(totalRevenue)}</span>
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {rooms.map((room) => {
          const isOccupied = room.status === 'occupied';
          return (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
              className={`bento-card text-left transition-all hover:shadow-bento hover:-translate-y-0.5 ${selectedRoom?.id === room.id ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isOccupied ? 'bg-primary-light text-primary' : 'bg-background text-text-muted'}`}>
                  {room.name}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${isOccupied ? 'bg-success' : 'bg-border'}`} />
              </div>

              {isOccupied ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-text-muted" />
                    <span className="text-sm font-semibold text-text-primary truncate">{room.tenant_name || 'Khách thuê'}</span>
                  </div>
                  <span className="text-sm font-bold text-success">{fmt(room.price)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1">
                  <Plus size={14} className="text-text-muted" />
                  <span className="text-xs text-text-muted font-medium">Phòng trống</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Panel */}
      {selectedRoom && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-border p-4 animate-slide-up z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-primary-light rounded-xl flex items-center justify-center">
                <Home size={16} className="text-primary" />
              </div>
              <div>
                <div className="font-black text-text-primary">Phòng {selectedRoom.name}</div>
                {selectedRoom.tenant_name && (
                  <div className="text-xs text-text-muted">{selectedRoom.tenant_name}</div>
                )}
              </div>
              <button onClick={() => setSelectedRoom(null)} className="ml-auto btn-ghost text-sm">Đóng</button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'billing', icon: FileText, label: 'Lập Hóa Đơn', color: 'primary', disabled: selectedRoom.status !== 'occupied' },
                { id: 'contract', icon: User, label: 'Hợp Đồng', color: 'primary', disabled: selectedRoom.status === 'occupied' }, // Mới: Hợp đồng khi phòng trống
                { id: 'history', icon: Clock, label: 'Lịch Sử', color: 'primary', disabled: false },
                { id: 'terminate', icon: AlertCircle, label: 'Thanh Lý', color: 'danger', disabled: selectedRoom.status !== 'occupied' },
              ].map(({ id, icon: Icon, label, color, disabled }) => (
                <button
                  key={label}
                  disabled={disabled}
                  onClick={() => setModalType(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                    ${disabled
                      ? 'border-border bg-background text-text-muted cursor-not-allowed opacity-50'
                      : color === 'danger'
                        ? 'border-danger/20 bg-danger-light text-danger hover:bg-danger hover:text-white'
                        : 'border-border bg-background text-text-secondary hover:bg-primary-light hover:text-primary hover:border-primary/20'
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
            onSuccess={() => { setModalType(null); load(); }}
          />
          <TerminateModal
            isOpen={modalType === 'terminate'}
            onClose={() => setModalType(null)}
            room={selectedRoom}
            contractId={selectedRoom.contract_id}
            onSuccess={() => { setModalType(null); setSelectedRoom(null); load(); }}
          />
          <BillingModal
            isOpen={modalType === 'billing'}
            onClose={() => setModalType(null)}
            room={selectedRoom}
            contractId={selectedRoom.contract_id}
            onSuccess={() => { setModalType(null); load(); }}
          />
        </>
      )}
    </div>
  );
}
