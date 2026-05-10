"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { Invoice, Transaction, formatMoney, loadInvoice, loadSettingsMap, loadTransactions } from "@/lib/rentalOps";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";

export default function ReceiptViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [invoiceData, settingsData, txs] = await Promise.all([
          loadInvoice(String(id)),
          loadSettingsMap(),
          loadTransactions()
        ]);
        setInvoice(invoiceData);
        setSettings(settingsData);
        setTransactions((txs || []).filter(t => String(t.invoice_id) === String(id)));
      } catch (err: any) {
        setError(err?.message || "Không tải được thông báo thu tiền.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-10"><LoadingSkeleton rows={10} /></div>;
  if (error || !invoice) return <div className="p-10 text-center text-red-600">{error || "Không tìm thấy dữ liệu."}</div>;

  const handlePrint = () => {
    window.print();
  };

  // Helper to find item amount by name
  const findItem = (pattern: string) => {
    const item = (invoice.items || []).find(it => it.name?.toLowerCase().includes(pattern.toLowerCase()));
    return item?.amount || 0;
  };

  const electricityAmount = findItem("điện");
  const waterAmount = findItem("nước");
  const wifiAmount = findItem("wifi");
  const garbageAmount = findItem("rác");
  
  // Electricity usage detail
  const elecUsed = Math.max(0, (invoice.elec_new || 0) - (invoice.elec_old || 0));
  const waterUsed = Math.max(0, (invoice.water_new || 0) - (invoice.water_old || 0));

  const totalPayable = invoice.total_amount;
  
  // Bank details from settings with fallbacks
  const bankName1 = settings.bank_name_1 || "ACB";
  const bankAccount1 = settings.bank_account_1 || "252369089";
  const bankOwner1 = settings.bank_owner_1 || "Nguyễn Đình Hà Nam";
  
  const bankName2 = settings.bank_name_2;
  const bankAccount2 = settings.bank_account_2;
  const bankOwner2 = settings.bank_owner_2;

  const paymentNote = settings.payment_note || "(Không ghi nội dung Chuyển khoản)";
  
  // QR Code URL (Use static URL if provided, otherwise generate VietQR)
  const qrUrl = settings.bank_qr_static_url || `https://img.vietqr.io/image/${bankName1.replace(/\s/g, "")}-${bankAccount1.replace(/\s/g, "")}-compact2.png?amount=${totalPayable}&addInfo=PHONG%20${invoice.room_name?.replace(/\s/g, "")}%20T${invoice.month}%20${invoice.year}`;

  const isPaid = invoice.status === "paid" || (invoice.paid_amount || 0) >= invoice.total_amount;
  const isPartial = (invoice.paid_amount || 0) > 0 && !isPaid;

  return (
    <div className="min-h-screen bg-slate-100 py-10 print:bg-white print:py-0">
      {/* Controls */}
      <div className="mx-auto mb-6 flex max-w-[21cm] items-center justify-between px-4 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft size={18} /> Quay lại
        </button>
        <div className="flex gap-3">
          {isPartial && <span className="inline-flex items-center rounded-lg bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Thanh toán dở dang</span>}
          <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-xl hover:bg-blue-700 transition-all">
            <Printer size={18} /> In {isPaid ? "biên lai" : "thông báo"}
          </button>
        </div>
      </div>

      {/* A4 Document */}
      <div className="mx-auto bg-white p-[1.5cm_2cm] shadow-2xl print:p-0 print:shadow-none relative overflow-hidden" style={{ width: "21cm", minHeight: "29.7cm", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        
        {/* Modern decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 pointer-events-none"></div>

        {/* Paid Stamp - Modern version */}
        {isPaid && (
          <div className="absolute top-20 right-16 border-4 border-emerald-500 rounded-full w-32 h-32 flex items-center justify-center rotate-12 opacity-40 pointer-events-none z-10">
            <span className="text-xl font-black text-emerald-600 uppercase text-center leading-tight">ĐÃ NHẬN<br/>TIỀN</span>
          </div>
        )}

        <div className="text-slate-800 text-[11pt] leading-[1.6]">
          
          {/* Friendly Header */}
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200">
                {invoice.room_name?.substring(0, 1)}
              </div>
              <div className="flex flex-col">
                <span className="text-[13pt] font-black text-slate-900 tracking-tight">NHÀ TRỌ NAM NAM</span>
                <span className="text-[9pt] font-medium text-slate-500">60/7/4A Đường số 4, Thủ Đức</span>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-[9pt] font-bold text-slate-600 uppercase tracking-wider">
                Mã đơn: #{invoice.id}
              </div>
              <p className="text-[9pt] text-slate-400 mt-1 font-medium">{new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          <div className="mb-10">
            <h1 className="text-[24pt] font-black text-slate-900 tracking-tight leading-none mb-2">
              {isPaid ? "Phiếu Thu Tiền" : "Thông Báo Tiền Phòng"}
            </h1>
            <p className="text-[11pt] font-bold text-blue-600 uppercase tracking-widest">Kỳ thanh toán: Tháng {invoice.month} / {invoice.year}</p>
          </div>

          {/* Tenant Details Card */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[8pt] font-bold text-slate-400 uppercase tracking-wider mb-1">Khách thuê</p>
              <p className="text-[11pt] font-black text-slate-900 uppercase">{invoice.tenant_name}</p>
              <p className="text-[9pt] text-slate-500 font-medium">{invoice.tenant_phone || "N/A"}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <p className="text-[8pt] font-bold text-blue-400 uppercase tracking-wider mb-1">Phòng số</p>
              <p className="text-[14pt] font-black text-blue-700 uppercase">{invoice.room_name}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[8pt] font-bold text-slate-400 uppercase tracking-wider mb-1">Trạng thái</p>
              <p className={`text-[10pt] font-black mt-1 px-2 py-0.5 inline-block rounded-lg uppercase tracking-tighter ${
                isPaid ? "bg-emerald-100 text-emerald-700" : isPartial ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
              }`}>
                {isPaid ? "Hoàn tất" : isPartial ? "Còn nợ" : "Chưa trả"}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-[10pt] font-bold text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
              CHI TIẾT CÁC KHOẢN PHÍ
            </p>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="pb-3 text-left text-[9pt] font-black text-slate-400 uppercase tracking-widest w-12">STT</th>
                  <th className="pb-3 text-left text-[9pt] font-black text-slate-400 uppercase tracking-widest">Dịch vụ</th>
                  <th className="pb-3 text-left text-[9pt] font-black text-slate-400 uppercase tracking-widest">Chỉ số / Chi tiết</th>
                  <th className="pb-3 text-right text-[9pt] font-black text-slate-400 uppercase tracking-widest w-40">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="text-[10.5pt]">
                <tr className="border-b border-slate-100">
                  <td className="py-4 text-slate-400 font-bold">01</td>
                  <td className="py-4 font-black text-slate-800">Tiền thuê phòng</td>
                  <td className="py-4 text-slate-500 font-medium italic">Tiền phòng cố định</td>
                  <td className="py-4 text-right font-black text-slate-900">{formatMoney(invoice.room_fee || 0)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-4 text-slate-400 font-bold">02</td>
                  <td className="py-4 font-black text-slate-800">Điện tiêu thụ</td>
                  <td className="py-4 text-slate-500 font-medium italic">{invoice.elec_old} → {invoice.elec_new} ({elecUsed} kWh)</td>
                  <td className="py-4 text-right font-black text-slate-900">{formatMoney(electricityAmount)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-4 text-slate-400 font-bold">03</td>
                  <td className="py-4 font-black text-slate-800">Nước tiêu thụ</td>
                  <td className="py-4 text-slate-500 font-medium italic">{invoice.water_old} → {invoice.water_new} ({waterUsed} m³)</td>
                  <td className="py-4 text-right font-black text-slate-900">{formatMoney(waterAmount)}</td>
                </tr>
                {wifiAmount > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-4 text-slate-400 font-bold">04</td>
                    <td className="py-4 font-black text-slate-800">Internet / Wifi</td>
                    <td className="py-4 text-slate-500 font-medium italic">Phí cố định tháng</td>
                    <td className="py-4 text-right font-black text-slate-900">{formatMoney(wifiAmount)}</td>
                  </tr>
                )}
                <tr className="border-b border-slate-200">
                  <td className="py-4 text-slate-400 font-bold">{wifiAmount > 0 ? "05" : "04"}</td>
                  <td className="py-4 font-black text-slate-800">Rác & Vệ sinh</td>
                  <td className="py-4 text-slate-500 font-medium italic">Phí công cộng</td>
                  <td className="py-4 text-right font-black text-slate-900">{formatMoney(garbageAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-start gap-12 mb-12">
            <div className="flex-1">
              <div className="bg-blue-50/50 rounded-[2rem] p-8 border border-blue-100 shadow-sm relative overflow-hidden">
                {/* Subtle background decoration */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-600/5 rounded-full"></div>
                
                <div className="flex justify-between items-center mb-6 border-b border-blue-200/50 pb-4">
                  <span className="text-[10pt] font-black uppercase tracking-widest text-blue-800/60">Chi tiết thanh toán</span>
                  <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-[8pt] font-black tracking-tighter">VNĐ</div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[11pt] font-medium text-slate-600">
                    <span>Số dư nợ tháng trước:</span>
                    <span className="font-bold text-slate-900">{formatMoney(0)} đ</span>
                  </div>
                  <div className="flex justify-between text-[11pt] font-medium text-slate-600">
                    <span>Phát sinh trong kỳ:</span>
                    <span className="font-bold text-slate-900">{formatMoney(invoice.total_amount)} đ</span>
                  </div>
                  <div className="flex justify-between text-[11pt] font-medium text-slate-600">
                    <span>Các khoản giảm trừ:</span>
                    <span className="font-bold text-red-500">({formatMoney(0)}) đ</span>
                  </div>
                  <div className="flex justify-between pt-5 mt-2 border-t-2 border-dashed border-blue-200">
                    <span className="text-[14pt] font-black text-slate-900 uppercase">{isPaid ? "Tổng tiền đã thu" : "Tổng tiền cần thu"}:</span>
                    <span className={`text-[20pt] font-black leading-none ${isPaid ? "text-emerald-600" : "text-blue-600"}`}>
                      {formatMoney(invoice.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {isPaid && transactions.length > 0 && (
                <div className="mt-8 px-4">
                  <p className="text-[9pt] font-black text-slate-400 uppercase tracking-widest mb-4">Lịch sử nhận tiền</p>
                  <div className="space-y-4">
                    {transactions.map((tx, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10pt] font-medium border-l-2 border-emerald-500 pl-4 py-1">
                        <div className="flex flex-col">
                          <span className="text-slate-900">{tx.description || "Thanh toán phòng"}</span>
                          <span className="text-slate-400 text-[8pt]">{tx.date}</span>
                        </div>
                        <span className="text-emerald-600 font-black">+{formatMoney(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!isPaid ? (
              <div className="w-64 flex flex-col items-center bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200">
                <p className="text-[8pt] font-black text-slate-400 uppercase tracking-widest mb-4">Quét để trả tiền</p>
                <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-100 mb-6 w-full">
                  <img src={qrUrl} alt="QR" className="w-full h-auto rounded-2xl" />
                </div>
                <div className="text-center w-full">
                  <p className="text-[10pt] font-black text-slate-900">{bankName1}</p>
                  <p className="text-[12pt] font-black text-blue-600 tracking-wider mb-1">{bankAccount1}</p>
                  <p className="text-[8pt] font-bold text-slate-400 uppercase">{bankOwner1}</p>
                </div>
              </div>
            ) : (
              <div className="w-64 shrink-0"></div>
            )}
          </div>

          <div className="flex justify-between items-center px-8">
            <div className="text-center">
              <p className="text-[9pt] font-black text-slate-400 uppercase tracking-widest mb-12">Người nộp tiền</p>
              <div className="w-32 h-px bg-slate-200 mx-auto"></div>
            </div>
            <div className="text-center">
              <p className="text-[9pt] font-black text-slate-400 uppercase tracking-widest mb-12">Người lập phiếu</p>
              <p className="text-[12pt] font-black text-slate-900 uppercase">Hà Nam</p>
            </div>
          </div>

          <div className="mt-16 text-center text-[8pt] text-slate-300 font-medium">
            NAM NAM HOUSE · QUẢN LÝ NHÀ TRỌ THÔNG MINH · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}


