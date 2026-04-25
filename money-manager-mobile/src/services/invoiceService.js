import { createInvoice, updateInvoice, getContractServices, getPreviousDebt } from '../database/queries';
import { calculateProratedRent } from '../utils/format';

export const stripToDigits = (text) => (text || '').replace(/[^0-9]/g, '');
const normalizeText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const hasAnyKeyword = (value, keywords) => {
  const normalized = normalizeText(value);
  return keywords.some((keyword) => normalized.includes(keyword));
};

export const generateInvoiceData = async ({ contract, month, year, meterInputs, checkoutDateInput, invoiceNoteInput }) => {
  if (checkoutDateInput) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(checkoutDateInput)) {
      throw new Error('Ngày trả phòng không hợp lệ. Vui lòng nhập theo định dạng YYYY-MM-DD (VD: 2026-04-30).');
    }
    const d = new Date(checkoutDateInput);
    if (isNaN(d.getTime())) {
      throw new Error('Ngày trả phòng không tồn tại.');
    }
  }

  const items = [];
  let elecOld = 0;
  let elecNew = 0;
  let waterOld = 0;
  let waterNew = 0;

  const activeServices = await getContractServices(contract.id);

  for (const svc of activeServices) {
    const serviceNameNorm = normalizeText(svc.name);
    const isElectricity = hasAnyKeyword(serviceNameNorm, ['dien', 'electric']);
    const isWater = hasAnyKeyword(serviceNameNorm, ['nuoc', 'water']);

    // If it's water and NOT metered, fallback to per person
    if (isWater && svc.type !== 'metered' && svc.type !== 'meter') {
      const numPeople = contract.num_people || 1;
      items.push({
        name: svc.name,
        detail: `${svc.unit_price.toLocaleString('vi-VN')}d x ${numPeople} người`,
        amount: svc.unit_price * numPeople,
        serviceId: svc.id,
      });
      continue;
    }

    if (svc.type === 'fixed') {
      items.push({
        name: svc.name,
        detail: `${svc.unit_price.toLocaleString('vi-VN')}d cố định`,
        amount: svc.unit_price,
        serviceId: svc.id,
      });
      continue;
    }

    if (svc.type === 'per_person') {
      const numPeople = contract.num_people || 1;
      items.push({
        name: svc.name,
        detail: `${svc.unit_price.toLocaleString('vi-VN')}d x ${numPeople} người`,
        amount: svc.unit_price * numPeople,
        serviceId: svc.id,
      });
      continue;
    }

    if (svc.type === 'metered' || svc.type === 'meter') {
      const keyOld = `${contract.id}_${svc.id}_old`;
      const keyNew = `${contract.id}_${svc.id}_new`;
      const oldVal = parseInt(stripToDigits(meterInputs[keyOld] || '0'), 10) || 0;
      const newVal = parseInt(stripToDigits(meterInputs[keyNew] || '0'), 10) || 0;

      if (isElectricity) {
        elecOld = oldVal;
        elecNew = newVal;
      } else if (isWater) {
        waterOld = oldVal;
        waterNew = newVal;
      }

      if (newVal > 0 && newVal < oldVal) {
        throw new Error(`${svc.name}: chỉ số mới (${newVal}) không được nhỏ hơn chỉ số cũ (${oldVal}).`);
      }

      if (newVal > 0 && newVal >= oldVal) {
        const used = newVal - oldVal;
        const hasAc = contract.has_ac === 1;
        const unitPrice = hasAc && svc.unit_price_ac > 0 ? svc.unit_price_ac : svc.unit_price;
        items.push({
          name: svc.name,
          detail: `${oldVal} -> ${newVal} = ${used}${svc.unit}${hasAc ? ' AC' : ''} x ${unitPrice.toLocaleString('vi-VN')}d`,
          amount: used * unitPrice,
          serviceId: svc.id,
        });
      }
    }
  }

  const proration = calculateProratedRent(
    contract.room_price,
    month,
    year,
    contract.start_date,
    checkoutDateInput || null
  );
  const previousDebt = await getPreviousDebt(contract.room_id, month, year);

  return {
    roomId: contract.room_id,
    contractId: contract.id,
    month,
    year,
    roomFee: proration.amount,
    items,
    previousDebt,
    elecOld,
    elecNew,
    waterOld,
    waterNew,
    invoiceNote: invoiceNoteInput || null,
  };
};

export const executeCreateInvoice = async (invoicePayload) => createInvoice(invoicePayload);
export const executeUpdateInvoice = async (invoiceId, invoicePayload) => updateInvoice(invoiceId, invoicePayload);
