"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, MapPin, MessageCircle, Phone, ShieldCheck, Users } from "lucide-react";
import { fallbackRoomImage, formatRent, MarketplaceRoom, publicApi } from "@/lib/marketplace";

export default function RoomDetailPage({ params }: { params: { id: string } }) {
  const [room, setRoom] = useState<MarketplaceRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ guestName: "", guestPhone: "", viewingTime: "", desiredMoveIn: "", message: "" });

  useEffect(() => {
    publicApi<{ data: MarketplaceRoom }>(`/public/marketplace/rooms/${params.id}`)
      .then((response) => setRoom(response.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!room) return;
    setSending(true);
    setError("");
    try {
      await publicApi("/public/marketplace/leads", {
        method: "POST",
        body: JSON.stringify({ ...form, roomId: room.id, boardingHouseId: room.boardingHouse.id }),
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <main className="min-h-screen bg-slate-50 p-8 text-sm text-slate-500">Đang tải thông tin phòng...</main>;
  if (!room) return <main className="min-h-screen bg-slate-50 p-8 text-sm text-red-700">{error || "Không tìm thấy phòng."}</main>;

  const phoneHref = room.contactPhone ? `tel:${room.contactPhone}` : undefined;
  const zaloHref = room.contactZalo ? `https://zalo.me/${room.contactZalo.replace(/\D/g, "")}` : undefined;
  const mapHref = room.boardingHouse.latitude && room.boardingHouse.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${room.boardingHouse.latitude},${room.boardingHouse.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(room.boardingHouse.address || room.boardingHouse.name)}`;

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/phong-tro" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={18} /> Danh sách phòng</Link>
          <Link href="/" className="flex items-center"><Image src="/brand/transparent/trocare-logo-full-transparent-2000.png" alt="TroCare" width={150} height={42} className="h-auto w-36" /></Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-200 md:row-span-2">
            <img src={room.imageUrls[0] || fallbackRoomImage} alt={room.title} className="h-full w-full object-cover" />
          </div>
          {(room.imageUrls.slice(1, 3).length ? room.imageUrls.slice(1, 3) : [fallbackRoomImage, fallbackRoomImage]).map((url, index) => (
            <div key={`${url}-${index}`} className="hidden aspect-[16/9] overflow-hidden rounded-2xl bg-slate-200 md:block">
              <img src={url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="text-3xl font-black text-blue-700">{formatRent(room.price)}<span className="text-base font-medium text-slate-500">/tháng</span></div>
                <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight">{room.title}</h1>
                <a href={mapHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-start gap-2 text-sm text-slate-600 hover:text-blue-700"><MapPin size={18} className="mt-0.5 shrink-0" /> {room.boardingHouse.address || room.boardingHouse.name}</a>
              </div>
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">Đang trống</span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Diện tích" value={room.area ? `${room.area} m²` : "Liên hệ"} />
              <Metric label="Số người" value={`Tối đa ${room.maxPeople}`} />
              <Metric label="Tiền cọc" value={room.depositAmount ? formatRent(room.depositAmount) : "Thỏa thuận"} />
              <Metric label="Có thể vào" value={room.availableFrom ? new Date(room.availableFrom).toLocaleDateString("vi-VN") : "Ngay"} />
            </div>

            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Thông tin phòng</h2>
              <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{room.description || "Liên hệ chủ trọ để biết thêm thông tin chi tiết."}</p>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Tiện ích</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {room.amenities.map((item) => <div key={item} className="flex items-center gap-3 text-sm text-slate-700"><Check size={18} className="text-emerald-600" /> {item}</div>)}
                {room.allowsPets && <div className="flex items-center gap-3 text-sm text-slate-700"><Check size={18} className="text-emerald-600" /> Cho phép thú cưng</div>}
                {!room.amenities.length && !room.allowsPets && <p className="text-sm text-slate-500">Chủ trọ chưa cập nhật tiện ích.</p>}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
              <ShieldCheck className="shrink-0 text-blue-700" />
              Tin được đồng bộ từ hệ thống quản lý TroCare. Hãy xem phòng trực tiếp trước khi chuyển tiền.
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-lg lg:sticky lg:top-5">
            <h2 className="text-xl font-black">Liên hệ xem phòng</h2>
            <p className="mt-1 text-sm text-slate-500">{room.boardingHouse.name}</p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <a href={phoneHref} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold ${phoneHref ? "bg-blue-600 text-white" : "pointer-events-none bg-slate-100 text-slate-400"}`}><Phone size={18} /> Gọi ngay</a>
              <a href={zaloHref} target="_blank" rel="noreferrer" className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold ${zaloHref ? "bg-[#0068ff] text-white" : "pointer-events-none bg-slate-100 text-slate-400"}`}><MessageCircle size={18} /> Zalo</a>
            </div>

            {sent ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Đã gửi yêu cầu. Chủ trọ sẽ liên hệ lại với bạn.</div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-3">
                <input required value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} className="input" placeholder="Họ và tên" />
                <input required value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} className="input" placeholder="Số điện thoại" />
                <label className="relative block">
                  <CalendarDays size={17} className="absolute left-3 top-3.5 text-slate-400" />
                  <input type="datetime-local" value={form.viewingTime} onChange={(e) => setForm({ ...form, viewingTime: e.target.value })} className="input pl-10" aria-label="Thời gian muốn xem phòng" />
                </label>
                <input type="date" value={form.desiredMoveIn} onChange={(e) => setForm({ ...form, desiredMoveIn: e.target.value })} className="input" aria-label="Ngày muốn chuyển vào" />
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input min-h-24 resize-y" placeholder="Lời nhắn cho chủ trọ" />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button disabled={sending} className="w-full rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60">{sending ? "Đang gửi..." : "Đặt lịch xem phòng"}</button>
              </form>
            )}
          </aside>
        </div>
      </div>
      <style jsx>{`
        .input { width: 100%; border: 1px solid rgb(203 213 225); border-radius: 12px; padding: 12px; font-size: 14px; outline: none; }
        .input:focus { border-color: rgb(37 99 235); box-shadow: 0 0 0 3px rgb(219 234 254); }
      `}</style>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 font-black text-slate-900">{value}</div></div>;
}
