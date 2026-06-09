"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Search, SlidersHorizontal, Users } from "lucide-react";
import { fallbackRoomImage, formatRent, MarketplaceRoom, publicApi } from "@/lib/marketplace";

export default function MarketplacePage() {
  const [rooms, setRooms] = useState<MarketplaceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [people, setPeople] = useState("");

  useEffect(() => {
    publicApi<{ data: MarketplaceRoom[] }>("/public/marketplace/rooms")
      .then((response) => setRooms(response.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return rooms.filter((room) => {
      const text = `${room.title} ${room.description} ${room.boardingHouse.name} ${room.boardingHouse.address || ""} ${room.amenities.join(" ")}`.toLocaleLowerCase("vi");
      if (normalized && !text.includes(normalized)) return false;
      if (maxPrice && room.price > Number(maxPrice)) return false;
      if (people && room.maxPeople < Number(people)) return false;
      return true;
    });
  }, [rooms, query, maxPrice, people]);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <Image src="/brand/transparent/trocare-logo-full-transparent-2000.png" alt="TroCare" width={180} height={50} priority className="h-auto w-40 sm:w-44" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block">Về TroCare</Link>
            <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Đăng phòng</Link>
          </div>
        </div>
      </header>

      <section className="bg-[#173b72] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">TroCare Tìm phòng</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Tìm phòng trọ đúng khu vực, đúng giá, liên hệ trực tiếp chủ trọ.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">Phòng được cập nhật từ hệ thống vận hành TroCare. Tin sẽ tự ẩn khi phòng không còn trống.</p>

          <div className="mt-8 grid gap-3 rounded-2xl bg-white p-3 text-slate-900 shadow-xl md:grid-cols-[1fr_190px_160px_auto]">
            <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4">
              <Search size={20} className="text-blue-600" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} className="h-14 w-full bg-transparent text-sm outline-none" placeholder="Quận, phường, đường hoặc gần trường..." />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-4">
              <SlidersHorizontal size={18} className="text-slate-500" />
              <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-14 w-full bg-transparent text-sm outline-none">
                <option value="">Mọi mức giá</option>
                <option value="2000000">Dưới 2 triệu</option>
                <option value="3000000">Dưới 3 triệu</option>
                <option value="5000000">Dưới 5 triệu</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-4">
              <Users size={18} className="text-slate-500" />
              <select value={people} onChange={(e) => setPeople(e.target.value)} className="h-14 w-full bg-transparent text-sm outline-none">
                <option value="">Số người</option>
                <option value="1">1 người</option>
                <option value="2">2 người</option>
                <option value="3">3+ người</option>
              </select>
            </label>
            <div className="flex h-14 items-center justify-center rounded-xl bg-cyan-400 px-6 text-sm font-black text-slate-950">
              {filteredRooms.length} phòng phù hợp
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Phòng đang trống</p>
            <h2 className="mt-1 text-2xl font-black">Khám phá phòng mới cập nhật</h2>
          </div>
          <span className="text-sm text-slate-500">TP.HCM và khu vực lân cận</span>
        </div>

        {loading && <div className="rounded-2xl bg-white p-8 text-sm text-slate-500">Đang tải phòng trọ...</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
        {!loading && !error && filteredRooms.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Building2 className="mx-auto text-slate-300" size={40} />
            <h3 className="mt-4 font-bold">Chưa có phòng phù hợp</h3>
            <p className="mt-2 text-sm text-slate-500">Thử đổi khu vực hoặc mức giá tìm kiếm.</p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => (
            <Link key={room.id} href={`/phong-tro/${room.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img src={room.imageUrls[0] || fallbackRoomImage} alt={room.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-emerald-700 shadow">Phòng trống</span>
                {room.imageUrls.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white">{room.imageUrls.length} ảnh</span>}
              </div>
              <div className="p-5">
                <div className="text-xl font-black text-blue-700">{formatRent(room.price)}<span className="text-sm font-medium text-slate-500">/tháng</span></div>
                <h3 className="mt-2 line-clamp-2 text-lg font-bold">{room.title}</h3>
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-500"><MapPin size={16} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{room.boardingHouse.address || room.boardingHouse.name}</span></p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  {room.area > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1">{room.area} m²</span>}
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Tối đa {room.maxPeople} người</span>
                  {room.amenities.slice(0, 2).map((item) => <span key={item} className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{item}</span>)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
