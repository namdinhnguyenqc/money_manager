"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import RoomEditModal from '@/components/RoomEditModal';
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";

type Room = {
  id: string;
  name: string;
  boardingHouseId: string;
  price: number;
  status: string;
  isPublic: boolean;
  createdAt?: string;
};

export default function RoomsPage() {
  const params = useParams();
  const bhId = params?.id as string;
  const [rooms, setRooms] = useState<Room[]>([]);
  // Create form state
  const [roomName, setRoomName] = useState<string>("");
  const [roomPrice, setRoomPrice] = useState<string>("");
  const [roomStatus, setRoomStatus] = useState<'AVAILABLE'|'OCCUPIED'|'MAINTENANCE'>('AVAILABLE');
  const [roomIsPublic, setRoomIsPublic] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  // Delete/Update placeholders (not fully implemented yet in this patch)
  // const [confirmDelete, setConfirmDelete] = useState<{open:boolean; id:string}>({open:false, id:''});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalRoom, setModalRoom] = useState<{ id: string; name: string; price: string; status: string; isPublic: boolean } | null>(null);

  const openModalForRoom = (r: Room) => {
    setModalRoom({ id: r.id, name: r.name, price: String(r.price), status: r.status, isPublic: r.isPublic });
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalRoom(null);
  };
  const updateRoomFromModal = async (payload: { id: string; name: string; price: number; status: string; isPublic: boolean }) => {
    try {
      const res = await fetch(`${API_URL}/owner/rooms/${payload.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: payload.name, price: payload.price, status: payload.status, is_public: payload.isPublic }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to update room');
      }
      await load();
      closeModal();
      showToast('Phòng được cập nhật', 'success');
    } catch (err: any) {
      setError(err?.message ?? 'Update failed');
      showToast(err?.message ?? 'Update failed', 'error');
    }
  };
  // shared load function for rooms (ensures single source of truth)
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!bhId || !token) {
        setRooms([]);
        return;
      }
      const res = await fetch(`${API_URL}/owner/boarding-houses/${bhId}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load rooms");
      const data = await res.json();
      setRooms(data?.data || []);
    } catch (e: any) {
      setError(e?.message ?? "Error loading rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // guard and load initial data
    if (!bhId || !token) {
      window.location.href = "/login";
      return;
    }
    load();
  }, [bhId, token]);

  // editing state per room
  const [editMap, setEditMap] = useState<Record<string, { name: string; price: string; status: string; isPublic: boolean }>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalRoom, setModalRoom] = useState<{ id: string; name: string; price: string; status: string; isPublic: boolean } | null>(null);

  const openModalForRoom = (r: Room) => {
    setModalRoom({ id: r.id, name: r.name, price: String(r.price), status: r.status, isPublic: r.isPublic });
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalRoom(null);
  };
  const updateRoomFromModal = async (payload: { id: string; name: string; price: number; status: string; isPublic: boolean }) => {
    try {
      const res = await fetch(`${API_URL}/owner/rooms/${payload.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: payload.name, price: payload.price, status: payload.status, is_public: payload.isPublic }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to update room');
      }
      await load();
      closeModal();
      showToast("Phòng được cập nhật", "success");
    } catch (err: any) {
      setError(err?.message ?? 'Update room failed');
      showToast(err?.message ?? 'Update room failed', 'error');
    }
  };

  const startEdit = (r: Room) => {
    setEditMap((m) => ({ ...m, [r.id]: { name: r.name, price: String(r.price), status: r.status, isPublic: r.isPublic } }));
  };
  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cancelEdit = (id: string) => {
    setEditMap((m) => {
      const { [id]: _, ...rest } = m;
      return rest;
    });
  };

  const onEditChange = (id: string, key: string, value: any) => {
    setEditMap((m) => {
      const current = m[id] ?? { name: '', price: '', status: 'AVAILABLE', isPublic: false };
      return { ...m, [id]: { ...current, [key]: value } };
    });
  };
  const updateRoom = async (room: Room) => {
    const editing = editMap[room.id];
    const payload = {
      name: editing?.name ?? room.name,
      price: editing?.price ? Number(editing.price) : room.price,
      status: editing?.status ?? room.status,
      isPublic: editing?.isPublic ?? room.isPublic,
    };
    try {
      setUpdating(true);
      const res = await fetch(`${API_URL}/owner/rooms/${room.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to update room');
      }
      await load();
      // exit editing mode
      cancelEdit(room.id);
      showToast("Phòng được cập nhật", "success");
    } catch (err: any) {
      setError(err?.message ?? 'Update room failed');
      showToast(err?.message ?? 'Update room failed', 'error');
    } finally {
      setUpdating(false);
    }
  };
  const deleteRoom = async (roomId: string) => {
    try {
      const res = await fetch(`${API_URL}/owner/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete room');
      }
      await load();
      showToast("Phòng đã bị xóa", "success");
    } catch (err: any) {
      setError(err?.message ?? 'Delete room failed');
      showToast(err?.message ?? 'Delete room failed', 'error');
    } finally {
      setConfirmDelete({ open: false, id: null });
    }
  };
  const openDelete = (id: string) => setConfirmDelete({ open: true, id });

  const currentRoomsToRender = rooms;
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Rooms</h2>
        <Link href={`/owner/boarding-houses`}>Back</Link>
      </div>
      <div className="mb-4 border rounded p-4 bg-white">
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={async (e) => {
          e.preventDefault();
          const price = Number(roomPrice);
          if (!roomName.trim() || Number.isNaN(price) || price < 0) {
            setError("Vui lòng điền đúng tên và giá phòng hợp lệ.");
            return;
          }
          if (!bhId) return;
          try {
            setCreating(true);
            const res = await fetch(`${API_URL}/owner/boarding-houses/${bhId}/rooms`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ name: roomName.trim(), price, status: roomStatus, isPublic: roomIsPublic })
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data?.error || 'Failed to create room');
            }
            await load();
            showToast("Phòng đã được tạo", "success");
            setRoomName('');
            setRoomPrice('');
            setRoomStatus('AVAILABLE');
            setRoomIsPublic(false);
          } catch (err: any) {
            setError(err?.message ?? 'Failed to create room');
            showToast(err?.message ?? 'Failed to create room', 'error');
          } finally {
            setCreating(false);
          }
        }}>
          <div>
            <label className="block text-sm font-medium mb-1">Tên phòng</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={roomName} onChange={(e)=>setRoomName(e.target.value)} placeholder="Tên phòng" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Giá</label>
            <input type="number" min={0} step="1" className="w-full border rounded px-3 py-2 text-sm" value={roomPrice} onChange={(e)=>setRoomPrice(e.target.value)} placeholder="Giá" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select className="w-full border rounded px-3 py-2 text-sm" value={roomStatus} onChange={(e)=>setRoomStatus(e.target.value as any)}>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="OCCUPIED">OCCUPIED</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>
          <div className="flex items-center">
            <input id="roomPublic" type="checkbox" checked={roomIsPublic} onChange={(e)=>setRoomIsPublic(e.target.checked)} />
            <label htmlFor="roomPublic" className="ml-2 text-sm">Public</label>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit" disabled={creating}>{creating ? 'Đang tạo...' : 'Thêm phòng'}</button>
          </div>
        </form>
      </div>
      {loading && <div>Đang tải...</div>}
        {currentRoomsToRender.map((r) => {
          const editing = editMap[r.id];
          return (
            <div key={r.id} className="border rounded p-4 bg-white mb-3">
              { editing ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <input className="border rounded px-2 py-1" value={editing.name} onChange={(e)=>onEditChange(r.id, 'name', e.target.value)} />
                  <input className="border rounded px-2 py-1" value={editing.price} onChange={(e)=>onEditChange(r.id, 'price', e.target.value)} />
                  <select className="border rounded px-2 py-1" value={editing.status} onChange={(e)=>onEditChange(r.id, 'status', e.target.value)}>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="HIDDEN">HIDDEN</option>
                  </select>
                  <label className="flex items-center">
                    <input type="checkbox" checked={editing.isPublic} onChange={(e)=>onEditChange(r.id, 'isPublic', e.target.checked)} />
                    <span className="ml-2 text-sm">Public</span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{r.name}</div>
                  <div className={`text-sm ${r.isPublic ? 'text-green-700' : 'text-slate-500'}`}>{r.isPublic ? 'Public' : 'Private'}</div>
                </div>
              )}
              <div className="text-sm text-slate-600 mt-1">{editing ? editing.price : r.price} đ</div>
              <div className={`mt-2 text-xs rounded px-2 py-1 inline-block ${r.status === 'AVAILABLE' || r.status === 'SOON_AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {editing?.status ?? r.status}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {editing ? (
                  <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => updateRoom(r)} disabled={updating} aria-label="Save room">
                    {updating ? 'Saving...' : 'Save'}
                  </button>
                ) : (
                  <>
                    <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => startEdit(r)}>Edit</button>
                    <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => openModalForRoom(r)} aria-label="Edit via modal">Edit (Modal)</button>
                  </>
                )}
                <button className="px-3 py-1 border rounded" onClick={() => openDelete(r.id)}>Xóa</button>
              </div>
            </div>
          );
        })}
      </section>
      {modalOpen && (
        <RoomEditModal
          open={modalOpen}
          room={modalRoom ?? undefined}
          onClose={closeModal}
          onSave={(payload) => updateRoomFromModal(payload)}
        />
      )}
      <ConfirmDialog
        open={confirmDelete.open}
        title="Xác nhận"
        message="Bạn có chắc chắn muốn xóa phòng này?"
        onConfirm={() => confirmDelete.id ? deleteRoom(confirmDelete.id) : null}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
      />
    {toast && <Toast message={toast.message} type={toast.type} onHide={()=>setToast(null)} />}
    </div>
  );
}
