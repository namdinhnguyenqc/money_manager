import { computeCarryover, type RoomAdjustmentRow, type RoomServiceRow } from "../utils/billing.js";
import { buildInvoiceDraft, InvoiceDraftError, snapshotServices, type InvoiceDraft } from "../utils/invoiceDraft.js";

type Db = { from: (table: string) => any };

export type DraftRequest = {
  contractId?: string | null;
  roomId?: string | null;
  month: number;
  year: number;
  elecOld?: number | null;
  elecNew?: number | null;
  waterOld?: number | null;
  waterNew?: number | null;
  excludeServiceIds?: string[];
  skipRent?: boolean;
  prorateFirstMonthServices?: boolean;
  /** Manual rent; ignored when it equals the monthly rent (old clients always sent that). */
  roomFee?: number;
  extraItems?: Array<{ name: string; detail?: string | null; amount: number }>;
  applyPreviousDebt?: boolean;
};

export type DraftContext = {
  contract: any;
  contractId: string;
  roomId: string;
  pendingAdjustments: Array<RoomAdjustmentRow>;
  carryover: Awaited<ReturnType<typeof computeCarryover>>;
  applyDebt: boolean;
  existingServiceIds: Set<string>;
};

export type DraftResult =
  | { ok: true; draft: InvoiceDraft; context: DraftContext }
  | { ok: false; status: 400 | 404 | 409; error: string; code?: string };

const periodEndDate = (month: number, year: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;

/** Loads everything an invoice depends on and prices it with buildInvoiceDraft. Reads only. */
export async function loadInvoiceDraft(db: Db, userId: string, req: DraftRequest): Promise<DraftResult> {
  if (!req.contractId && !req.roomId) return { ok: false, status: 400, error: "Missing contractId or roomId" };

  let contractQuery = db.from("contracts").select("*").eq("user_id", userId);
  contractQuery = req.contractId
    ? contractQuery.eq("id", req.contractId)
    : contractQuery.eq("room_id", req.roomId).eq("status", "active");
  const contractRes = await contractQuery.maybeSingle();
  if (contractRes.error) return { ok: false, status: 400, error: contractRes.error.message };
  if (!contractRes.data) return { ok: false, status: 404, error: "Contract not found" };

  const contract = contractRes.data;
  const contractId = String(contract.id);
  const services = snapshotServices(contract.applied_services_snapshot);
  if (services.length === 0) {
    return {
      ok: false,
      status: 409,
      code: "SERVICES_NOT_CONFIGURED",
      error: "Hợp đồng chưa có bảng giá dịch vụ. Hãy cấu hình dịch vụ và cập nhật hợp đồng trước khi tạo hóa đơn.",
    };
  }
  const roomId = String(req.roomId ?? contract.room_id ?? "");
  if (!roomId) return { ok: false, status: 400, error: "Missing roomId" };

  const serviceIds = services.map((s) => (s.service_id != null ? String(s.service_id) : "")).filter(Boolean);
  const [roomRes, lastInvoiceRes, roomServicesRes, adjustmentsRes, servicesRes, carryover] = await Promise.all([
    db.from("rooms").select("id,price").eq("id", roomId).eq("user_id", userId).maybeSingle(),
    db
      .from("invoices")
      .select("elec_new,water_new")
      .eq("room_id", roomId)
      .eq("contract_id", contractId)
      .eq("user_id", userId)
      .or("elec_new.not.is.null,water_new.not.is.null")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Room-level services that have started by the end of this period.
    db
      .from("room_services")
      .select("id,service_id,quantity,custom_unit_price,services(name,unit_price,unit)")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .eq("status", "active")
      .lte("start_date", periodEndDate(req.month, req.year)),
    db
      .from("room_adjustments")
      .select("id,label,amount,note")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .eq("period_month", req.month)
      .eq("period_year", req.year)
      .is("invoice_id", null),
    serviceIds.length
      ? db.from("services").select("id").eq("user_id", userId).in("id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
    computeCarryover(db, { userId, contractId, month: req.month, year: req.year }),
  ]);
  if (roomRes.error) return { ok: false, status: 400, error: roomRes.error.message };
  if (lastInvoiceRes.error) return { ok: false, status: 400, error: lastInvoiceRes.error.message };

  const elecOld = req.elecOld ?? Number(lastInvoiceRes.data?.elec_new ?? contract.electric_start ?? 0);
  const waterOld = req.waterOld ?? Number(lastInvoiceRes.data?.water_new ?? contract.water_start ?? 0);
  const applyDebt = req.applyPreviousDebt !== false;
  const monthlyRent = Number(contract.rent_amount ?? roomRes.data?.price ?? 0);
  const roomFeeOverride = req.roomFee !== undefined && Math.round(req.roomFee) !== Math.round(monthlyRent) ? req.roomFee : undefined;
  const pendingAdjustments = (adjustmentsRes.error ? [] : adjustmentsRes.data ?? []) as RoomAdjustmentRow[];

  try {
    const draft = buildInvoiceDraft({
      month: req.month,
      year: req.year,
      contract,
      roomPrice: roomRes.data?.price,
      readings: { elecOld, elecNew: req.elecNew ?? null, waterOld, waterNew: req.waterNew ?? null },
      excludeServiceIds: req.excludeServiceIds,
      skipRent: req.skipRent,
      prorateFirstMonthServices: req.prorateFirstMonthServices,
      roomFeeOverride,
      extraItems: req.extraItems,
      roomServices: (roomServicesRes.error ? [] : roomServicesRes.data ?? []) as RoomServiceRow[],
      pendingAdjustments,
      previousDebt: applyDebt ? carryover.previousDebt : 0,
      // Declining the carry-over keeps the credit that would have offset that
      // debt on the contract, so all of it is available for this period.
      availableCredit: applyDebt ? carryover.availableCreditAfterDebt : carryover.creditBalance,
    });
    return {
      ok: true,
      draft,
      context: {
        contract,
        contractId,
        roomId,
        pendingAdjustments,
        carryover,
        applyDebt,
        existingServiceIds: new Set((servicesRes.data ?? []).map((row: any) => String(row.id))),
      },
    };
  } catch (error) {
    if (error instanceof InvoiceDraftError) return { ok: false, status: 400, error: error.message };
    throw error;
  }
}
