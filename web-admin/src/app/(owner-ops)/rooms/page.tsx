"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Edit3, Trash2, Plus, X, LayoutGrid, List, Search, MoreHorizontal, Banknote, Bell, Wrench, FileText } from "lucide-react";
import {
  RentalRoom,
  formatMoney,
  getFloorFromRoomName,
  getRoomArea,
  isContractSoonEnding,
  loadRentalRooms,
  loadBoardingHouses,
  roomStatusMeta,
  deleteRoom,
  currentPeriod,
  createOwnerRoom,
  forfeitReservationDeposit,
  createFacilityBlock,
  loadFacilityBlocks,
} from "@/lib/rentalOps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ops/ConfirmDialog";

const roomFilters = ["Tất cả", "Trống", "Đang thuê", "Bảo trì", "Sắp hết HĐ", "Đã cọc"];
const pageSize = 10;

export default function AllRoomsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const facilityIdFilter = searchParams.get("facility_id") || searchParams.get("facilityId") || searchParams.get("buildingId") || searchParams.get("house_id") || "";
  const [roomFilter, setRoomFilter] = useState("Tất cả");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reservationToForfeit, setReservationToForfeit] = useState<RentalRoom | null>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"map" | "list">("map");
  const [search, setSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("");

  const housesQuery = useQuery({ queryKey: ["facilities"], queryFn: loadBoardingHouses, staleTime: 60_000 });
  const roomsQuery = useQuery({
    queryKey: ["rooms", facilityIdFilter || "all"],
    queryFn: () => loadRentalRooms(facilityIdFilter || undefined),
    staleTime: 30_000,
  });

  const rooms = roomsQuery.data || [];
  const houses = housesQuery.data || [];
  const currentFacility = facilityIdFilter ? houses.find((h) => String(h.id) === String(facilityIdFilter)) : null;

  const getFacilityId = (room: RentalRoom) =>
    String(
      (room as any).building_id ||
        (room as any).facility_id ||
        (room as any).boarding_house_id ||
        (room as any).boardingHouseId ||
        (room as any).house_id ||
        (room as any).houseId ||
        ""
    );

  const getFacilityName = (room: RentalRoom) => {
    const fid = getFacilityId(room);
    return houses.find((h) => String(h.id) === String(fid))?.name || "";
  };

  const selectedBlocksQuery = useQuery({ queryKey: ["facility-blocks", facilityIdFilter], queryFn: () => loadFacilityBlocks(facilityIdFilter), enabled: Boolean(facilityIdFilter), staleTime: 30_000 });
  const facilityBlocks = selectedBlocksQuery.data || [];

  const filteredRooms = useMemo(() => rooms.filter((room) => {
    // Filter by facility if coming from boarding-houses page
    if (facilityIdFilter) {
      const fid = getFacilityId(room);
      if (fid && String(fid) !== String(facilityIdFilter)) return false;
    }
    const status = String(room.status || "").toLowerCase() || "vacant";
    if (roomFilter === "Trống" && (status === "occupied" || status === "maintenance")) return false;
    if (roomFilter === "Đang thuê" && status !== "occupied" && status !== "occupied_soon") return false;
    if (roomFilter === "Bảo trì" && status !== "maintenance") return false;
    if (roomFilter === "Sắp hết HĐ" && !isContractSoonEnding(room)) return false;
    if (roomFilter === "Đã cọc" && status !== "reserved") return false;
    if (blockFilter === "unassigned" && (room as any).block_id) return false;
    if (blockFilter && blockFilter !== "unassigned" && String((room as any).block_id || "") !== blockFilter) return false;
    if (search.trim()) {
      const needle = search.trim().toLocaleLowerCase("vi-VN");
      if (![room.name, room.tenant_name, getFacilityName(room)].some((value) => String(value || "").toLocaleLowerCase("vi-VN").includes(needle))) return false;
    }
    return true;
  }), [rooms, roomFilter, facilityIdFilter, blockFilter, search]);
  const visibleRooms = useMemo(() => filteredRooms.slice((page - 1) * pageSize, page * pageSize), [filteredRooms, page]);

  useEffect(() => {
    setPage(1);
    setBlockFilter("");
  }, [roomFilter, facilityIdFilter]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleDelete = async (room: RentalRoom) => {
    if (!window.confirm(`Xóa phòng ${room.name}? Hành động này không thể hoàn tác.`)) return;
    try {
      await deleteRoom(room.id);
      await invalidateOwnerOpsQueries(queryClient, {
        facilityId: getFacilityId(room),
        roomId: room.id,
      });
      showToast("Đã xóa phòng.");
    } catch (err: any) {
      setError(err?.message || "Không xóa được phòng.");
    }
  };

  const forfeitReservationMutation = useMutation({
    mutationFn: (depositId: string) => forfeitReservationDeposit(depositId),
    onSuccess: async (_, depositId) => {
      const room = reservationToForfeit;
      await invalidateOwnerOpsQueries(queryClient, {
        facilityId: room ? getFacilityId(room) : facilityIdFilter || undefined,
        roomId: room?.id,
      });
      setReservationToForfeit(null);
      showToast("Đã bỏ cọc và mở lại phòng.");
    },
    onError: (err: any) => setError(err?.message || "Chưa thể bỏ cọc giữ chỗ."),
  });

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Quản lý vận hành"
        title={currentFacility ? `${currentFacility.name} — Phòng` : `Tất cả phòng`}
        description={`${filteredRooms.length} phòng`}
        actions={
          <>
            {facilityIdFilter && (
              <Link href="/rooms" className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">← Tất cả phòng</Link>
            )}
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Thêm phòng mới
            </Button>
          </>
        }
      />

      {toast && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 animate-in slide-in-from-top-2">{toast}</div>}
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 animate-in slide-in-from-top-2">{error}</div>}

      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {roomFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setRoomFilter(filter)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${roomFilter === filter ? filterPillActive : filterPillInactive}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Facility Filter Dropdown */}
        <div className="flex items-center gap-2 min-w-[240px] md:max-w-[320px] w-full md:w-auto">
          <span className="text-xs font-black uppercase text-slate-400 whitespace-nowrap">Cơ sở:</span>
          <select
            value={facilityIdFilter}
            onChange={(e) => {
              const val = e.target.value;
              setBlockFilter("");
              if (val) {
                router.push(`/rooms?facility_id=${val}`);
              } else {
                router.push(`/rooms`);
              }
            }}
            className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm cursor-pointer"
          >
            <option value="">— Tất cả cơ sở —</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input w-full pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm phòng hoặc khách thuê" /></div>
          {facilityIdFilter && facilityBlocks.length > 0 ? <select aria-label="Lọc theo dãy" value={blockFilter} onChange={(event) => setBlockFilter(event.target.value)} className="input w-auto min-w-[180px]"><option value="">Tất cả dãy của cơ sở này</option><option value="unassigned">Chưa phân dãy</option>{facilityBlocks.map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}</select> : null}
        </div>
        <div className="inline-flex w-fit rounded-[8px] border border-slate-200 bg-white p-1" role="group" aria-label="Chế độ hiển thị"><button onClick={() => setView("map")} className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-2 text-sm font-semibold ${view === "map" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}><LayoutGrid size={16} />Sơ đồ phòng</button><button onClick={() => setView("list")} className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-2 text-sm font-semibold ${view === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}><List size={16} />Danh sách</button></div>
      </div>

      {roomsQuery.isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
           {[1,2,3,4].map(i => (
             <div key={i} className="h-40 animate-pulse rounded-xl bg-white border border-slate-100"></div>
           ))}
        </div>
      )}

      {!roomsQuery.isLoading && view === "map" && (
        <RoomMap rooms={visibleRooms} blocks={facilityBlocks} houses={houses} facilityIdFilter={facilityIdFilter} getFacilityName={getFacilityName} getFacilityId={getFacilityId} onForfeit={setReservationToForfeit} />
      )}
      {!roomsQuery.isLoading && view === "list" && (
        <RoomList rooms={visibleRooms} facilityIdFilter={facilityIdFilter} getFacilityId={getFacilityId} getFacilityName={getFacilityName} onForfeit={setReservationToForfeit} onDelete={handleDelete} />
      )}
      <Pagination page={page} pageSize={pageSize} total={filteredRooms.length} onPageChange={setPage} />

      {isAddModalOpen && (
        <AddRoomModal 
          houses={houses} 
          defaultFacilityId={facilityIdFilter}
          onClose={() => setIsAddModalOpen(false)} 
          onSaved={() => {
            setIsAddModalOpen(false);
            invalidateOwnerOpsQueries(queryClient, {
              facilityId: facilityIdFilter || undefined,
            });
            showToast("Đã thêm phòng mới thành công!");
          }}
        />
      )}

      {reservationToForfeit && (
        <ConfirmDialog
          title={`Bỏ cọc phòng ${reservationToForfeit.name}?`}
          description={`Khách ${reservationToForfeit.reservation_tenant_name || "đặt cọc"} sẽ không tiếp tục nhận phòng. Phòng chuyển về trạng thái Trống; khoản cọc ${formatMoney(Number(reservationToForfeit.reservation_amount || 0))} vẫn được giữ lại như khoản thu đã ghi nhận.`}
          isLoading={forfeitReservationMutation.isPending}
          onCancel={() => setReservationToForfeit(null)}
          onConfirm={() => {
            const depositId = reservationToForfeit.reservation_deposit_id;
            if (depositId) forfeitReservationMutation.mutate(depositId);
          }}
        />
      )}
    </div>
  );
}

function RoomMap({ rooms, blocks, houses, facilityIdFilter, getFacilityName, getFacilityId, onForfeit }: { rooms: RentalRoom[]; blocks: any[]; houses: any[]; facilityIdFilter: string; getFacilityName: (room: RentalRoom) => string; getFacilityId: (room: RentalRoom) => string; onForfeit: (room: RentalRoom) => void }) {
  const groups = new Map<string, RentalRoom[]>();
  rooms.forEach((room) => {
    const facilityKey = facilityIdFilter || getFacilityId(room) || "unassigned-facility";
    const blockKey = (room as any).block_id || "unassigned";
    const key = `${facilityKey}:${blockKey}`;
    groups.set(key, [...(groups.get(key) || []), room]);
  });
  if (!rooms.length) return <Card className="p-8 text-center text-sm text-slate-500">Không có phòng phù hợp bộ lọc.</Card>;
  return <div className="space-y-6">{Array.from(groups.entries()).map(([key, groupRooms]) => {
    const facilityId = getFacilityId(groupRooms[0]);
    const blockId = (groupRooms[0] as any).block_id || "unassigned";
    const blockName = blockId === "unassigned" ? "Không phân dãy" : blocks.find((block) => block.id === blockId)?.name || "Dãy đã xóa";
    return <section key={key} className="rounded-[12px] border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-4 flex items-baseline gap-2"><h2 className="text-base font-bold text-slate-900">{facilityIdFilter ? blockName : getFacilityName(groupRooms[0])}</h2>{!facilityIdFilter ? <span className="text-sm text-slate-500">· {blockName}</span> : null}<span className="text-xs text-slate-400">{groupRooms.length} phòng</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{groupRooms.map((room) => <RoomMiniCard key={room.id} room={room} facilityId={facilityId} onForfeit={onForfeit} />)}</div></section>;
  })}</div>;
}

function RoomMiniCard({ room, facilityId, onForfeit }: { room: RentalRoom; facilityId: string; onForfeit: (room: RentalRoom) => void }) {
  const status = String(room.status || "vacant").toLowerCase();
  const expiring = isContractSoonEnding(room);
  const overdue = Number(room.outstanding_amount || 0) > 0 && String(room.latest_invoice_status || "").toUpperCase() !== "PAID";
  const dot = overdue ? "bg-red-500" : expiring || status === "reserved" ? "bg-amber-400" : status === "maintenance" ? "bg-slate-500" : status === "occupied" ? "bg-emerald-500" : "bg-slate-300";
  const label = overdue ? "Cần thu" : expiring ? "Sắp hết HĐ" : status === "reserved" ? "Đã cọc" : status === "maintenance" ? "Bảo trì" : status === "occupied" ? "Đang thuê" : "Trống";
  return <div className="rounded-[8px] border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300"><div className="flex items-start justify-between gap-2"><Link href={`/rooms/${room.id}/edit?facility_id=${facilityId}`} className="min-w-0"><div className="font-bold text-slate-900">{room.name}</div><div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />{label}</div></Link><RoomActionMenu room={room} facilityId={facilityId} onForfeit={onForfeit} /></div><div className="mt-3 text-sm font-semibold text-slate-800">{formatMoney(room.price)}<span className="font-normal text-slate-500">/tháng</span></div><p className="mt-1 truncate text-xs text-slate-500">{room.tenant_name || "Chưa có khách thuê"}</p><div className="mt-3 flex gap-2">{overdue ? <><Link className="flex-1" href={`/invoices?room_id=${room.id}`}><Button size="sm" variant="primary" className="w-full"><Banknote size={14} />Thu tiền</Button></Link><Link href={`/invoices?room_id=${room.id}&action=remind`}><Button size="sm" variant="outline" aria-label="Nhắc nợ"><Bell size={14} /></Button></Link></> : status === "maintenance" ? <Link className="flex-1" href={`/rooms/${room.id}/edit?facility_id=${facilityId}`}><Button size="sm" variant="outline" className="w-full"><Wrench size={14} />Chi tiết</Button></Link> : status === "occupied" && expiring ? <><Link className="flex-1" href={`/contracts/${room.contract_id}`}><Button size="sm" variant="primary" className="w-full">Gia hạn</Button></Link><Link href={`/contracts/${room.contract_id}?action=terminate`}><Button size="sm" variant="outline">Trả phòng</Button></Link></> : status === "occupied" ? <><Link className="flex-1" href={`/invoices?room_id=${room.id}`}><Button size="sm" variant="primary" className="w-full"><Banknote size={14} />Thu tiền</Button></Link><Link href={`/contracts/${room.contract_id}?action=terminate`}><Button size="sm" variant="outline">Trả phòng</Button></Link></> : status === "reserved" ? <><Link className="flex-1" href={`/contracts/new?room_id=${room.id}&facility_id=${facilityId}`}><Button size="sm" variant="primary" className="w-full"><FileText size={14} />Tạo HĐ</Button></Link>{room.reservation_deposit_id ? <Button size="sm" variant="outline" onClick={() => onForfeit(room)}>Bỏ cọc</Button> : null}</> : <><Link className="flex-1" href={`/contracts/new?room_id=${room.id}&facility_id=${facilityId}`}><Button size="sm" variant="primary" className="w-full">Tạo HĐ</Button></Link><Link href={`/deposits?room_id=${room.id}`}><Button size="sm" variant="outline">Đặt cọc</Button></Link></>}</div></div>;
}

function RoomList({ rooms, facilityIdFilter, getFacilityId, getFacilityName, onForfeit, onDelete }: { rooms: RentalRoom[]; facilityIdFilter: string; getFacilityId: (room: RentalRoom) => string; getFacilityName: (room: RentalRoom) => string; onForfeit: (room: RentalRoom) => void; onDelete: (room: RentalRoom) => void }) {
  if (!rooms.length) return <Card className="p-8 text-center text-sm text-slate-500">Không có phòng phù hợp bộ lọc.</Card>;
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="hidden grid-cols-[minmax(100px,1fr)_minmax(150px,1.4fr)_minmax(130px,1fr)_minmax(135px,1fr)_42px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid"><span>Phòng</span><span>{facilityIdFilter ? "Khách thuê" : "Cơ sở / khách thuê"}</span><span>Trạng thái</span><span className="text-right">Giá thuê</span><span /></div>{rooms.map((room) => { const meta = roomStatusMeta(room.status, isContractSoonEnding(room), (room as any).is_expired); const facilityId = getFacilityId(room); const facilityName = getFacilityName(room); return <div key={room.id} className="grid gap-2 border-b border-slate-100 px-4 py-4 last:border-b-0 md:grid-cols-[minmax(100px,1fr)_minmax(150px,1.4fr)_minmax(130px,1fr)_minmax(135px,1fr)_42px] md:items-center md:gap-4 md:px-5"><div><Link href={`/rooms/${room.id}/edit?facility_id=${facilityId}`} className="font-bold text-slate-900 hover:text-blue-600">{room.name}</Link><p className="mt-0.5 text-xs text-slate-500">{getFloorFromRoomName(room.name)} · {getRoomArea(room)} m²</p></div><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{room.tenant_name || "Chưa có khách thuê"}</p>{!facilityIdFilter && <p className="mt-0.5 truncate text-xs text-blue-600">{facilityName || "Chưa chọn cơ sở"}</p>}</div><div><Badge variant={meta.className.includes("green") ? "success" : meta.className.includes("blue") ? "primary" : meta.className.includes("orange") || meta.className.includes("amber") ? "warning" : meta.className.includes("red") ? "danger" : "neutral"}>{meta.label}</Badge></div><p className="text-sm font-bold text-slate-900 md:text-right">{formatMoney(room.price)}<span className="font-normal text-slate-500">/tháng</span></p><div className="justify-self-end"><RoomActionMenu room={room} facilityId={facilityId} onForfeit={onForfeit} onDelete={onDelete} /></div></div>; })}</div>;
}

function RoomActionMenu({ room, facilityId, onForfeit, onDelete }: { room: RentalRoom; facilityId: string; onForfeit: (room: RentalRoom) => void; onDelete?: (room: RentalRoom) => void }) {
  const status = String(room.status || "vacant").toLowerCase();
  const close = (event: React.MouseEvent<HTMLElement>) => event.currentTarget.closest("details")?.removeAttribute("open");
  return <details className="relative"><summary aria-label={`Thao tác với phòng ${room.name}`} className="list-none cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 [&::-webkit-details-marker]:hidden"><MoreHorizontal size={17} /></summary><div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"><Link onClick={close} href={`/rooms/${room.id}/edit?facility_id=${facilityId}`} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Edit3 size={14} />Chỉnh sửa phòng</Link>{status === "reserved" && room.reservation_deposit_id && <button onClick={(event) => { close(event); onForfeit(room); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-amber-700 hover:bg-amber-50"><X size={14} />Bỏ cọc giữ chỗ</button>}{status === "occupied" && room.contract_id && <Link onClick={close} href={`/contracts/${room.contract_id}`} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><FileText size={14} />Xem hợp đồng</Link>}{status === "occupied" && room.contract_id && <Link onClick={close} href={`/contracts/${room.contract_id}?action=terminate`} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><X size={14} />Trả phòng</Link>}{onDelete && <button onClick={(event) => { close(event); onDelete(room); }} className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={14} />Xóa phòng</button>}</div></details>;
}

function AddRoomModal({ houses, defaultFacilityId, onClose, onSaved }: { houses: any[], defaultFacilityId?: string, onClose: () => void, onSaved: () => void }) {
  const [form, setForm] = useState({
    facilityId: defaultFacilityId || (houses.length > 0 ? houses[0].id : ""),
    name: "",
    price: "",
    area: "20",
    maxPeople: "3",
    blockId: "",
  });
  const [saving, setSaving] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const { showToast } = useToast();
  const blocksQuery = useQuery({ queryKey: ["facility-blocks", form.facilityId], queryFn: () => loadFacilityBlocks(form.facilityId), enabled: Boolean(form.facilityId) });
  const blocks = blocksQuery.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.facilityId) { showToast("Vui lòng chọn cơ sở!", "error"); return; }
    setSaving(true);
    try {
      let blockId = form.blockId || null;
      if (newBlockName.trim()) blockId = (await createFacilityBlock(form.facilityId, newBlockName.trim())).id;
      await createOwnerRoom(form.facilityId, {
        name: form.name,
        price: Number(form.price),
        area: Number(form.area),
        maxPeople: Number(form.maxPeople),
        blockId,
        status: "AVAILABLE",
      });
      onSaved();
    } catch (err) {
      showToast("Lỗi khi thêm phòng. Vui lòng thử lại!", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Thêm phòng mới</h2>
          <button onClick={onClose} className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Chọn cơ sở (Tòa nhà)</Label>
            <Select 
              value={form.facilityId}
            onChange={(e) => setForm(p => ({ ...p, facilityId: e.target.value }))}
              required
            >
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Dãy <span className="font-normal text-slate-400">(tùy chọn)</span></Label>
            <Select value={form.blockId} onChange={(e) => setForm(p => ({ ...p, blockId: e.target.value }))}><option value="">Không phân dãy</option>{blocks.map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}</Select>
            <div className="mt-2 flex gap-2"><Input value={newBlockName} onChange={(event) => setNewBlockName(event.target.value)} placeholder="Hoặc tạo dãy mới, ví dụ Dãy A" /><span className="shrink-0 self-center text-xs text-slate-500">tạo khi lưu</span></div>
          </div>
          <div>
            <Label>Tên / Số phòng</Label>
            <Input 
              placeholder="Ví dụ: 101, P.202..."
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Giá thuê (đ)</Label>
              <Input 
                type="number"
                placeholder="2500000"
                value={form.price}
                onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Diện tích (m²)</Label>
              <Input 
                type="number"
                value={form.area}
                onChange={(e) => setForm(p => ({ ...p, area: e.target.value }))}
                required
              />
            </div>
          </div>
          <Button 
            type="submit" 
            variant="primary"
            size="lg"
            disabled={saving}
            loading={saving}
            className="w-full"
          >
            {saving ? "Đang lưu..." : "Xác nhận thêm phòng"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-900">{value}</div>
    </div>
  );
}
