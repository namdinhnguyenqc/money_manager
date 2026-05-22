"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  RefreshCw,
  Receipt,
  Users,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { apiClient } from "@/lib/api";

type DashboardSummary = {
  totalOwners: number;
  activeOwners: number;
  lockedOwners: number;
  totalTenants: number;
  totalProperties: number;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  nearExpiryContracts: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  totalDebtAmount: number;
};

type DashboardCharts = {
  ownersByMonth: Record<string, number>;
  roomsByStatus: Record<string, number>;
  invoicesByStatus: Record<string, number>;
};

type ContractAlert = { id: string; end_date?: string | null; status?: string | null; tenant_id?: string | null };
type InvoiceAlert = { id: string; due_date?: string | null; status?: string | null; total_amount?: number | null; paid_amount?: number | null };
type OwnerAlert = { id: string; name?: string | null; email?: string | null; last_login_at?: string | null };

type DashboardAlerts = {
  nearExpiryContracts: ContractAlert[];
  overdueInvoices: InvoiceAlert[];
  inactiveOwners: OwnerAlert[];
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value?: string | null) => {
  if (!value) return "Chưa có ngày";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("vi-VN");
};

const chartRows = (data: Record<string, number>) =>
  Object.entries(data || {}).sort(([left], [right]) => left.localeCompare(right));

function Metric({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
          {icon}
        </span>
      </div>
    </Card>
  );
}

function Distribution({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(...rows.map(([, value]) => value), 1);

  return (
    <Card className="p-5">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>}
        {rows.map(([key, value]) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-slate-600">{key}</span>
              <span className="font-semibold text-slate-950">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded bg-blue-600" style={{ width: `${Math.max((value / max) * 100, 6)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AlertRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm">
      <p className="truncate font-semibold text-slate-900">{title}</p>
      <p className="mt-1 truncate text-slate-500">{description}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, chartData, alertData] = await Promise.all([
        apiClient<DashboardSummary>("/admin/dashboard/summary"),
        apiClient<DashboardCharts>("/admin/dashboard/charts"),
        apiClient<DashboardAlerts>("/admin/dashboard/alerts"),
      ]);
      setSummary(summaryData);
      setCharts(chartData);
      setAlerts(alertData);
    } catch (err: any) {
      setError(err?.message || "Không thể tải dashboard Admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const roomRows = useMemo(() => chartRows(charts?.roomsByStatus || {}), [charts]);
  const invoiceRows = useMemo(() => chartRows(charts?.invoicesByStatus || {}), [charts]);
  const ownerRows = useMemo(() => chartRows(charts?.ownersByMonth || {}).slice(-6), [charts]);

  const occupancyRate = summary?.totalRooms ? Math.round((summary.occupiedRooms / summary.totalRooms) * 100) : 0;
  const alertCount =
    (alerts?.nearExpiryContracts.length || 0) +
    (alerts?.overdueInvoices.length || 0) +
    (alerts?.inactiveOwners.length || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="Bảng điều hành"
        title="Tổng quan vận hành"
        description="Theo dõi sức khỏe hệ thống, công nợ, hợp đồng và các tài khoản cần xử lý trên toàn bộ nền tảng."
        actions={
          <button
            onClick={() => void load()}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        }
      />

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </Card>
      )}

      {loading && !summary ? (
        <Card className="flex min-h-40 items-center justify-center p-6 text-sm text-slate-500">
          Đang tải dashboard...
        </Card>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Chủ trọ"
              value={summary.totalOwners}
              hint={`${summary.activeOwners} đang hoạt động, ${summary.lockedOwners} bị khóa`}
              icon={<Users size={18} />}
            />
            <Metric
              label="Tài sản"
              value={summary.totalProperties}
              hint={`${summary.totalRooms} phòng, tỷ lệ lấp đầy ${occupancyRate}%`}
              icon={<Building2 size={18} />}
              tone="green"
            />
            <Metric
              label="Hợp đồng sắp hết hạn"
              value={summary.nearExpiryContracts}
              hint={`${summary.totalTenants} khách thuê đang được theo dõi`}
              icon={<FileText size={18} />}
              tone={summary.nearExpiryContracts > 0 ? "amber" : "green"}
            />
            <Metric
              label="Công nợ hóa đơn"
              value={formatMoney(summary.totalDebtAmount)}
              hint={`${summary.unpaidInvoices} chưa thanh toán, ${summary.overdueInvoices} quá hạn`}
              icon={<Receipt size={18} />}
              tone={summary.overdueInvoices > 0 ? "red" : "green"}
            />
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">Tình trạng vận hành hôm nay</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {alertCount > 0
                    ? `${alertCount} mục cần kiểm tra trong hàng chờ vận hành.`
                    : "Chưa có cảnh báo ưu tiên cao cần xử lý."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Phòng trống</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{summary.vacantRooms}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Đang ở</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{summary.occupiedRooms}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Cảnh báo</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{alertCount}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <Distribution title="Trạng thái phòng" rows={roomRows} />
            <Distribution title="Trạng thái hóa đơn" rows={invoiceRows} />
            <Distribution title="Chủ trọ mới theo tháng" rows={ownerRows} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-950">Hợp đồng cần kiểm tra</h2>
                <Badge variant="warning">{alerts?.nearExpiryContracts.length || 0}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {(alerts?.nearExpiryContracts || []).slice(0, 5).map((contract) => (
                  <AlertRow
                    key={contract.id}
                    title={contract.id}
                    description={`Hết hạn: ${formatDate(contract.end_date)}`}
                  />
                ))}
                {!alerts?.nearExpiryContracts.length && (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Không có hợp đồng sắp hết hạn.
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-950">Hóa đơn quá hạn</h2>
                <Badge variant="danger">{alerts?.overdueInvoices.length || 0}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {(alerts?.overdueInvoices || []).slice(0, 5).map((invoice) => (
                  <AlertRow
                    key={invoice.id}
                    title={invoice.id}
                    description={`Đến hạn: ${formatDate(invoice.due_date)} - Còn nợ ${formatMoney(Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0))}`}
                  />
                ))}
                {!alerts?.overdueInvoices.length && (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Không có hóa đơn quá hạn.
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-950">Chủ trọ ít hoạt động</h2>
                <Badge variant="orange">{alerts?.inactiveOwners.length || 0}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {(alerts?.inactiveOwners || []).slice(0, 5).map((owner) => (
                  <AlertRow
                    key={owner.id}
                    title={owner.name || owner.email || owner.id}
                    description={owner.last_login_at ? `Đăng nhập: ${formatDate(owner.last_login_at)}` : "Chưa ghi nhận đăng nhập"}
                  />
                ))}
                {!alerts?.inactiveOwners.length && (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Không có cảnh báo chủ trọ.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card className="flex min-h-40 items-center gap-3 p-6 text-sm text-slate-500">
          <AlertTriangle size={18} />
          Chưa có dữ liệu dashboard.
        </Card>
      )}
    </div>
  );
}
