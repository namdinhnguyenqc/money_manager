import ExcelJS from "exceljs";

const normalizeName = (name: string) => {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

export interface ExportPeriod {
  month: number;
  year: number;
}

export async function exportInvoicesToExcel(
  groupedInvoices: Record<string, any[]>,
  periods: ExportPeriod[]
) {
  const workbook = new ExcelJS.Workbook();

  for (const period of periods) {
    const sheetName = `Tháng ${period.month}-${period.year}`;
    const invoices = groupedInvoices[`${period.month}/${period.year}`] || [];
    
    // Sort invoices by room name numerically/alphabetically
    invoices.sort((a, b) => String(a.roomName || "").localeCompare(String(b.roomName || ""), undefined, { numeric: true }));

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }]
    });

    // Set columns widths
    worksheet.columns = [
      { key: "room", width: 12 },          // A: Phòng
      { key: "elecOld", width: 10 },       // B: Số điện - Số cũ
      { key: "elecNew", width: 10 },       // C: Số điện - Số mới
      { key: "elecUsage", width: 12 },     // D: Điện tiêu thụ
      { key: "waterOld", width: 10 },      // E: Số nước - Số cũ
      { key: "waterNew", width: 10 },      // F: Số nước - Số mới
      { key: "waterUsage", width: 12 },    // G: Nước tiêu thụ
      { key: "elecAmt", width: 16 },       // H: Tiền điện
      { key: "waterAmt", width: 16 },      // I: Tiền nước
      { key: "roomFee", width: 16 },       // J: Tiền phòng
      { key: "trashAmt", width: 12 },      // K: Rác
      { key: "wifiAmt", width: 12 },       // L: Wifi
      { key: "otherAmt", width: 12 },      // M: Khác
      { key: "debtAmt", width: 16 },       // N: Công nợ
      { key: "totalAmt", width: 18 },      // O: Tổng cộng
      { key: "tenantName", width: 22 },    // P: Họ & Tên
      { key: "status", width: 18 },        // Q: Trạng thái
    ];

    // Style helper colors
    const blueHeaderFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF85B3F4" } // Beautiful soft blue
    };

    const lightGreenFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFA9D08E" } // Light green
    };

    const yellowFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFE699" } // Light yellow
    };

    const lightBlueFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2EFDA" } // Pale green/blue for indices
    };

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFBFBFBF" } },
      left: { style: "thin", color: { argb: "FFBFBFBF" } },
      bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
      right: { style: "thin", color: { argb: "FFBFBFBF" } },
    };

    const textCenter: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center", wrapText: true };
    const textLeft: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "left" };
    const textRight: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "right" };

    // Row 1: Empty spacer
    worksheet.addRow([]);
    worksheet.getRow(1).height = 15;

    // Row 2: Month Header (Merged A2:Q2)
    worksheet.mergeCells("A2:Q2");
    const titleCell = worksheet.getCell("A2");
    titleCell.value = `Tháng ${period.month}/${period.year}`;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF000000" } };
    titleCell.alignment = textCenter;
    titleCell.fill = blueHeaderFill;
    worksheet.getRow(2).height = 30;

    // Row 3: Index numbers 1 to 17
    const indexRowValues = Array.from({ length: 17 }, (_, i) => i + 1);
    const indexRow = worksheet.addRow(indexRowValues);
    indexRow.height = 20;
    indexRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true };
      cell.alignment = textCenter;
      cell.fill = lightBlueFill;
      cell.border = borderStyle;
    });

    // Headers structures (Row 4 & 5)
    // We will set values manually and merge cells
    const row4 = worksheet.getRow(4);
    const row5 = worksheet.getRow(5);
    row4.height = 24;
    row5.height = 24;

    const headers = [
      { col: "A", text: "Phòng", merge: "A4:A5" },
      { col: "B", text: "Số điện", merge: "B4:C4" },
      { col: "D", text: "Điện tiêu thụ", merge: "D4:D5" },
      { col: "E", text: "Số nước", merge: "E4:F4" },
      { col: "G", text: "Nước tiêu thụ", merge: "G4:G5" },
      { col: "H", text: "Tiền điện\n(KWh)", merge: "H4:H5", fill: yellowFill },
      { col: "I", text: "Tiền nước\n(Khối)", merge: "I4:I5", fill: yellowFill },
      { col: "J", text: "Tiền phòng", merge: "J4:J5", fill: yellowFill },
      { col: "K", text: "Rác", merge: "K4:K5", fill: yellowFill },
      { col: "L", text: "Wifi", merge: "L4:L5", fill: yellowFill },
      { col: "M", text: "Khác", merge: "M4:M5", fill: yellowFill },
      { col: "N", text: "Công nợ", merge: "N4:N5", fill: yellowFill },
      { col: "O", text: "Tổng cộng", merge: "O4:O5", fill: yellowFill },
      { col: "P", text: "Họ & Tên", merge: "P4:P5" },
      { col: "Q", text: "Trạng thái", merge: "Q4:Q5" },
    ];

    // Put secondary headers on Row 5
    worksheet.getCell("B5").value = "Số cũ";
    worksheet.getCell("C5").value = "Số mới";
    worksheet.getCell("E5").value = "Số cũ";
    worksheet.getCell("F5").value = "Số mới";

    headers.forEach((h) => {
      const cell = worksheet.getCell(`${h.col}4`);
      cell.value = h.text;
      worksheet.mergeCells(h.merge);
    });

    // Style Row 4 and 5
    for (let r = 4; r <= 5; r++) {
      const row = worksheet.getRow(r);
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10, bold: true };
        cell.alignment = textCenter;
        cell.border = borderStyle;

        // Colors based on column types
        // H(8), I(9), J(10), K(11), L(12), M(13), N(14), O(15) are Yellow
        // A(1), D(4), G(7), P(16), Q(17) are Green
        if (colNumber >= 8 && colNumber <= 15) {
          cell.fill = yellowFill;
        } else {
          cell.fill = lightGreenFill;
        }
      });
    }

    // Write Data rows
    let startDataRow = 6;
    invoices.forEach((inv) => {
      const items = inv.items || [];
      
      const dienOld = inv.elecOld ?? inv.elec_old ?? 0;
      const dienNew = inv.elecNew ?? inv.elec_new ?? 0;
      const waterOld = inv.waterOld ?? inv.water_old ?? 0;
      const waterNew = inv.waterNew ?? inv.water_new ?? 0;

      // Filter fee items
      let tienDien = 0;
      let tienNuoc = 0;
      let tienRac = 0;
      let tienWifi = 0;
      let tienKhac = 0;

      items.forEach((item: any) => {
        const norm = normalizeName(item.name);
        const amt = Number(item.amount || 0);
        if (norm.includes("dien") || norm.includes("electric")) {
          tienDien += amt;
        } else if (norm.includes("nuoc") || norm.includes("water")) {
          tienNuoc += amt;
        } else if (norm.includes("rac") || norm.includes("trash")) {
          tienRac += amt;
        } else if (norm.includes("wifi") || norm.includes("internet") || norm.includes("mang")) {
          tienWifi += amt;
        } else {
          tienKhac += amt;
        }
      });

      // Status
      const statusRaw = String(inv.status || "").toLowerCase();
      const statusText = statusRaw === "paid" ? "Đã thanh toán" : "Chưa thanh toán";

      const dataRow = worksheet.addRow([
        inv.roomName || inv.room_name || "",
        dienOld,
        dienNew,
        Math.max(0, dienNew - dienOld),
        waterOld,
        waterNew,
        Math.max(0, waterNew - waterOld),
        tienDien,
        tienNuoc,
        inv.roomFee ?? inv.room_fee ?? 0,
        tienRac,
        tienWifi,
        tienKhac,
        inv.previousDebt ?? inv.previous_debt ?? 0,
        inv.totalAmount ?? inv.total_amount ?? 0,
        inv.tenantName || inv.tenant_name || "",
        statusText
      ]);

      dataRow.height = 22;
      dataRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10 };
        cell.border = borderStyle;
        
        // Alignment & formats
        if (colNumber === 1 || colNumber === 16 || colNumber === 17) {
          cell.alignment = colNumber === 16 ? textLeft : textCenter;
        } else {
          cell.alignment = textRight;
          // Currency formatting for money columns
          if (colNumber >= 8 && colNumber <= 15) {
            cell.numFmt = `#,##0" ₫"`;
          } else {
            cell.numFmt = `#,##0`;
          }
        }
        
        // Background color
        // Highlight Phòng column and status
        if (colNumber === 1) {
          cell.font = { name: "Arial", size: 10, bold: true };
        }
        if (colNumber === 15) {
          cell.font = { name: "Arial", size: 10, bold: true };
          cell.fill = yellowFill;
        }
      });
    });

    // Summary Row
    const lastDataRow = worksheet.lastRow ? worksheet.lastRow.number : 5;
    if (lastDataRow >= 6) {
      const summaryRow = worksheet.addRow([]);
      summaryRow.height = 24;

      // Fill summary row cells with styles
      for (let c = 1; c <= 17; c++) {
        const cell = summaryRow.getCell(c);
        cell.fill = lightGreenFill;
        cell.border = borderStyle;
        cell.font = { name: "Arial", size: 10, bold: true };
        cell.alignment = c === 1 || c === 16 || c === 17 ? textCenter : textRight;

        if (c === 1) {
          cell.value = "Tổng";
        } else if (c === 4) {
          // Total Elec consumption
          cell.value = { formula: `SUM(D6:D${lastDataRow})` };
          cell.numFmt = `#,##0`;
        } else if (c === 7) {
          // Total Water consumption
          cell.value = { formula: `SUM(G6:G${lastDataRow})` };
          cell.numFmt = `#,##0`;
        } else if (c >= 8 && c <= 15) {
          // Total Money columns
          const colLetter = String.fromCharCode(64 + c);
          cell.value = { formula: `SUM(${colLetter}6:${colLetter}${lastDataRow})` };
          cell.numFmt = `#,##0" ₫"`;
        }
      }
    }
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  
  const label = periods.length === 1 
    ? `Thang_${periods[0].month}_${periods[0].year}` 
    : `Bao_cao_nhieu_thang`;
    
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Danh_Sach_Hoa_Don_${label}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
