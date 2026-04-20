import { getTradingItemsByBatch } from '../database/queries';

export const calculateBatchSummary = (data, batchId) => {
  let imp = 0;
  let rev = 0;
  let unsoldC = 0;
  let soldC = 0;

  data.forEach(x => {
    imp += x.import_price;
    if (x.status === 'sold') {
      rev += (x.sell_price || 0);
      soldC++;
    } else {
      unsoldC++;
    }
  });

  return {
    id: batchId,
    totalImport: imp,
    totalRevenue: rev,
    paybackGap: rev - imp,
    unsoldCount: unsoldC,
    soldCount: soldC,
    items: data,
  };
};

export const fetchBatchDetails = async (batchId) => {
  const data = await getTradingItemsByBatch(batchId);
  return calculateBatchSummary(data, batchId);
};
