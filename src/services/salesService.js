const { poolPromise, sql } = require("../config/db");

// Service: fetch today's and yesterday's sales count
const getTodayYesterdaySales = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT
  (SELECT ISNULL(SUM(GrandTotal), 0)
   FROM InvoiceHeader
   WHERE CreatedDateTime >= CAST(GETDATE() AS DATE)
     AND CreatedDateTime < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
     AND IsVoided = 0) AS TodaySales,

  (SELECT ISNULL(SUM(GrandTotal), 0)
   FROM InvoiceHeader
   WHERE CreatedDateTime >= DATEADD(DAY, -1, CAST(GETDATE() AS DATE))
     AND CreatedDateTime < CAST(GETDATE() AS DATE)
     AND IsVoided = 0) AS YesterdaySales`);
    return result.recordset[0];
  } catch (err) {
    throw err;
  }
};

// Service: fetch sales history data (with optional date filtering)
const getSalesHistory = async ({
  fromDate = null,
  toDate = null,
  paymentType = null,
  invoiceCode = null,
  searchValue = null,
}) => {
  try {
    const pool = await poolPromise;
    const request = pool.request();

    // Add parameters safely
    request.input("FromDate", sql.Date, fromDate || null);
    request.input("ToDate", sql.Date, toDate || null);
    request.input("PaymentType", sql.NVarChar(50), paymentType || null);
    request.input("InvoiceCode", sql.NVarChar(50), invoiceCode || null);
    request.input("SearchValue", sql.NVarChar(100), searchValue || null);

    // SQL query (like your C# version)
    const query = `
      SELECT ih.InvoiceId, ih.InvoiceCode, ih.UserName AS InvoiceBy,
       ih.SubTotal, ih.TotalTax, ih.GrandTotal, ih.CoinsDiscount,
       ih.PaymentType, ih.CreatedDateTime, ih.IsVoided, ih.VoidedBy,
       ih.ChangeAmount,
       il.LineId, il.ItemId, il.ItemName, il.Price, il.Quantity,
       il.Discount, il.Tax, il.Total
FROM InvoiceHeader ih
LEFT JOIN InvoiceLine il ON il.InvoiceId = ih.InvoiceId
WHERE 
    -- ✅ Compare by DATE only (fix timezone mismatch)
    (@FromDate IS NULL OR CAST(ih.CreatedDateTime AS DATE) >= CAST(@FromDate AS DATE))
    AND (@ToDate IS NULL OR CAST(ih.CreatedDateTime AS DATE) <= CAST(@ToDate AS DATE))

    -- ✅ Empty string should behave like NULL
    AND (@PaymentType IS NULL OR LTRIM(RTRIM(@PaymentType)) = '' OR ih.PaymentType = @PaymentType)
    AND (@InvoiceCode IS NULL OR LTRIM(RTRIM(@InvoiceCode)) = '' OR ih.InvoiceCode = @InvoiceCode)

    -- ✅ Search value safe check
    AND (@SearchValue IS NULL OR LTRIM(RTRIM(@SearchValue)) = ''
         OR ih.InvoiceCode LIKE '%' + @SearchValue + '%'
         OR ih.UserName LIKE '%' + @SearchValue + '%')
    `;

    const result = await request.query(query);
    const rows = result.recordset || [];

    // --- Group by InvoiceId ---
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.InvoiceId]) {
        grouped[row.InvoiceId] = {
          InvoiceId: row.InvoiceId,
          InvoiceCode: row.InvoiceCode,
          InvoiceBy: row.InvoiceBy,
          SubTotal: row.SubTotal,
          TotalTax: row.TotalTax,
          GrandTotal: row.GrandTotal,
          CoinsDiscount: row.CoinsDiscount,
          PaymentType: row.PaymentType,
          CreatedDateTime: row.CreatedDateTime,
          IsVoided: row.IsVoided,
          VoidedBy: row.VoidedBy,
          ChangeAmount: row.ChangeAmount,
          Items: [],
        };
      }

      if (row.LineId) {
        grouped[row.InvoiceId].Items.push({
          LineId: row.LineId,
          ItemId: row.ItemId,
          ItemName: row.ItemName,
          Price: row.Price,
          Quantity: row.Quantity,
          Discount: row.Discount,
          Tax: row.Tax,
          Total: row.Total,
        });
      }
    }

    return Object.values(grouped);
  } catch (err) {
    console.error("Error fetching sales history in service:", err);
    throw err;
  }
};

// Service: fetch sales history based on predefined report types for download
// const downloadgetSalesHistory = async (reportType) => {
//   try {
//     let dateCondition = "";

//     switch (reportType?.toLowerCase()) {
//       case "today":
//         dateCondition = "CAST(ih.CreatedDateTime AS DATE) = CAST(GETDATE() AS DATE)";
//         break;

//       case "yesterday":
//         dateCondition = "CAST(ih.CreatedDateTime AS DATE) = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE)";
//         break;

//       case "weekly":
//       case "week":
//         dateCondition = `
//           DATEPART(WEEK, ih.CreatedDateTime) = DATEPART(WEEK, GETDATE())
//           AND DATEPART(YEAR, ih.CreatedDateTime) = DATEPART(YEAR, GETDATE())
//         `;
//         break;

//       case "monthly":
//       case "month":
//         dateCondition = `
//           MONTH(ih.CreatedDateTime) = MONTH(GETDATE())
//           AND YEAR(ih.CreatedDateTime) = YEAR(GETDATE())
//         `;
//         break;

//       case "yearly":
//       case "year":
//         dateCondition = `YEAR(ih.CreatedDateTime) = YEAR(GETDATE())`;
//         break;

//       default:
//         // ✅ Default → Today (GETDATE)
//         dateCondition = "CAST(ih.CreatedDateTime AS DATE) = CAST(GETDATE() AS DATE)";
//     }

//     const pool = await poolPromise;
//     const query = `
//       SELECT
//         ih.InvoiceId, ih.InvoiceCode, ih.UserName,
//         ih.SubTotal, ih.TotalTax, ih.GrandTotal, ih.CoinsDiscount,
//         ih.PaymentType, ih.CreatedDateTime, ih.IsVoided, ih.VoidedBy,
//         ih.ChangeAmount,
//         il.LineId, il.ItemId, il.ItemName, il.Price, il.Quantity,
//         il.Discount, il.Tax, il.Total
//       FROM InvoiceHeader ih
//       LEFT JOIN InvoiceLine il ON il.InvoiceId = ih.InvoiceId
//       WHERE ${dateCondition}
//     `;

//     const result = await pool.request().query(query);
//     return result.recordset || [];
//   } catch (err) {
//     console.error("Error fetching sales history in service:", err);
//     throw err;
//   }
// };

const downloadgetSalesHistory = async (fromDate, toDate, reportType) => {
  try {
    let dateCondition = "";

    // Build dynamic date condition
    if (fromDate && toDate) {
      // Custom date range
      dateCondition = `CAST(ih.CreatedDateTime AS DATE) BETWEEN CAST(@FromDate AS DATE) AND CAST(@ToDate AS DATE)`;
    } else {
      // Predefined ranges (if reportType is passed)
      switch (reportType?.toLowerCase()) {
        case "today":
          dateCondition =
            "CAST(ih.CreatedDateTime AS DATE) = CAST(GETDATE() AS DATE)";
          break;
        case "yesterday":
          dateCondition =
            "CAST(ih.CreatedDateTime AS DATE) = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE)";
          break;
        case "weekly":
        case "week":
          dateCondition = `
            DATEPART(WEEK, ih.CreatedDateTime) = DATEPART(WEEK, GETDATE())
            AND DATEPART(YEAR, ih.CreatedDateTime) = DATEPART(YEAR, GETDATE())
          `;
          break;
        case "monthly":
        case "month":
          dateCondition = `
            MONTH(ih.CreatedDateTime) = MONTH(GETDATE())
            AND YEAR(ih.CreatedDateTime) = YEAR(GETDATE())
          `;
          break;
        case "yearly":
        case "year":
          dateCondition = `YEAR(ih.CreatedDateTime) = YEAR(GETDATE())`;
          break;
        default:
          dateCondition =
            "CAST(ih.CreatedDateTime AS DATE) = CAST(GETDATE() AS DATE)";
      }
    }

    const pool = await poolPromise;
    const request = pool.request();

    // Add inputs if custom date range
    if (fromDate && toDate) {
      request.input("FromDate", sql.DateTime, fromDate);
      request.input("ToDate", sql.DateTime, toDate);
    }

    // Aggregated query (one row per invoice)
    const query = `
      SELECT 
        ih.InvoiceId,
        ih.InvoiceCode,
        ih.UserName,
        ih.PaymentType,
        ih.IsVoided,
        ih.CreatedDateTime,
        ih.VoidedBy,
        ih.ChangeAmount,
        ih.SubTotal,
        ih.TotalTax,
        ih.GrandTotal,
        ih.CoinsDiscount,
        SUM(il.Quantity) AS TotalQty   -- ✅ aggregate quantity
      FROM InvoiceHeader ih
      LEFT JOIN InvoiceLine il ON il.InvoiceId = ih.InvoiceId
      WHERE ${dateCondition}
      GROUP BY 
        ih.InvoiceId, ih.InvoiceCode, ih.UserName, ih.PaymentType, ih.IsVoided,
        ih.CreatedDateTime, ih.VoidedBy, ih.ChangeAmount, ih.SubTotal,
        ih.TotalTax, ih.GrandTotal, ih.CoinsDiscount
      ORDER BY ih.CreatedDateTime DESC
    `;

    const result = await request.query(query);
    return result.recordset || [];
  } catch (err) {
    console.error("Error fetching sales history in service:", err);
    throw err;
  }
};

// Service: fetch active sales
const getActiveSales = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`select SalesTax from company`);
    return result.recordset[0];
  } catch (err) {
    throw err;
  }
};

// Service: fetch flash report data
const getFlashReport = async ({ fromDate, toDate }) => {
  try {
    const pool = await poolPromise;

    // Match parameters like C# code
    const result = await pool
      .request()
      .input("p_FromDate", fromDate || null)
      .input("p_ToDate", toDate || null)
      .input("p_PaymentType", null)
      .input("p_InvoiceBy", null)
      .input("p_InvoiceCode", null)
      .input("p_ItemID", null)
      .execute("usp_GetSalesHistoryData_2");

    // 1st result set = invoices
    const invoices = result.recordsets[0] || [];
    // 2nd result set = payments
    const payments = result.recordsets[1] || [];

    // --- Calculations (like your flash report image) ---
    const totalTransactions = new Set(invoices.map((r) => r.InvoiceCode)).size;

    const grossSales = invoices.reduce(
      (sum, r) => sum + (r.GrandTotal || 0),
      0
    );
    const netSales = invoices.reduce((sum, r) => sum + (r.SubTotal || 0), 0);
    const taxAmount = invoices.reduce((sum, r) => sum + (r.TotalTax || 0), 0);

    const taxableSales = invoices
      .filter((r) => r.IsTaxable === 1)
      .reduce((sum, r) => sum + (r.TotalPrice || 0), 0);

    const nonTaxableSales = invoices
      .filter((r) => r.IsTaxable === 0)
      .reduce((sum, r) => sum + (r.TotalPrice || 0), 0);

    const avgTransactionAmount =
      totalTransactions > 0 ? grossSales / totalTransactions : 0;

    // Payment summary
    const paymentSummary = {};
    payments.forEach((p) => {
      paymentSummary[p.PaymentType] = p.Amount;
    });

    // Return in same structured format
    return {
      fromDate,
      toDate,
      totalTransactions,
      avgTransactionAmount: parseFloat(avgTransactionAmount.toFixed(2)),
      salesSummary: {
        grossSales: parseFloat(grossSales.toFixed(2)),
        netSales: parseFloat(netSales.toFixed(2)),
        taxableSales: parseFloat(taxableSales.toFixed(2)),
        nonTaxableSales: parseFloat(nonTaxableSales.toFixed(2)),
        taxAmount: parseFloat(taxAmount.toFixed(2)),
      },
      payments: paymentSummary,
    };
  } catch (err) {
    throw err;
  }
};

// Service: generate hourly report
const generateHourlyReport = async (fromDate, toDate) => {
    const pool = await poolPromise;
    
    // First get hourly summary
    const summaryQuery = `
         SELECT 
            CAST(ih.CreatedDateTime AS DATE) as SaleDate,
            DATEPART(HOUR, ih.CreatedDateTime) as SaleHour,
            COUNT(DISTINCT ih.InvoiceId) as Transactions,
            SUM(il.Quantity) as TotalItems,
            SUM(ih.GrandTotal) as TotalAmount
        FROM invoiceheader ih
        INNER JOIN invoiceLine il ON ih.InvoiceId = il.InvoiceId
        WHERE (@fromDate IS NULL OR CAST(ih.CreatedDateTime AS DATE) >= CAST(@fromDate AS DATE))
          AND (@toDate IS NULL OR CAST(ih.CreatedDateTime AS DATE) <= CAST(@toDate AS DATE))
          AND ih.IsVoided = 0
        GROUP BY CAST(ih.CreatedDateTime AS DATE), DATEPART(HOUR, ih.CreatedDateTime)
        ORDER BY SaleDate, SaleHour;
    `;

    // Then get detailed items for each hour
    const itemsQuery = `
       SELECT 
            CAST(ih.CreatedDateTime AS DATE) as SaleDate,
            DATEPART(HOUR, ih.CreatedDateTime) as SaleHour,
            il.ItemName,
            il.Quantity,
            il.Total as TotalPrice,
            FORMAT(ih.CreatedDateTime, 'HH:mm:ss') as SoldAt,
            il.Price as UnitPrice,
            il.Discount,
            il.Tax
        FROM invoiceheader ih
        INNER JOIN invoiceLine il ON ih.InvoiceId = il.InvoiceId
        WHERE (@fromDate IS NULL OR CAST(ih.CreatedDateTime AS DATE) >= CAST(@fromDate AS DATE))
          AND (@toDate IS NULL OR CAST(ih.CreatedDateTime AS DATE) <= CAST(@toDate AS DATE))
          AND ih.IsVoided = 0
        ORDER BY SaleDate, SaleHour, ih.CreatedDateTime;
    `;

    const request = pool.request();
    request.input('fromDate', sql.Date, fromDate || null);
    request.input('toDate', sql.Date, toDate || null);

    const [summaryResult, itemsResult] = await Promise.all([
        request.query(summaryQuery),
        request.query(itemsQuery)
    ]);

    return formatHourlyReport(summaryResult.recordset, itemsResult.recordset);
};
const formatHourlyReport = (summary, items) => {
    const hourlyData = {};
    
    // Group items by hour
    items.forEach(item => {
        const key = `${item.SaleDate}_${item.SaleHour}`;
        if (!hourlyData[key]) {
            hourlyData[key] = {
                items: []
            };
        }
        hourlyData[key].items.push({
            name: item.ItemName,
            quantity: parseFloat(item.Quantity),
            totalPrice: parseFloat(item.TotalPrice).toFixed(2),
            unitPrice: parseFloat(item.UnitPrice).toFixed(2),
            discount: parseFloat(item.Discount).toFixed(2),
            tax: parseFloat(item.Tax).toFixed(2),
            soldAt: item.SoldAt
        });
    });

    // Combine with summary data
    return summary.map(hour => {
        const key = `${hour.SaleDate}_${hour.SaleHour}`;
        const saleDate = new Date(hour.SaleDate);
        const formattedDate = `${String(saleDate.getMonth() + 1).padStart(2, '0')}/${String(saleDate.getDate()).padStart(2, '0')}/${saleDate.getFullYear()}`;
        const hourFormatted = String(hour.SaleHour).padStart(2, '0');
        
        return {
            hour: `${formattedDate} ${hourFormatted}:00`,
            amount: parseFloat(hour.TotalAmount).toFixed(2),
            items: hour.TotalItems,
            transactions: hour.Transactions,
            itemsDetail: hourlyData[key] ? hourlyData[key].items : []
        };
    });
};

module.exports = {
  getTodayYesterdaySales,
  getSalesHistory,
  getActiveSales,
  getFlashReport,
  downloadgetSalesHistory,
  generateHourlyReport,
};
