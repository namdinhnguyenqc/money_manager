import { createInvoice, getContractServices, getPreviousDebt } from '../database/queries';
import { calculateProratedRent } from '../utils/format';

export const stripToDigits = (text) => (text || '').replace(/[^0-9]/g, '');
const normalizeText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export const generateInvoiceData = async ({ contract, month, year, meterInputs, checkoutDateInput }) => {
  const items = [];
  let elecOld = 0;
  let elecNew = 0;
  let waterOld = 0;
  let waterNew = 0;

  const activeServices = await getContractServices(contract.id);

  for (const svc of activeServices) {
    const serviceNameNorm = normalizeText(svc.name);
    const isElectricity = serviceNameNorm.includes('dien');
    const isWater = serviceNameNorm.includes('nuoc');

    // Business rule for monthly room billing:
    // - Electricity is metered
    // - Water is charged by occupants/room, not by meter
    if (isWater) {
      const numPeople = contract.num_people || 1;
      items.push({
        name: svc.name,
        detail: `${svc.unit_price.toLocaleString('vi-VN')}d x ${numPeople} nguoi`,
        amount: svc.unit_price * numPeople,
        serviceId: svc.id,
      });
      continue;
    }

    if (svc.type === 'fixed') {
      items.push({
        name: svc.name,
        detail: `${svc.unit_price.toLocaleString('vi-VN')}d co dinh`,
        amount: svc.unit_price,
        serviceId: svc.id,
      });
      continue;
    }

    if (svc.type === 'per_person') {
      const numPeople = contract.num_people || 1;
      items.push({
        name: svc.name,
        detail: `${svc.unit_price.toLocaleString('vi-VN')}d x ${numPeople} nguoi`,
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
      }

      if (newVal > 0 && newVal < oldVal) {
        throw new Error(`${svc.name}: so moi (${newVal}) khong the nho hon so cu (${oldVal}).`);
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
  };
};

export const executeCreateInvoice = async (invoicePayload) => createInvoice(invoicePayload);
