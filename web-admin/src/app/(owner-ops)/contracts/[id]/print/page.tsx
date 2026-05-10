"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { formatMoney, loadContract, loadOwnerProfile } from "@/lib/rentalOps";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";

export default function ContractPrintPage() {
  const { id } = useParams();
  const router = useRouter();
  const [contract, setContract] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, o] = await Promise.all([
          loadContract(String(id)),
          loadOwnerProfile()
        ]);
        setContract(c);
        setOwner(o);
      } catch (err) {
        console.error("Failed to load contract for printing", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-8"><LoadingSkeleton rows={10} /></div>;
  if (!contract) return <div className="p-8 text-red-600 font-medium">Không tìm thấy hợp đồng.</div>;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const electricity = (contract.applied_services_snapshot || []).find((s: any) => s.name?.toLowerCase().includes("điện"));
  const water = (contract.applied_services_snapshot || []).find((s: any) => s.name?.toLowerCase().includes("nước"));
  const garbage = (contract.applied_services_snapshot || []).find((s: any) => s.name?.toLowerCase().includes("rác"));

  return (
    <div className="min-h-screen bg-slate-100 py-10 print:bg-white print:py-0">
      {/* Controls */}
      <div className="mx-auto mb-6 flex max-w-[21cm] items-center justify-between px-4 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft size={18} /> Quay lại chi tiết
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Printer size={18} /> In hợp đồng
        </button>
      </div>

      {/* A4 Document */}
      <div className="mx-auto bg-white p-[2.5cm] shadow-2xl print:p-0 print:shadow-none" style={{ width: "21cm", minHeight: "29.7cm", fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="text-black text-[13pt] leading-[1.6]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="font-bold text-[14pt] uppercase tracking-tight">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="font-bold text-[13pt]">Độc lập – Tự do – Hạnh phúc</div>
            <div className="mx-auto my-3 w-40 border-b-[1.5px] border-black"></div>
            
            <h1 className="mt-10 mb-8 text-[18pt] font-bold uppercase tracking-wide">HỢP ĐỒNG THUÊ PHÒNG TRỌ</h1>
          </div>

          <div className="space-y-1">
            <p className="mb-4">Hôm nay ngày {day} tháng {month} năm {year}; tại địa chỉ: 60/7/4A đường số 4, phường Thủ Đức, TP Hồ Chí Minh</p>
            
            <p className="mb-2 font-bold underline">Chúng tôi gồm:</p>
            
            <div className="mb-4 space-y-1">
              <p>1. Đại diện bên cho thuê phòng trọ (Bên A):</p>
              <div className="pl-4">
                <p>Ông/bà: <span className="font-bold">{owner?.name || "Nguyễn Đình Hà Nam"}</span> &nbsp;&nbsp;&nbsp; Sinh ngày: {owner?.dob || "26/11/1999"}</p>
                <p>Nơi đăng ký HK: {owner?.address || "90 Nguyễn Văn Cừ, Phường Tuy Hòa, Tỉnh Đắk Lắk"}</p>
                <p>CMND số: <span>{owner?.idCard || "054099004728"}</span> cấp ngày {owner?.idCardDate || "21/01/2025"} &nbsp;&nbsp; tại {owner?.idCardPlace || "Bộ Công An"}</p>
                <p>Số điện thoại: <span>{owner?.phone || "0927368772"}</span></p>
              </div>
            </div>

            <div className="mb-4 space-y-1">
              <p>2. Bên thuê phòng trọ (Bên B):</p>
              <div className="pl-4">
                <p>Ông/bà: <span className="font-bold uppercase">{contract.tenant_name}</span> &nbsp;&nbsp;&nbsp; Sinh ngày: ……………..</p>
                <p>Nơi đăng ký HK thường trú: {contract.tenant_address || "………………………………………………………………………"}</p>
                <p>Số CMND: <span>{contract.tenant_id_card || "…………………."}</span> &nbsp;&nbsp; cấp ngày …../…../…… tại: ……………………...</p>
                <p>Số điện thoại: <span>{contract.tenant_phone || "………………………………………………..."}</span></p>
              </div>
            </div>

            <p className="mb-4">Sau khi bàn bạc trên tinh thần dân chủ, hai bên cùng có lợi, cùng thống nhất như sau:</p>
            <p className="mb-4">Bên A đồng ý cho bên B thuê 01 phòng ở tại địa chỉ 60/7/4A đường số 4, phường Thủ Đức, TP Hồ Chí Minh</p>

            <div className="mb-6 space-y-1">
              <p>Giá thuê: <span className="font-bold underline">{formatMoney(contract.rent_amount)} VNĐ/tháng</span> (Hai triệu bốn trăm nghìn đồng)</p>
              <p>Hình thức thanh toán: Chuyển khoản hoặc tiền mặt</p>
              <p>Tiền điện: <span className="font-bold">{formatMoney(electricity?.applied_unit_price || 3500)} đ/kwh</span> {contract.has_ac ? "(Có máy lạnh)" : "(Không máy lạnh)"} tính theo chỉ số công tơ, thanh toán vào ngày 12 đến ngày 15 hàng tháng.</p>
              <p>Tiền nước: <span className="font-bold">{formatMoney(water?.applied_unit_price || 50000)} đ/người</span> thanh toán vào ngày 12 đến ngày 15 hàng tháng.</p>
              <p>Tiền rác: <span className="font-bold">{formatMoney(garbage?.applied_unit_price || 36500)} đ/tháng</span> thanh toán vào ngày 12 đến ngày 15 hàng tháng.</p>
              <p>Tiền đặt cọc: <span className="font-bold underline">{formatMoney(contract.deposit_amount)} VNĐ</span></p>
              <p>Hợp đồng có giá trị kể từ ngày <span className="font-bold underline">{contract.start_date || "…"}</span> đến ngày <span className="font-bold underline">{contract.end_date || "…"}</span></p>
            </div>

            <div className="mb-6">
              <h2 className="font-bold uppercase">TRÁCH NHIỆM CỦA CÁC BÊN</h2>
              <div className="mt-2 space-y-1">
                <p className="font-bold">* Trách nhiệm của bên A:</p>
                <ul className="list-none pl-4">
                  <li>- Tạo mọi điều kiện thuận lợi để bên B thực hiện theo hợp đồng.</li>
                  <li>- Cung cấp nguồn điện, nước cho bên B sử dụng.</li>
                </ul>
                <p className="font-bold mt-2">* Trách nhiệm của bên B:</p>
                <ul className="list-none pl-4 space-y-1">
                  <li>- Thanh toán đầy đủ các khoản tiền theo đúng thỏa thuận.</li>
                  <li>- Bảo quản các trang thiết bị và cơ sở vật chất của bên A trang bị cho ban đầu (làm hỏng phải sửa, mất phải đền).</li>
                  <li>- Không gây ồn ào ảnh hưởng đến các phòng kế bên.</li>
                  <li>- Không được tự ý sửa chữa, cải tạo cơ sở vật chất khi chưa được sự đồng ý của bên A.</li>
                  <li>- Giữ gìn vệ sinh trong và ngoài khuôn viên của phòng trọ.</li>
                  <li>- Bên B phải chấp hành mọi quy định của pháp luật Nhà nước và quy định của địa phương.</li>
                  <li>- Nếu bên B cho khách ở qua đêm thì phải báo và được sự đồng ý của chủ nhà đồng thời phải chịu trách nhiệm về các hành vi vi phạm pháp luật của khách trong thời gian ở lại.</li>
                  <li>- Trước khi trả phòng, bên B có trách nhiệm thu dọn, vệ sinh phòng sạch sẽ và bàn giao lại phòng cùng toàn bộ tài sản, trang thiết bị cho bên A.</li>
                </ul>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="font-bold uppercase">TRÁCH NHIỆM CHUNG</h2>
              <ul className="mt-2 list-none space-y-1">
                <li>- Hai bên phải tạo điều kiện cho nhau thực hiện hợp đồng</li>
                <li>- Khi hết thời hạn hợp đồng hoặc chấm dứt hợp đồng, bên B có trách nhiệm thanh toán đầy đủ các khoản chi phí phát sinh đến ngày trả phòng, bao gồm tiền thuê phòng, tiền điện, nước và các chi phí liên quan (nếu có). Bên A chỉ hoàn trả tiền đặt cọc khi bên B đã hoàn thành đầy đủ nghĩa vụ thanh toán.</li>
                <li>- Trong thời gian hợp đồng còn hiệu lực nếu bên nào vi phạm các điều khoản đã thỏa thuận thì bên còn lại có quyền đơn phương chấm dứt hợp đồng; nếu sự vi phạm hợp đồng đó gây tổn thất cho bên bị vi phạm hợp đồng thì bên vi phạm hợp đồng phải bồi thường thiệt hại.</li>
                <li>- Khi hết thời hạn hợp đồng mà bên B không tái ký tiếp, bên A có trách nhiệm hoàn trả đầy đủ số tiền đặt cọc cho bên B trong vòng 3 ngày kể từ ngày bên B trả phòng và bàn giao đầy đủ tài sản.</li>
                <li>- Bên nào vi phạm điều khoản chung thì phải chịu trách nhiệm trước pháp luật.</li>
                <li>- Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ một bản.</li>
              </ul>
            </div>

            {/* Signatures */}
            <div className="mt-16 flex justify-between px-12 pb-12">
              <div className="text-center">
                <p className="font-bold uppercase">ĐẠI DIỆN BÊN B</p>
                <div className="mt-20"></div>
                <p className="font-bold uppercase">{contract.tenant_name}</p>
              </div>
              <div className="text-center">
                <p className="font-bold uppercase">ĐẠI DIỆN BÊN A</p>
                <div className="mt-20"></div>
                <p className="font-bold uppercase">{owner?.name || "Nguyễn Đình Hà Nam"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
