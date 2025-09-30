const fs = require("fs");
const PDFDocument = require("pdfkit");

// Generate Flash Report PDF
const generateFlashReportPDF = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const { metrics, payments, tax, fromDate, toDate } = reportData;

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Define colors
      const colors = {
        primary: "#2563eb", // Blue
        secondary: "#1e40af", // Dark blue
        accent: "#3b82f6", // Light blue
        success: "#059669", // Green
        background: "#f8fafc", // Light gray
        text: "#1f2937", // Dark gray
        white: "#ffffff",
      };

      const pageWidth = doc.page.width - 100; // Account for margins
      const startX = 50;
      let currentY = 80;

      // --- HEADER ---
      doc
        .rect(startX, 50, pageWidth, 40)
        .fillAndStroke(colors.primary, colors.secondary);

      doc
        .fillColor(colors.white)
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("FLASH REPORT", startX, 65, {
          width: pageWidth,
          align: "center",
        });

      currentY = 110;

      // Helper function to create section header
      const createSectionHeader = (title, y) => {
        doc
          .rect(startX, y, pageWidth, 30)
          .fillAndStroke(colors.accent, colors.secondary);

        doc
          .fillColor(colors.white)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(title, startX + 15, y + 8);
      };

      // Helper function to create content area
      const createContentArea = (y, height) => {
        doc
          .rect(startX, y, pageWidth, height)
          .fillAndStroke(colors.background, colors.secondary);
      };

      // --- DATE & TRANSACTION INFO SECTION ---
      createSectionHeader("DATE & TRANSACTION INFO", currentY);
      currentY += 30;

      createContentArea(currentY, 50);

      doc.fillColor(colors.text).fontSize(11).font("Helvetica");

      // Left column
      doc.text(`From Date:`, startX + 15, currentY + 12);
      doc
        .font("Helvetica-Bold")
        .text(`${fromDate || "N/A"}`, startX + 80, currentY + 12);

      doc.font("Helvetica").text(`To Date:`, startX + 15, currentY + 28);
      doc
        .font("Helvetica-Bold")
        .text(`${toDate || "N/A"}`, startX + 80, currentY + 28);

      // Right column
      doc
        .font("Helvetica")
        .text(`Total Transactions:`, startX + 280, currentY + 12);
      doc
        .font("Helvetica-Bold")
        .fillColor(colors.success)
        .text(`${metrics.Transactions}`, startX + 400, currentY + 12);

      doc
        .fillColor(colors.text)
        .font("Helvetica")
        .text(`Avg Transaction Amount:`, startX + 280, currentY + 28);
      doc
        .font("Helvetica-Bold")
        .fillColor(colors.success)
        .text(
          `${metrics.AvgTransaction.toFixed(2)}`,
          startX + 430,
          currentY + 28
        );

      currentY += 70;

      // --- SALES SUMMARY SECTION ---
      createSectionHeader("SALES SUMMARY", currentY);
      currentY += 30;

      createContentArea(currentY, 90);

      doc.fillColor(colors.text).fontSize(11).font("Helvetica");

      const salesData = [
        {
          label: "Gross Sales:",
          value: metrics.GrossSales,
          color: colors.success,
        },
        { label: "Net Sales:", value: metrics.NetSales, color: colors.success },
        {
          label: "Taxable Sales:",
          value: tax.TaxableSales,
          color: colors.primary,
        },
        {
          label: "Non-Taxable Sales:",
          value: tax.NonTaxableSales,
          color: colors.primary,
        },
        { label: "Tax Amount:", value: metrics.TotalTax, color: colors.accent },
      ];

      salesData.forEach((item, index) => {
        const yPos = currentY + 12 + index * 15;
        doc
          .fillColor(colors.text)
          .font("Helvetica")
          .text(item.label, startX + 15, yPos);
        doc
          .font("Helvetica-Bold")
          .fillColor(item.color)
          .text(item.value, startX + 150, yPos);
      });

      currentY += 110;

      // --- PAYMENTS SECTION ---
      createSectionHeader("PAYMENTS", currentY);
      currentY += 30;

      const paymentHeight = Math.max(50, payments.length * 15 + 20);
      createContentArea(currentY, paymentHeight);

      doc.fillColor(colors.text).fontSize(11).font("Helvetica");

      payments.forEach((payment, index) => {
        const yPos = currentY + 12 + index * 15;
        doc
          .fillColor(colors.text)
          .font("Helvetica")
          .text(`${payment.PaymentType}:`, startX + 15, yPos);
        doc
          .font("Helvetica-Bold")
          .fillColor(colors.success)
          .text(payment.Total, startX + 120, yPos);
      });

      // Add footer
      currentY += paymentHeight + 30;
      doc
        .fontSize(8)
        .fillColor("#666666")
        .font("Helvetica")
        .text(
          `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          startX,
          currentY,
          {
            width: pageWidth,
            align: "center",
          }
        );

      // Finalize PDF
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// Generate Hourly Report PDF
// const generateHourlyReportPDF = async (reportData) => {
//   return new Promise((resolve, reject) => {
//     try {
//       const data = Array.isArray(reportData)
//         ? reportData
//         : reportData?.data || [];

//       const doc = new PDFDocument({ size: "A4", margin: 40 });
//       const buffers = [];
//       doc.on("data", buffers.push.bind(buffers));
//       doc.on("end", () => {
//         const pdfBuffer = Buffer.concat(buffers);
//         resolve(pdfBuffer);
//       });
//       doc.on("error", reject);

//       // Colors and style
//       const colors = {
//         header: "#2563eb",
//         subHeader: "#1e40af",
//         summaryBg: "#f1f5f9",
//         rowEven: "#f9fafb",
//         rowOdd: "#ffffff",
//         text: "#1f2937",
//         accent: "#059669",
//         border: "#d1d5db",
//       };

//       let currentY = 50;
//       let pageNum = 1;

//       // Footer
//       const addFooter = () => {
//         doc
//           .fontSize(9)
//           .fillColor("#6b7280")
//           .text(
//             `Generated: ${new Date().toLocaleString()}`,
//             40,
//             doc.page.height - 40,
//             { align: "left" }
//           );
//         doc
//           .fontSize(9)
//           .fillColor("#6b7280")
//           .text(`Page ${pageNum}`, doc.page.width - 80, doc.page.height - 40, {
//             width: 40,
//             align: "right",
//           });
//       };
//       // Table Header
//       const drawTableHeader = (y) => {
//         const tableCols = [
//           { header: "Item", width: 160, align: "left" },
//           { header: "Qty", width: 40, align: "center" },
//           { header: "Unit Price", width: 60, align: "right" },
//           { header: "Total", width: 60, align: "right" },
//           { header: "Tax", width: 50, align: "right" },
//           { header: "Sold At", width: 70, align: "center" },
//         ];

//         doc
//           .fillColor(colors.header)
//           .rect(40, y, doc.page.width - 80, 22)
//           .fill();

//         let x = 50;
//         tableCols.forEach((col) => {
//           doc
//             .fillColor("#fff")
//             .font("Helvetica-Bold")
//             .fontSize(10)
//             .text(col.header, x, y + 6, {
//               width: col.width,
//               align: col.align,
//             });
//           x += col.width + 10;
//         });
//         return y + 24;
//       };
//       // First page header
//       doc.rect(40, 30, doc.page.width - 80, 40).fill(colors.header);
//       doc
//         .fillColor("#ffffff")
//         .fontSize(20)
//         .font("Helvetica-Bold")
//         .text("HOURLY SALES REPORT", 40, 40, {
//           width: doc.page.width - 80,
//           align: "center",
//         });
//       currentY = 90;
//       // Loop through each hour block
//       data.forEach((block) => {
//         const items = block.itemsDetail || [];
//         // Section Title
//         if (currentY > doc.page.height - 120) {
//           addFooter();
//           doc.addPage();
//           pageNum++;
//           currentY = 50;
//         }
//         doc.rect(40, currentY, doc.page.width - 80, 25).fill(colors.subHeader);
//         doc
//           .fillColor("#fff")
//           .fontSize(12)
//           .font("Helvetica-Bold")
//           .text(`Hour: ${block.hour}`, 50, currentY + 7);
//         currentY += 30;
//         // Summary Row
//         const cardWidth = (doc.page.width - 110) / 3;
//         const cardHeight = 38;
//         const labels = ["Amount", "Transactions", "Items"];
//         const values = [
//           `$${parseFloat(block.amount).toFixed(2)}`,
//           block.transactions,
//           block.items,
//         ];

//         labels.forEach((label, i) => {
//           const x = 50 + i * (cardWidth + 10);
//           doc
//             .rect(x, currentY, cardWidth, cardHeight)
//             .fill(colors.summaryBg)
//             .stroke(colors.border);
//           doc
//             .fillColor(colors.text)
//             .fontSize(10)
//             .font("Helvetica-Bold")
//             .text(label, x + 10, currentY + 8);
//           doc
//             .fillColor(colors.accent)
//             .fontSize(13)
//             .font("Helvetica-Bold")
//             .text(values[i].toString(), x + 10, currentY + 20);
//         });
//         currentY += cardHeight + 12;
//         // Table Header
//         currentY = drawTableHeader(currentY);
//         // Table Rows
//         items.forEach((item, i) => {
//           // Page break check
//           if (currentY > doc.page.height - 80) {
//             addFooter();
//             doc.addPage();
//             pageNum++;
//             currentY = 50;
//             // Re-draw section header on new page
//             doc.rect(40, currentY, doc.page.width - 80, 25).fill(colors.subHeader);
//             doc
//               .fillColor("#fff")
//               .fontSize(12)
//               .font("Helvetica-Bold")
//               .text(`Hour: ${block.hour}`, 50, currentY + 7);
//             currentY += 30;
//             // Re-draw table header
//             currentY = drawTableHeader(currentY);
//           }
//           const bgColor = i % 2 === 0 ? colors.rowEven : colors.rowOdd;
//           doc.rect(40, currentY, doc.page.width - 80, 18).fill(bgColor);

//           let x = 50;
//           const rowData = [
//             item.name || "N/A",
//             item.quantity,
//             `$${parseFloat(item.unitPrice || 0).toFixed(2)}`,
//             `$${parseFloat(item.totalPrice || 0).toFixed(2)}`,
//             `$${parseFloat(item.tax || 0).toFixed(2)}`,
//             item.soldAt || "N/A",
//           ];
//           const tableCols = [
//             { width: 160, align: "left" },
//             { width: 40, align: "center" },
//             { width: 60, align: "right" },
//             { width: 60, align: "right" },
//             { width: 50, align: "right" },
//             { width: 70, align: "center" },
//           ];
//           rowData.forEach((val, idx) => {
//             doc
//               .fillColor(colors.text)
//               .font("Helvetica")
//               .fontSize(9)
//               .text(val.toString(), x, currentY + 4, {
//                 width: tableCols[idx].width,
//                 align: tableCols[idx].align,
//               });
//             x += tableCols[idx].width + 10;
//           });
//           currentY += 18;
//         });
//       });
//       // Final Footer
//       addFooter();
//       doc.end();
//     } catch (err) {
//       reject(err);
//     }
//   });
// };

/**
 * @param {Array} reportData - Array of report blocks (hourly data etc.)
 * @returns {Promise<Buffer>}
 */
const generateHourlyReportPDF = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      // normalize the data
      const data = Array.isArray(reportData)
        ? reportData
        : reportData?.data || [];

      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // ---- Setup ----
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      let pageNum = 1;
      let currentY = 50;

      // Colors
      const colors = {
        header: "#4CAF50",
        subHeader: "#3F51B5",
        tableHeader: "#2196F3",
        altRow: "#f2f2f2",
      };

      // Updated columns to match your data structure
      const columns = [
        { header: "Name", width: 150, key: "name" },
        { header: "Qty", width: 40, key: "quantity" },
        { header: "Unit Price", width: 60, key: "unitPrice" },
        { header: "Total Price", width: 60, key: "totalPrice" },
        { header: "Tax", width: 50, key: "tax" },
        { header: "Discount", width: 60, key: "discount" },
        { header: "Sold At", width: 60, key: "soldAt" }
      ];

      // Calculate total table width
      const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

      // ---- Helpers ----
      const addFooter = () => {
        doc
          .fontSize(8)
          .fillColor("gray")
          .text(`Page ${pageNum}`, pageWidth - 80, pageHeight - 40);
      };

      const drawTableHeader = (y) => {
        let x = margin;
        doc.fontSize(8).fillColor("white").font("Helvetica-Bold");

        columns.forEach((col) => {
          doc.rect(x, y, col.width, 20).fill(colors.tableHeader);
          doc.fillColor("white").text(col.header, x + 3, y + 6, {
            width: col.width - 6,
            align: "left",
          });
          x += col.width;
        });
        return y + 20;
      };

      const checkPageBreak = (neededHeight) => {
        if (currentY + neededHeight > pageHeight - 80) {
          addFooter();
          doc.addPage();
          pageNum++;
          currentY = 50;
          return true;
        }
        return false;
      };

      // ---- Title ----
      doc
        .fontSize(16)
        .fillColor("black")
        .font("Helvetica-Bold")
        .text("Hourly Report", { align: "center" });
      currentY += 30;

      // ---- Render Blocks ----
      data.forEach((block, blockIndex) => {
        // Use itemsDetail instead of items
        const items = Array.isArray(block.itemsDetail) ? block.itemsDetail : [];

        // Calculate needed height for this block
        const blockHeaderHeight = 30;
        const tableHeaderHeight = items.length > 0 ? 20 : 0;
        const rowsHeight = items.length > 0 ? items.length * 20 : 0;
        const blockSpacing = 10;
        
        const totalBlockHeight = blockHeaderHeight + tableHeaderHeight + rowsHeight + blockSpacing;

        // Check if we need a new page before starting the block
        if (checkPageBreak(totalBlockHeight)) {
          // If page break occurred, we need to redraw the current block header
          doc.rect(margin, currentY, tableWidth, 25).fill(colors.subHeader);
          doc
            .fillColor("white")
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(`Hour: ${block.hour}`, margin + 10, currentY + 7);
          
          doc
            .fillColor("white")
            .fontSize(10)
            .font("Helvetica")
            .text(`Total: $${block.amount} | Items: ${block.items} | Transactions: ${block.transactions}`, 
                  margin + 200, currentY + 9);
          
          currentY += 30;
        } else {
          // Normal block header
          doc.rect(margin, currentY, tableWidth, 25).fill(colors.subHeader);
          doc
            .fillColor("white")
            .fontSize(12)
            .font("Helvetica-Bold")
            .text(`Hour: ${block.hour}`, margin + 10, currentY + 7);
          
          doc
            .fillColor("white")
            .fontSize(10)
            .font("Helvetica")
            .text(`Total: $${block.amount} | Items: ${block.items} | Transactions: ${block.transactions}`, 
                  margin + 200, currentY + 9);
          
          currentY += 30;
        }

        // Only draw table if there are items
        if (items.length > 0) {
          // Table Header
          currentY = drawTableHeader(currentY);
          doc.font("Helvetica").fillColor("black");

          // Render items
          items.forEach((item, rowIndex) => {
            // Check page break for each row
            if (checkPageBreak(20)) {
              // Re-draw table header if we broke to a new page
              currentY = drawTableHeader(currentY);
              doc.font("Helvetica").fillColor("black");
            }

            // Row background
            if (rowIndex % 2 === 0) {
              doc.rect(margin, currentY, tableWidth, 20).fill(colors.altRow);
            }

            // Row cells
            let x = margin;
            columns.forEach((col) => {
              let value = item[col.key] || "";
              if (typeof value === "number") value = value.toFixed(2);
              // Format currency values
              if (col.key === "unitPrice" || col.key === "totalPrice" || col.key === "tax" || col.key === "discount") {
                if (value && !isNaN(parseFloat(value))) {
                  value = `$${parseFloat(value).toFixed(2)}`;
                }
              }
              doc
                .fillColor("black")
                .fontSize(8)
                .text(String(value), x + 3, currentY + 6, {
                  width: col.width - 6,
                  align: "left",
                });
              x += col.width;
            });

            currentY += 20;
          });
        } else {
          // No items for this hour
          if (checkPageBreak(30)) {
            // If we broke to new page, redraw the hour header
            doc.rect(margin, currentY, tableWidth, 25).fill(colors.subHeader);
            doc
              .fillColor("white")
              .fontSize(12)
              .font("Helvetica-Bold")
              .text(`Hour: ${block.hour}`, margin + 10, currentY + 7);
            currentY += 30;
          }
          
          doc
            .fillColor("gray")
            .fontSize(10)
            .font("Helvetica-Italic")
            .text("No items sold during this hour", margin + 10, currentY + 10);
          currentY += 30;
        }

        // Add some space between blocks
        currentY += 10;
      });

      // Final footer - only add if we actually have content
      if (currentY > 50) {
        addFooter();
      }
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};




// Generate Items PDF
/**
 * @param {Array} items
 * @returns {Promise<Buffer>}
 */
const generateItemsPDF = (items) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 18 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Title
      doc.fontSize(16).text("Items Report", { align: "center" });
      doc.moveDown(1);

      const pageBottom = doc.page.height - doc.page.margins.bottom;
      const rowPadding = 3;

      // Column definitions (base widths)
      const columns = [
        { header: "ID", width: 40, key: "id" },
        { header: "Name", width: 110, key: "ItemName" },
        { header: "UPC", width: 50, key: "UPC" },
        { header: "ItemCost", width: 40, key: "ItemCost" },
        { header: "ChargedCost", width: 50, key: "ChargedCost" },
        { header: "InStock", width: 35, key: "InStock" },
        { header: "Vendor", width: 60, key: "VendorName" },
        { header: "CaseCost", width: 40, key: "CaseCost" },
        { header: "No.InCase", width: 50, key: "NumberInCase" },
        { header: "SalesTax", width: 40, key: "SalesTax" },
        { header: "Category", width: 70, key: "CategoryName" },
      ];

      // ✅ Scale columns to fit exactly into available width
      const availableWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const totalColWidth = columns.reduce((sum, c) => sum + c.width, 0);
      const scaleFactor = availableWidth / totalColWidth;
      columns.forEach((col) => {
        col.width = col.width * scaleFactor;
      });

      // Draw table headers
      const drawTableHeaders = (y) => {
        let x = doc.page.margins.left;
        doc.fontSize(7).fillColor("black").font("Helvetica-Bold");
        columns.forEach((col) => {
          doc.rect(x, y, col.width, 20).fill("#4CAF50");
          doc.fillColor("black").text(col.header, x + rowPadding, y + rowPadding, {
            width: col.width - rowPadding * 2,
            align: "left",
          });
          x += col.width;
        });
        return y + 20;
      };

      let startY = drawTableHeaders(doc.y);

      // Draw rows
      doc.font("Helvetica").fillColor("black");
      items.forEach((item, rowIndex) => {
        let x = doc.page.margins.left;

        // Prepare row values
        const rowValues = columns.map((col) => {
          if (col.key === "IsManual") return item[col.key] ? "Yes" : "No";
          if (typeof item[col.key] === "number") return item[col.key].toFixed(2);
          return item[col.key] || "";
        });

        // Dynamic row height
        const cellHeights = columns.map((col, i) =>
          doc.heightOfString(rowValues[i], { width: col.width - rowPadding * 2 })
        );
        const rowHeight = Math.max(...cellHeights) + rowPadding * 2;

        // Page break
        if (startY + rowHeight > pageBottom) {
          doc.addPage();
          startY = drawTableHeaders(doc.y);
        }

        // Alternating row color (fit full width)
        if (rowIndex % 2 === 0) {
          doc.rect(doc.page.margins.left, startY, availableWidth, rowHeight)
            .fillOpacity(0.1)
            .fill("black")
            .fillOpacity(1);
        }

        // Draw each cell
        columns.forEach((col, i) => {
          doc.rect(x, startY, col.width, rowHeight).stroke();
          doc.text(rowValues[i], x + rowPadding, startY + rowPadding, {
            width: col.width - rowPadding * 2,
            align: "left",
          });
          x += col.width;
        });

        startY += rowHeight;
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};


module.exports = { generateFlashReportPDF, generateHourlyReportPDF, generateItemsPDF };
