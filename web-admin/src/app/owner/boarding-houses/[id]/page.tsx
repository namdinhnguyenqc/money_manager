"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, CalendarDays, Edit3, FileText, Home, Plus, Receipt, Settings, Trash2, Wallet, X, Zap, CheckSquare, Square } from "lucide-react";
import { apiGet } from "@/utils/apiClient";

import {
  BoardingHouse,
  Invoice,
  RentalRoom,
  createContract,
  createInvoice,
  createTenant,
  currentPeriod,
  formatMoney,
  getTenantValidationMessage,
  getFloorFromRoomName,
  getRoomArea,
  invoiceStatusMeta,
  isContractSoonEnding,
  loadBoardingHouse,
  loadInvoices,
  loadRentalRooms,
  onlyDigits,
  roomStatusMeta,
  deleteRoom,
  deleteInvoice,
  createOwnerRoom,
  updateRoom,
  bulkCreateInvoices,
  bulkCollectPayments,
  loadLatestMeterReadings,
  loadWallets,
  validateTenantInput,
  ServiceConfig,
  loadServiceConfigs,
  getServiceCategory,
  describeServiceType,
  getServiceUnitLabel,
} from "@/lib/rentalOps";


const tabs = [
  { id: "rooms", label: "Phòng", icon: Home },
  { id: "meters", label: "Chốt điện nước", icon: Zap },
  { id: "contracts", label: "Hợp đồng", icon: FileText },
  { id: "invoices", label: "Hóa đơn", icon: Receipt },
  { id: "payments", label: "Thu tiền", icon: Wallet },
  { id: "settings", label: "Cài đặt", icon: Settings },
];


const roomFilters = ["Tất cả", "Trống", "Đang thuê", "Bảo trì", "Sắp hết HĐ"];
const contractFilters = ["Tất cả", "Hiệu lực", "Sắp hết", "Đã kết thúc"];

export default function BoardingHouseOverviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const buildingId = String(id);
  const activeTab = searchParams.get("tab") || "rooms";
  const [house, setHouse] = useState<BoardingHouse | null>(null);
  const [rooms, setRooms] = useState<RentalRoom[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomFilter, setRoomFilter] = useState("Tất cả");
  const [contractFilter, setContractFilter] = useState("Tất cả");
  const [selectedRoom, setSelectedRoom] = useState<RentalRoom | null>(null);
  const [contractOpen, setContractOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [roomPanelOpen, setRoomPanelOpen] = useState(false);
  const [roomEditOpen, setRoomEditOpen] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<(string)[]>([]);
  const [meterForm, setMeterForm] = useState<Record<string, { elec: string; water: string; oldElec: number; oldWater: number }>>({});
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [nextHouse, nextRooms, nextInvoices] = await Promise.all([
        loadBoardingHouse(buildingId),
        loadRentalRooms(buildingId),
        loadInvoices(buildingId),
      ]);
      setHouse(nextHouse);
      setRooms(nextRooms);
      setInvoices(nextInvoices);
      
      const w = await loadWallets();
      setWallets(w);

      // Load system settings for defaults
      try {
        const settingsRes = await apiGet<any>("/owner/settings");
        const map: Record<string, any> = {};
        (settingsRes?.data || []).forEach((s: any) => { map[s.key] = s.value; });
        setSystemSettings(map);
      } catch (e) {
        console.error("Failed to load settings", e);
      }

    } catch (err: any) {

      setError(err?.message || "Không tải được dữ liệu cơ sở.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "meters" && rooms.length > 0) {
      const occupiedRooms = rooms.filter(r => r.status === "occupied");
      Promise.all(occupiedRooms.map(r => loadLatestMeterReadings(r.id).then(rd => ({ roomId: r.id, reading: rd }))))
        .then(results => {
          const next: Record<string, any> = {};
          results.forEach(({ roomId, reading }) => {
            next[roomId] = {
              elec: "",
              water: "",
              oldElec: reading?.elec_new || reading?.elec_old || 0,
              oldWater: reading?.water_new || reading?.water_old || 0
            };
          });
          setMeterForm(next);
        });
    }
  }, [activeTab, rooms]);

  useEffect(() => {
    load();
  }, [buildingId]);

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/owner/boarding-houses/${buildingId}?${params.toString()}`);
  };

  const roomSummary = useMemo(
    () =>
      rooms.reduce(
        (acc, room) => {
          acc.total += 1;
          if (room.status === "occupied") acc.occupied += 1;
          else if (room.status === "maintenance") acc.maintenance += 1;
          else acc.available += 1;
          return acc;
        },
        { total: 0, available: 0, occupied: 0, maintenance: 0 }
      ),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (roomFilter === "Trống") return room.status !== "occupied" && room.status !== "maintenance";
      if (roomFilter === "Đang thuê") return room.status === "occupied";
      if (roomFilter === "Bảo trì") return room.status === "maintenance";
      if (roomFilter === "Sắp hết HĐ") return isContractSoonEnding(room);
      return true;
    });
  }, [rooms, roomFilter]);

  const contractRows = useMemo(() => rooms.filter((room) => room.contract_id), [rooms]);
  const filteredContracts = useMemo(() => {
    return contractRows.filter((room) => {
      if (contractFilter === "Hiệu lực") return room.status === "occupied";
      if (contractFilter === "Sắp hết") return isContractSoonEnding(room);
      if (contractFilter === "Đã kết thúc") return room.status !== "occupied";
      return true;
    });
  }, [contractRows, contractFilter]);

  const refreshWithToast = async (message: string) => {
    await load();
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const handleBulkPay = async () => {
    if (selectedInvoices.length === 0) return;
    const walletId = wallets[0]?.id;
    if (!walletId) {
       alert("Vui lòng tạo ví trước");
       return;
    }
    if (!window.confirm(`Xác nhận thanh toán ${selectedInvoices.length} hóa đơn bằng ví ${wallets[0].name}?`)) return;
    try {
      await bulkCollectPayments(selectedInvoices, walletId);
      setSelectedInvoices([]);
      await refreshWithToast(`Đã thanh toán hàng loạt ${selectedInvoices.length} hóa đơn.`);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi thanh toán hàng loạt.");
    }
  };

  const submitMeters = async () => {
    const activeRooms = rooms.filter(r => r.status === "occupied");
    const items = activeRooms.map(r => {
      const form = meterForm[r.id];
      if (!form?.elec || !form?.water) return null;
      
      const roomId = r.id;
      const contractId = r.contract_id;
      
      if (!roomId || !contractId) return null;

      return {
        roomId,
        contractId,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        roomFee: Number(r.price || 0),
        elecOld: Number(form.oldElec || 0),
        elecNew: Number(form.elec),
        waterOld: Number(form.oldWater || 0),
        waterNew: Number(form.water),
        items: [
          { name: "Điện", amount: (Number(form.elec) - Number(form.oldElec || 0)) * 3500 },
          { name: "Nước", amount: (Number(form.water) - Number(form.oldWater || 0)) * 20000 }
        ]
      };
    }).filter((it): it is NonNullable<typeof it> => it !== null);

    if (items.length === 0) {
      alert("Vui lòng nhập đầy đủ chỉ số và thông tin cho ít nhất 1 phòng có hợp đồng");
      return;
    }

    try {
      const paidRoomIds = new Set(currentMonthInvoices.filter(i => i.status === "paid").map(i => i.room_id));
      const filteredItems = items.filter(it => !paidRoomIds.has(it.roomId));
      
      if (filteredItems.length === 0) {
        alert("Tất cả các phòng được chọn đã hoàn tất thanh toán cho kỳ này.");
        return;
      }

      await bulkCreateInvoices(filteredItems);
      setTab("invoices");
      await refreshWithToast(`Đã chốt điện nước và tạo ${filteredItems.length} hóa đơn.`);
    } catch (err: any) {
      setError("Lỗi khi tạo hóa đơn hàng loạt. Một số phòng có thể đã được lập hóa đơn trước đó.");
    }
  };

  const currentMonthInvoices = useMemo(() => {
    const { month, year } = currentPeriod();
    return invoices.filter(i => i.month === month && i.year === year);
  }, [invoices]);


  const removeRoom = async (roomId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phòng này?")) return;
    try {
      await deleteRoom(roomId);
      setSelectedRoom(null);
      await refreshWithToast("Đã xóa phòng.");
    } catch (err: any) {
      setError(err?.message || "Không xóa được phòng.");
    }
  };

  const removeInvoice = async (invoiceId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hóa đơn này?")) return;
    try {
      await deleteInvoice(invoiceId);
      await refreshWithToast("Đã xóa hóa đơn.");
    } catch (err: any) {
      setError(err?.message || "Không xóa được hóa đơn.");
    }
  };

  const updateRoomData = async (roomId: string, data: Partial<RentalRoom>) => {
    try {
      await updateRoom(roomId, data);
      setSelectedRoom(null);
      await refreshWithToast("Đã cập nhật phòng.");
    } catch (err: any) {
      setError(err?.message || "Không cập nhật được phòng.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/owner/boarding-houses" className="hover:text-blue-700">Cơ sở</Link>
            <ArrowRight size={14} />
            <span className="font-medium text-slate-800">{house?.name || "Đang tải"}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">{house?.name || "Tổng quan cơ sở"}</h1>
          <p className="mt-1 text-sm text-slate-500">{house?.address || "Chưa có địa chỉ"}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 rounded-[8px] border border-slate-200 bg-white p-2 text-center shadow-sm">
          <Metric label="Tổng" value={roomSummary.total} />
          <Metric label="Trống" value={roomSummary.available} tone="text-emerald-700" />
          <Metric label="Đang thuê" value={roomSummary.occupied} tone="text-blue-700" />
          <Metric label="Bảo trì" value={roomSummary.maintenance} tone="text-amber-700" />
        </div>
      </div>

      <div className="sticky top-0 z-10 mb-5 rounded-[8px] border border-slate-200 bg-white p-1 shadow-sm">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setTab(tab.id)} className={`inline-flex min-w-fit items-center gap-2 rounded-[8px] px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {toast && <div className="mb-4 rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{toast}</div>}
      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading ? <div className="rounded-[8px] border border-slate-200 bg-white p-8 text-sm text-slate-500">Đang tải dữ liệu vận hành...</div> : null}

      {!loading && activeTab === "rooms" && (
        <section>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterBar items={roomFilters} active={roomFilter} onChange={setRoomFilter} />
            <button onClick={() => setRoomPanelOpen(true)} className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              <Plus size={16} />
              Thêm phòng
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredRooms.map((room) => {
              const meta = roomStatusMeta(room.status, isContractSoonEnding(room), room.is_expired);
              const currentInvoice = currentMonthInvoices.find(i => i.room_id === room.id);
              const needsPayment = room.status === "occupied" && (!currentInvoice || currentInvoice.status !== "paid");
              const isPaidInMonth = room.status === "occupied" && currentInvoice?.status === "paid";
              
              return (
                <button 
                  key={room.id} 
                  onClick={() => setSelectedRoom(room)} 
                  className={`rounded-[8px] border bg-white p-4 text-left shadow-sm transition hover:border-blue-300 relative overflow-hidden ${
                    needsPayment ? "border-red-200" : "border-slate-200"
                  }`}
                >
                  {needsPayment && <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-red-500 m-2"></div>}
                  
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-950">{room.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{getFloorFromRoomName(room.name)} · {getRoomArea(room)} m²</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                      {needsPayment && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600 border border-red-100 uppercase tracking-tighter">Chưa đóng tiền</span>
                      )}
                      {isPaidInMonth && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600 border border-emerald-100 uppercase tracking-tighter">Đã đóng tiền</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Info label="Giá thuê" value={formatMoney(room.price)} />
                    <Info label="Khách thuê" value={room.tenant_name || "Chưa có"} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!loading && activeTab === "contracts" && (
        <section>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterBar items={contractFilters} active={contractFilter} onChange={setContractFilter} />
            <button onClick={() => setContractOpen(true)} className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              <Plus size={16} />
              Tạo hợp đồng
            </button>
          </div>
          <DataTable
            headers={["Phòng", "Khách thuê", "Ngày bắt đầu", "Ngày kết thúc", "Tiền thuê/tháng", "Trạng thái", "Thao tác"]}
            rows={filteredContracts.map((room) => [
              room.name,
              room.tenant_name || "-",
              room.start_date || "-",
              room.end_date || "Chưa cấu hình",
              formatMoney(room.price),
              <StatusPill key="status" {...roomStatusMeta(room.status, isContractSoonEnding(room), room.is_expired)} />,
              <Link key="action" href={`/contracts/${room.contract_id}`} className="text-sm font-semibold text-blue-700">Xem hợp đồng</Link>,
            ])}
          />
        </section>
      )}

      {!loading && activeTab === "invoices" && (
        <section>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setInvoiceOpen(true)} className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              <Plus size={16} />
              Tạo hóa đơn thủ công
            </button>
          </div>
          <InvoiceTable invoices={invoices} onDelete={removeInvoice} selectedIds={selectedInvoices} onToggle={(id) => setSelectedInvoices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} />
          {selectedInvoices.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button onClick={handleBulkPay} className="rounded-[8px] bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700">
                Thanh toán {selectedInvoices.length} mục đã chọn
              </button>
            </div>
          )}
        </section>
      )}

      {!loading && activeTab === "meters" && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Chốt chỉ số điện nước hàng loạt</h2>
            <div className="text-sm text-slate-500">Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</div>
          </div>
          <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Phòng</th>
                  <th className="px-4 py-3 font-semibold">Điện (Cũ)</th>
                  <th className="px-4 py-3 font-semibold">Điện (Mới)</th>
                  <th className="px-4 py-3 font-semibold">Nước (Cũ)</th>
                  <th className="px-4 py-3 font-semibold">Nước (Mới)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.filter(r => r.status === "occupied").map(r => {
                  const existingInvoice = currentMonthInvoices.find(i => i.room_id === r.id);
                  const isBilled = !!existingInvoice;
                  
                  return (
                    <tr key={r.id} className={isBilled ? "bg-slate-50 opacity-60" : ""}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {r.name}
                        {isBilled && (
                          <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            existingInvoice.status === 'paid' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {existingInvoice.status === 'paid' ? "ĐÃ THU" : "ĐÃ LẬP HĐ"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{meterForm[r.id]?.oldElec}</td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          disabled={isBilled}
                          className="w-24 rounded border border-slate-200 px-2 py-1 disabled:bg-slate-100" 
                          value={meterForm[r.id]?.elec || ""} 
                          onChange={(e) => setMeterForm(p => ({ ...p, [r.id]: { ...p[r.id], elec: e.target.value } }))} 
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-400">{meterForm[r.id]?.oldWater}</td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          disabled={isBilled}
                          className="w-24 rounded border border-slate-200 px-2 py-1 disabled:bg-slate-100" 
                          value={meterForm[r.id]?.water || ""} 
                          onChange={(e) => setMeterForm(p => ({ ...p, [r.id]: { ...p[r.id], water: e.target.value } }))} 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={submitMeters} className="rounded-[8px] bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700">
              Lập hóa đơn hàng loạt
            </button>
          </div>
        </section>
      )}


      {!loading && activeTab === "payments" && (
        <section className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Thu tiền của cơ sở</h2>
              <p className="mt-1 text-sm text-slate-500">Theo dõi lịch sử thu tiền tại trang Thu tiền tổng, có thể lọc theo cơ sở và ngày.</p>
            </div>
            <Link href="/payments" className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Mở lịch sử thu tiền</Link>
          </div>
        </section>
      )}

      {!loading && activeTab === "settings" && (
        <section className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Building2 size={18} className="text-blue-700" />
            <h2 className="text-lg font-semibold text-slate-950">Thông tin cơ sở</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Tên cơ sở" value={house?.name || "-"} />
            <Info label="Địa chỉ" value={house?.address || "-"} />
            <Info label="Trạng thái" value={house?.status || "-"} />
            <Info label="Công khai" value={house?.isPublic ? "Có" : "Không"} />
          </div>
        </section>
      )}

      {selectedRoom && <RoomDrawer room={selectedRoom} onClose={() => setSelectedRoom(null)} onCreateContract={() => { setContractOpen(true); }} onDelete={() => removeRoom(selectedRoom.id)} onEdit={() => setRoomEditOpen(true)} />}
      {contractOpen && <ContractPanel rooms={rooms} onClose={() => setContractOpen(false)} onSaved={() => { setContractOpen(false); refreshWithToast("Đã tạo hợp đồng và cập nhật trạng thái phòng."); }} />}
      {invoiceOpen && <InvoicePanel rooms={rooms} invoices={invoices} onClose={() => setInvoiceOpen(false)} onSaved={() => { setInvoiceOpen(false); refreshWithToast("Đã tạo hóa đơn."); }} />}
      {roomPanelOpen && <RoomPanel buildingId={buildingId} systemSettings={systemSettings} onClose={() => setRoomPanelOpen(false)} onSaved={() => { setRoomPanelOpen(false); refreshWithToast("Đã thêm phòng mới."); }} />}
      {roomEditOpen && selectedRoom && <RoomEditPanel room={selectedRoom} onClose={() => setRoomEditOpen(false)} onSaved={(data) => updateRoomData(selectedRoom.id, data)} />}
    </div>
  );
}

function Metric({ label, value, tone = "text-slate-950" }: { label: string; value: number; tone?: string }) {
  return <div className="min-w-16 px-2"><div className={`text-xl font-semibold ${tone}`}>{value}</div><div className="text-[11px] text-slate-500">{label}</div></div>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 font-medium text-slate-900">{value}</div></div>;
}

function FilterBar({ items, active, onChange }: { items: string[]; active: string; onChange: (item: string) => void }) {
  return <div className="mb-4 flex flex-wrap gap-2">{items.map((item) => <button key={item} onClick={() => onChange(item)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${active === item ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>{item}</button>)}</div>;
}

function StatusPill({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">Không có dữ liệu phù hợp.</td></tr> : rows.map((row, index) => <tr key={index} className="hover:bg-slate-50">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700">{cell}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceTable({ invoices, onDelete, selectedIds = [], onToggle }: { invoices: Invoice[]; onDelete: (id: string) => void; selectedIds?: (string)[]; onToggle?: (id: string) => void }) {
  return (
    <DataTable
      headers={[onToggle ? "" : null, "Phòng", "Khách thuê", "Kỳ", "Tổng tiền", "Đã thu", "Công nợ", "Trạng thái", "Thao tác"].filter(x => x !== null)}
      rows={invoices.map((invoice) => {
        const meta = invoiceStatusMeta(invoice.status);
        const isSelected = selectedIds.includes(invoice.id);
        const canSelect = invoice.status !== "paid";
        const debt = Math.max(0, (invoice.total_amount || 0) - (invoice.paid_amount || 0));

        return [
          onToggle ? (
            <button key="select" onClick={() => canSelect && onToggle(invoice.id)} className={`transition-colors ${canSelect ? "text-blue-600" : "text-slate-200 cursor-not-allowed"}`}>
              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
          ) : null,
          invoice.room_name || `Phòng #${invoice.room_id}`,
          invoice.tenant_name || "-",
          `T${invoice.month}/${invoice.year}`,
          formatMoney(invoice.total_amount),
          formatMoney(invoice.paid_amount),
          <span key="debt" className={debt > 0 ? "font-semibold text-red-600" : "text-slate-400"}>{formatMoney(debt)}</span>,
          <StatusPill key="status" {...meta} />,
          <div key="action" className="flex items-center gap-4">
            <Link href={`/invoices/${invoice.id}`} className="text-sm font-semibold text-blue-700">Chi tiết</Link>
            <button onClick={() => onDelete(invoice.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Xóa hóa đơn">
              <Trash2 size={16} />
            </button>
          </div>,
        ].filter(x => x !== null);
      })}
    />
  );
}


function RoomDrawer({ room, onClose, onCreateContract, onDelete, onEdit }: { room: RentalRoom; onClose: () => void; onCreateContract: () => void; onDelete: () => void; onEdit: () => void }) {
  const canCreateContract = room.status !== "occupied";
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/25" onClick={onClose}>
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{room.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Chi tiết phòng và lịch sử vận hành</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="rounded-[8px] p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition" title="Sửa phòng"><Edit3 size={18} /></button>
            <button onClick={onDelete} className="rounded-[8px] p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition" title="Xóa phòng"><Trash2 size={18} /></button>
            <button onClick={onClose} className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={18} /></button>
          </div>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-4">
          <Info label="Tầng" value={getFloorFromRoomName(room.name)} />
          <Info label="Diện tích" value={`${getRoomArea(room)} m²`} />
          <Info label="Giá thuê" value={formatMoney(room.price)} />
          <Info label="Khách thuê" value={room.tenant_name || "Chưa có"} />
        </div>
        <div className="mb-5 rounded-[8px] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">Lịch sử hợp đồng</div>
          {room.contract_id ? <div className="text-sm text-slate-600">Hợp đồng #{room.contract_id}, bắt đầu {room.start_date || "chưa rõ ngày"}.</div> : <div className="text-sm text-slate-500">Phòng chưa có hợp đồng.</div>}
        </div>
        {canCreateContract && <button onClick={onCreateContract} className="w-full rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Tạo hợp đồng</button>}
      </aside>
    </div>
  );
}

function RoomPanel({ buildingId, systemSettings, onClose, onSaved }: { buildingId: string; systemSettings: Record<string, any>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ 
    name: "", 
    price: "", 
    area: String(systemSettings.default_room_area || "20"),
    maxPeople: String(systemSettings.default_max_people || "3"),
    status: "AVAILABLE" 
  });
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createOwnerRoom(buildingId, { 
        name: form.name, 
        price: Number(form.price), 
        area: Number(form.area),
        maxPeople: Number(form.maxPeople),
        status: form.status as any 
      });
      onSaved();
    } catch (err) {
      alert("Lỗi khi thêm phòng");
    } finally {
      setSaving(false);
    }
  };
  return (
    <SidePanel title="Thêm phòng mới" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tên phòng (Số phòng)"><input className="input" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ví dụ: 101" required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Diện tích (m²)"><input className="input" type="number" value={form.area} onChange={(e) => setForm(p => ({ ...p, area: e.target.value }))} required /></Field>
          <Field label="Số người tối đa"><input className="input" type="number" value={form.maxPeople} onChange={(e) => setForm(p => ({ ...p, maxPeople: e.target.value }))} required /></Field>
        </div>
        <Field label="Giá thuê mặc định"><input className="input" type="number" value={form.price} onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} required /></Field>
        <Field label="Trạng thái khởi tạo">
          <select className="input" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}>
            <option value="AVAILABLE">Trống (Sẵn sàng cho thuê)</option>
            <option value="MAINTENANCE">Bảo trì</option>
          </select>
        </Field>
        <button disabled={saving} className="w-full rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Thêm phòng"}</button>
      </form>
    </SidePanel>
  );
}

function RoomEditPanel({ room, onClose, onSaved }: { room: RentalRoom; onClose: () => void; onSaved: (data: Partial<RentalRoom>) => void }) {
  const [form, setForm] = useState({ name: room.name, price: String(room.price) });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaved({ name: form.name, price: Number(form.price) });
  };
  return (
    <SidePanel title="Chỉnh sửa phòng" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tên phòng"><input className="input" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required /></Field>
        <Field label="Giá thuê"><input className="input" type="number" value={form.price} onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} required /></Field>
        <button className="w-full rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Lưu thay đổi</button>
      </form>
    </SidePanel>
  );
}

function ContractPanel({ rooms, onClose, onSaved }: { rooms: RentalRoom[]; onClose: () => void; onSaved: () => void }) {
  const vacantRooms = rooms.filter((room) => room.status !== "occupied");
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Array<string>>([]);
  
  useEffect(() => {
    let mounted = true;
    loadServiceConfigs(true).then((data) => {
      if (!mounted) return;
      setServices(data || []);
      setSelectedServiceIds((data || []).map(s => String(s.id)));
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const [form, setForm] = useState({
    roomId: String(vacantRooms[0]?.id || ""),
    tenantName: "",
    idCard: "",
    phone: "",
    email: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    deposit: "",
    collectDay: "5",
    elecStart: "",
    waterStart: "",
    occupantCount: "1",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedRoom = rooms.find((room) => String(room.id) === form.roomId);
  const months = form.endDate ? Math.max(1, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000))) : 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!selectedRoom) {
      setError("Vui lòng chọn phòng trống.");
      return;
    }
    const tenantValidation = validateTenantInput({ name: form.tenantName, phone: form.phone, email: form.email, idCard: form.idCard });
    if (!tenantValidation.ok) {
      setError(getTenantValidationMessage(tenantValidation.fieldErrors));
      return;
    }
    setSaving(true);
    try {
      const tenant = await createTenant(tenantValidation.data);
      const roomId = selectedRoom.id;
      const tenantId = tenant.id;

      await createContract({ 
        roomId,
        tenantId, 
        startDate: form.startDate, 
        endDate: form.endDate || undefined,
        deposit: Number(form.deposit || 0), 
        rentAmount: Number(selectedRoom.price || 0),
        billingDay: Number(form.collectDay || 5),
        electricStart: Number(form.elecStart || 0),
        waterStart: Number(form.waterStart || 0),
        occupantCount: Number(form.occupantCount || selectedRoom.num_people || 1),
        note: form.note || "",
        serviceIds: selectedServiceIds 
      });
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Không tạo được hợp đồng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel title="Tạo hợp đồng" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <Field label="Phòng">
          <select className="input" value={form.roomId} onChange={(e) => setForm((prev) => ({ ...prev, roomId: e.target.value }))}>
            {vacantRooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {formatMoney(room.price)}</option>)}
          </select>
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Họ tên khách thuê *"><input className="input" value={form.tenantName} onChange={(e) => setForm((prev) => ({ ...prev, tenantName: e.target.value }))} required /></Field>
          <Field label="CCCD *"><input className="input" inputMode="numeric" value={form.idCard} onChange={(e) => setForm((prev) => ({ ...prev, idCard: onlyDigits(e.target.value) }))} required /></Field>
          <Field label="SĐT *"><input className="input" inputMode="numeric" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: onlyDigits(e.target.value) }))} required /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Ngày bắt đầu"><input className="input" type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} /></Field>
          <Field label="Ngày kết thúc"><input className="input" type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} /></Field>
          <Info label="Số tháng" value={months ? `${months} tháng` : "Chưa tính"} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Info label="Tiền thuê/tháng" value={selectedRoom ? formatMoney(selectedRoom.price) : "-"} />
          <Field label="Tiền cọc"><input className="input" type="number" value={form.deposit} onChange={(e) => setForm((prev) => ({ ...prev, deposit: e.target.value }))} /></Field>
          <Field label="Ngày thu tiền"><input className="input" type="number" min={1} max={28} value={form.collectDay} onChange={(e) => setForm((prev) => ({ ...prev, collectDay: e.target.value }))} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Số người ở trong phòng"><input className="input" type="number" min={1} value={form.occupantCount} onChange={(e) => setForm((prev) => ({ ...prev, occupantCount: e.target.value }))} /></Field>
          <Field label="Điện đầu kỳ (kWh)"><input className="input" type="number" value={form.elecStart} onChange={(e) => setForm((prev) => ({ ...prev, elecStart: e.target.value }))} /></Field>
          <Field label="Nước đầu kỳ (m³)"><input className="input" type="number" value={form.waterStart} onChange={(e) => setForm((prev) => ({ ...prev, waterStart: e.target.value }))} /></Field>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">Dịch vụ áp dụng</div>
          <div className="space-y-2">
            {services.length === 0 ? <div className="text-sm text-slate-500">Chưa có dịch vụ nào trong bảng giá.</div> : services.map((service) => {
              const checked = selectedServiceIds.some((id) => String(id) === String(service.id));
              const price = Number(service.unit_price || 0);

              return (
                <label key={service.id} className="flex items-start gap-3 rounded-[8px] border border-slate-200 bg-white px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    checked={checked}
                    onChange={(event) => setSelectedServiceIds((prev) => event.target.checked ? [...prev, service.id] : prev.filter((item) => String(item) !== String(service.id)))}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900">{service.name}</div>
                    <div className="text-xs text-slate-500">{describeServiceType(service)} · {formatMoney(price)}{getServiceUnitLabel(service)}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        <Field label="Ghi chú"><textarea className="input min-h-24" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} /></Field>
        <button disabled={saving || !form.roomId} className="w-full rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu hợp đồng"}</button>
      </form>
    </SidePanel>
  );
}

function InvoicePanel({ rooms, invoices, onClose, onSaved }: { rooms: RentalRoom[]; invoices: Invoice[]; onClose: () => void; onSaved: () => void }) {
  const occupiedRooms = rooms.filter((room) => room.status === "occupied" && room.contract_id);
  const period = currentPeriod();
  const [form, setForm] = useState({
    roomId: String(occupiedRooms[0]?.id || ""),
    month: String(period.month),
    year: String(period.year),
    elecOld: "0",
    elecNew: "",
    waterOld: "0",
    waterNew: "",
    serviceName: "Phí dịch vụ",
    serviceAmount: "0",
  });

  useEffect(() => {
    if (form.roomId) {
      loadLatestMeterReadings(form.roomId).then(readings => {
        // loadLatestMeterReadings returns a single object now, not an array
        const latest = readings;
        setForm(prev => ({
          ...prev,
          elecOld: String(latest?.elec_new || 0),
          waterOld: String(latest?.water_new || 0)
        }));
      });
    }
  }, [form.roomId]);
  const [saving, setSaving] = useState(false);
  const selectedRoom = occupiedRooms.find((room) => String(room.id) === form.roomId);
  const electricity = Math.max(0, Number(form.elecNew || 0) - Number(form.elecOld || 0)) * 3500;
  const water = Math.max(0, Number(form.waterNew || 0) - Number(form.waterOld || 0)) * 20000;
  const service = Number(form.serviceAmount || 0);
  const total = Number(selectedRoom?.price || 0) + electricity + water + service;

  const existingInvoice = invoices.find(i => 
    String(i.room_id) === form.roomId && 
    i.month === Number(form.month) && 
    i.year === Number(form.year)
  );
  const isPaidAlready = existingInvoice?.status === "paid";
  const isBilledAlready = !!existingInvoice;


  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRoom?.contract_id) return;
    setSaving(true);
    await createInvoice({
      roomId: selectedRoom.id,
      contractId: selectedRoom.contract_id,
      month: Number(form.month),
      year: Number(form.year),
      roomFee: Number(selectedRoom.price || 0),
      previousDebt: 0,
      elecOld: Number(form.elecOld || 0),
      elecNew: Number(form.elecNew || 0),
      waterOld: Number(form.waterOld || 0),
      waterNew: Number(form.waterNew || 0),
      items: [
        { name: "Tiền điện", detail: `${form.elecOld} → ${form.elecNew}`, amount: electricity },
        { name: "Tiền nước", detail: `${form.waterOld} → ${form.waterNew}`, amount: water },
        ...(service > 0 ? [{ name: form.serviceName || "Phí dịch vụ", amount: service }] : []),
      ],
    });
    setSaving(false);
    onSaved();
  };

  return (
    <SidePanel title="Tạo hóa đơn thủ công" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Phòng">
          <select className="input" value={form.roomId} onChange={(e) => setForm((prev) => ({ ...prev, roomId: e.target.value }))}>
            {occupiedRooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.tenant_name}</option>)}
          </select>
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tháng"><input className="input" type="number" min={1} max={12} value={form.month} onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))} /></Field>
          <Field label="Năm"><input className="input" type="number" value={form.year} onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Điện đầu"><input className="input bg-slate-50" type="number" value={form.elecOld} readOnly /></Field>
          <Field label="Điện cuối"><input className="input" type="number" value={form.elecNew} onChange={(e) => setForm((prev) => ({ ...prev, elecNew: e.target.value }))} required /></Field>
          <Field label="Nước đầu"><input className="input bg-slate-50" type="number" value={form.waterOld} readOnly /></Field>
          <Field label="Nước cuối"><input className="input" type="number" value={form.waterNew} onChange={(e) => setForm((prev) => ({ ...prev, waterNew: e.target.value }))} required /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tên phí dịch vụ"><input className="input" value={form.serviceName} onChange={(e) => setForm((prev) => ({ ...prev, serviceName: e.target.value }))} /></Field>
          <Field label="Số tiền"><input className="input" type="number" value={form.serviceAmount} onChange={(e) => setForm((prev) => ({ ...prev, serviceAmount: e.target.value }))} /></Field>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex justify-between text-sm"><span>Tiền phòng</span><strong>{formatMoney(selectedRoom?.price)}</strong></div>
          <div className="mt-2 flex justify-between text-sm"><span>Điện</span><strong>{formatMoney(electricity)}</strong></div>
          <div className="mt-2 flex justify-between text-sm"><span>Nước</span><strong>{formatMoney(water)}</strong></div>
          <div className="mt-2 flex justify-between text-sm"><span>Dịch vụ</span><strong>{formatMoney(service)}</strong></div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base"><span className="font-semibold">Tổng cộng</span><strong>{formatMoney(total)}</strong></div>
        </div>
        {isBilledAlready && (
          <div className={`rounded-[8px] p-4 text-sm font-bold ${isPaidAlready ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
            {isPaidAlready ? "Phòng này đã hoàn tất đóng tiền cho kỳ này." : "Phòng này đã được lập hóa đơn cho kỳ này."}
          </div>
        )}
        <button disabled={saving || !selectedRoom || isPaidAlready} className="w-full rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Đang tạo..." : isPaidAlready ? "Đã thanh toán xong" : "Tạo hóa đơn"}
        </button>
      </form>
    </SidePanel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl relative" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <button onClick={onClose} className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
