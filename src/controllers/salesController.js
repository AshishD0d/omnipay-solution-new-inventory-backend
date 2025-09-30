const salesService = require("../services/salesService");
const { generateFlashReportPDF, generateHourlyReportPDF } = require("../utils/pdfService");
const PDFDocument = require("pdfkit");

// Controller to get today's and yesterday's sales count
const todayYesterdaySales = async (req, res) => {
  try {
    const todayYesterdaySales = await salesService.getTodayYesterdaySales();
    res.status(200).json({
      success: true,
      message:
        todayYesterdaySales.length > 0
          ? "Sales data fetched successfully"
          : "No sales data found",
      TodaySalesCount: parseFloat(todayYesterdaySales.TodaySales.toFixed(2)),
      YesterdaySalesCount: parseFloat(todayYesterdaySales.YesterdaySales.toFixed(2)),
    });
  } catch (err) {
    console.error("Error fetching sales data:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to get sales history data
const salesHistoryData = async (req, res) => {
  try {
    const { fromDate, toDate, paymentType, invoiceCode, searchValue } =
      req.body;

    // Normalize dates to cover whole days
    // const normalizeDate = (date) => {
    //   if (!date) return null;
    //   return new Date(new Date(date).toDateString()); // midnight (00:00:00)
    // };

    // const salesHistory = await salesService.getSalesHistory({
    //   fromDate: normalizeDate(fromDate),
    //   toDate: normalizeDate(toDate),
    //   paymentType: paymentType || null,
    //   invoiceCode: invoiceCode || null,
    //   searchValue: null,
    // });

    const salesHistory = await salesService.getSalesHistory({
      fromDate: fromDate || null,
      toDate: toDate || null,
      paymentType: paymentType || null,
      invoiceCode: invoiceCode || null,
      searchValue: null,
    });

    res.json({
      success: true,
      message:
        salesHistory.length > 0
          ? "Sales history fetched successfully"
          : "No sales history found",
      SalesHistoryCount: salesHistory.length,
      SalesHistory: salesHistory,
    });
  } catch (err) {
    console.error("Error fetching sales history:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to download sales report as PDF
const downloadReport = async (req, res) => {
  try {
    const { fromDate, toDate, reportType } = req.body;
    // console.log("body params:", req.body);
    const salesHistory = await salesService.downloadgetSalesHistory(
      fromDate,
      toDate,
      reportType
    );
    // console.log("salesHistory:", salesHistory);

    if (!salesHistory || salesHistory.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No sales records found",
        count: 0,
        salesHistory: [],
      });
    }

    const filename = `sales_report_${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 15, size: "A4" });
    doc.pipe(res);

    // ===== Title =====
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Sales Report", { align: "center" });
    doc.moveDown(0.5);
    // doc.fontSize(10).font("Helvetica").text(
    //   startDate && endDate ? `From: ${startDate}  To: ${endDate}` : "All records",
    //   { align: "center" }
    // );
    doc.moveDown(1);

    // ===== Table Setup =====
    const pageWidth = doc.page.width;
    const usableWidth =
      pageWidth - doc.page.margins.left - doc.page.margins.right;

    const headers = [
      { key: "InvoiceId", label: "ID" },
      { key: "InvoiceCode", label: "Code" },
      { key: "GrandTotal", label: "Price" }, // renamed for PDF
      { key: "TotalQty", label: "Qty" },
      { key: "TotalTax", label: "Tax" },
      { key: "CoinsDiscount", label: "Disc" },
      { key: "UserName", label: "User" },
      { key: "PaymentType", label: "Pay" },
      { key: "IsVoided", label: "Voided" },
      { key: "CreatedDateTime", label: "Date" },
    ];

    // Adjust column proportions (sum = 1)
    const colPercents = [
      0.06, 0.14, 0.08, 0.07, 0.07, 0.07, 0.12, 0.1, 0.08, 0.21,
    ];
    const colWidths = colPercents.map((p) => Math.floor(usableWidth * p));

    const rowHeight = 24;
    const padding = 4;

    // === Header Renderer ===
    const renderHeader = (y) => {
      doc.save();
      doc
        .rect(doc.page.margins.left - 2, y - 4, usableWidth + 4, rowHeight + 6)
        .fill("#2E86C1");
      doc.fillColor("white").font("Helvetica-Bold").fontSize(10);

      let x = doc.page.margins.left;
      headers.forEach((h, i) => {
        doc.text(h.label, x + padding, y + 6, {
          width: colWidths[i] - padding * 2,
          align: "center",
        });
        x += colWidths[i];
      });

      doc.restore();
      doc.fillColor("black").font("Helvetica").fontSize(9);
    };

    // === Table Start ===
    let y = doc.y + 6;
    renderHeader(y);
    y += rowHeight + 6;

    salesHistory.forEach((row, idx) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top + 10;
        renderHeader(y);
        y += rowHeight + 6;
      }

      // Zebra rows
      if (idx % 2 === 0) {
        doc.save();
        doc
          .rect(
            doc.page.margins.left - 2,
            y - 2,
            usableWidth + 4,
            rowHeight + 4
          )
          .fill("#F8F9F9");
        doc.restore();
      }

      let x = doc.page.margins.left;
      headers.forEach((h, i) => {
        let val = row[h.key];

        // Formatting
        if (["TotalPrice", "TotalTax", "TotalDiscount"].includes(h.key)) {
          val = Number(val || 0).toFixed(2);
        }
        if (h.key === "CreatedDateTime") {
          val = val ? new Date(val).toISOString() : "";
        }
        if (h.key === "IsVoided") {
          val = val ? "Yes" : "No";
        }

        // Cell border...
        doc
          .rect(x, y - 2, colWidths[i], rowHeight + 4)
          .strokeColor("#D5DBDB")
          .lineWidth(0.5)
          .stroke();

        // Alignment
        let align = "left";
        if (
          ["TotalPrice", "TotalQuantity", "TotalTax", "TotalDiscount"].includes(
            h.key
          )
        )
          align = "right";
        if (h.key === "Date") align = "center";

        doc
          .fillColor("black")
          .fontSize(9)
          .text(val ?? "", x + padding, y + 6, {
            width: colWidths[i] - padding * 2,
            align,
          });

        x += colWidths[i];
      });

      y += rowHeight + 4;
    });

    doc.end();
  } catch (err) {
    console.error("Error generating PDF report:", err);
    res.status(500).json({ message: "Failed to generate PDF report" });
  }
};

//Controller to get active sales
const activeSales = async (req, res) => {
  try {
    const activeSales = await salesService.getActiveSales();
    res.status(200).json({
      success: true,
      message: activeSales
        ? "Active sales fetched successfully"
        : "No active sales found",
      ActiveSalesTax: activeSales.SalesTax,
    });
  } catch (error) {
    console.error("Error fetching active sales:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to generate flash report
const flashReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const report = await salesService.getFlashReport(fromDate, toDate);

    // const pdfBuffer = await generateFlashReportPDF({
    //   ...report,
    //   fromDate,
    //   toDate,
    // });
    // res.setHeader("Content-Type", "application/pdf");
    // res.setHeader("Content-Disposition",`attachment; filename="flash_report_${Date.now()}.pdf"`);
    // res.status(200).send(pdfBuffer);
    // res.status(200).end();

    res.status(200).json({
      success: true,
      message: Object.keys(report).length > 0
          ? "Flash report generated successfully"
          : "No data found for the given date range",
      data: report,
    });
  } catch (error) {
    console.error("Error generating flash report:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Controller to generate hourly report
const hourlyReport = async (req, res) => {
  try {
    let { fromDate, toDate } = req.body;
    const report = await salesService.generateHourlyReport(fromDate, toDate);
    // const pdfBuffer = await generateHourlyReportPDF({      
    //   data: report,
    //   fromDate,
    //   toDate,
    // });
    // res.setHeader("Content-Type", "application/pdf");
    // res.setHeader("Content-Disposition",`attachment; filename="hourly_report_${Date.now()}.pdf"`);
    // res.status(200).send(pdfBuffer);
    // res.status(200).end();

    res.json({
      success: true,
      message:
        report.length > 0
          ? "Hourly report generated successfully"
          : "No data found for the given date range",
      data: report,
      fromDate: fromDate,
      toDate: toDate,
    });
  } catch (error) {
    console.error("Error generating hourly report:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

// Controller to get per item sales history
const perItemSalesHistory = async (req, res) => {
  try {
    const { fromDate, toDate, invoiceCode, itemId } = req.body;

    const salesHistory = await salesService.getPerItemSalesHistory({
      fromDate: fromDate || null,
      toDate: toDate || null,
      invoiceCode: invoiceCode || null,
      itemId: itemId || null,
    });
    res.json({
      success: true,
      message:
        salesHistory.totalRecords > 0
          ? "Per item sales history fetched successfully"
          : "No per item sales history found",
      totalRecords: salesHistory.totalRecords,
      totalQuantity: salesHistory.totalQuantity,
      totalPrice: parseFloat(salesHistory.totalPrice.toFixed(2)),
      salesHistory: salesHistory.salesHistory,
    });
  } catch (err) {
    console.error("Error fetching per item sales history:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  todayYesterdaySales,
  salesHistoryData,
  downloadReport,
  activeSales,
  flashReport,
  hourlyReport,
  perItemSalesHistory,
};
