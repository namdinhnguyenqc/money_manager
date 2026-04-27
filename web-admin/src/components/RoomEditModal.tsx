import React from "react";

type RoomEditModalProps = {
  open: boolean;
  room?: {
    id: string;
    name: string;
    price: string;
    status: string;
    isPublic: boolean;
  };
  onClose: () => void;
  onSave: (payload: { id: string; name: string; price: number; status: string; isPublic: boolean }) => void;
};

export default function RoomEditModal({ open, room, onClose, onSave }: RoomEditModalProps) {
  if (!open || !room) return null;

  const [name, setName] = React.useState<string>(room.name);
  const [price, setPrice] = React.useState<string>(room.price);
  const [status, setStatus] = React.useState<string>(room.status);
  const [isPublic, setIsPublic] = React.useState<boolean>(room.isPublic);

  const handleSave = () => {
    onSave({ id: room.id, name, price: Number(price), status, isPublic });
  };

  // reset when modal opens new room
  React.useEffect(() => {
    if (open && room) {
      setName(room.name);
      setPrice(room.price);
      setStatus(room.status);
      setIsPublic(room.isPublic);
    }
  }, [open, room]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" role="dialog" aria-label="Edit room">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Chỉnh sửa Phòng</div>
          <button aria-label="Close" onClick={onClose} className="text-gray-600">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Tên</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Giá</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={price} onChange={(e)=>setPrice(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select className="w-full border rounded px-3 py-2 text-sm" value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="OCCUPIED">OCCUPIED</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>
          </div>
          <div>
            <label className="inline-flex items-center">
              <input type="checkbox" checked={isPublic} onChange={(e)=>setIsPublic(e.target.checked)} />
              <span className="ml-2 text-sm">Public</span>
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleSave}>Save</button>
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
