const { pool } = require("mssql");
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
    const pool = await poolPromise;
    const request = pool.request();

    let whereClause = "";

    // Pre-parse month/year and year-only values
    const monthYearMatch =
      reportType?.match(
        /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})$/i
      ) || null;

    const yearMatch = reportType?.match(/^(\d{4})$/) || null;

    // Build dynamic date condition with proper parameter binding
    if (fromDate && toDate) {
      // // Custom date range - ensure dates are properly formatted
      // const formattedFromDate = new Date(fromDate);
      // const formattedToDate = new Date(toDate);

      // // Set time to start of day for fromDate and end of day for toDate
      // formattedFromDate.setHours(0, 0, 0, 0);
      // formattedToDate.setHours(23, 59, 59, 999);

      request.input("FromDate", sql.Date, fromDate);
      request.input("ToDate", sql.Date, toDate);

      whereClause = "WHERE ih.CreatedDateTime BETWEEN @FromDate AND @ToDate";
    } else {
      // Predefined ranges (if reportType is passed)
      switch (reportType?.toLowerCase()) {
        case "today":
          whereClause = `
            WHERE ih.CreatedDateTime => CAST(GETDATE() AS DATE)
            AND ih.CreatedDateTime =< DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
          `;
          break;

        case "yesterday":
          whereClause = `
            WHERE ih.CreatedDateTime => DATEADD(DAY, -1, CAST(GETDATE() AS DATE))
            AND ih.CreatedDateTime =< CAST(GETDATE() AS DATE)
          `;
          break;

        case "weekly":
        case "week":
          whereClause = `
            WHERE ih.CreatedDateTime => DATEADD(DAY, 1 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
            AND ih.CreatedDateTime =< DATEADD(DAY, 8 - DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))
          `;
          break;

        case "monthly":
        case "month":
          if (monthYearMatch) {
            const monthNum =
              new Date(`${monthYearMatch[1]} 1, 2000`).getMonth() + 1;
            const yearNum = parseInt(monthYearMatch[2]);
            request.input("Month", sql.Int, monthNum);
            request.input("Year", sql.Int, yearNum);

            whereClause = `
      WHERE MONTH(ih.CreatedDateTime) = @Month
      AND YEAR(ih.CreatedDateTime) = @Year
    `;
          } else {
            // default current month
            whereClause = `
      WHERE ih.CreatedDateTime => DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
      AND ih.CreatedDateTime =< DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    `;
          }
          break;

        case "yearly":
        case "year":
          if (yearMatch) {
            const yearNum = parseInt(yearMatch[1]);
            request.input("Year", sql.Int, yearNum);

            whereClause = `
      WHERE YEAR(ih.CreatedDateTime) = @Year
    `;
          } else {
            // default current year
            whereClause = `
      WHERE ih.CreatedDateTime => DATEFROMPARTS(YEAR(GETDATE()), 1, 1)
      AND ih.CreatedDateTime =< DATEFROMPARTS(YEAR(GETDATE()) + 1, 1, 1)
    `;
          }
          break;

        default:
          if (monthYearMatch) {
            const monthNum =
              new Date(`${monthYearMatch[1]} 1, 2000`).getMonth() + 1;
            const yearNum = parseInt(monthYearMatch[2]);
            request.input("Month", sql.Int, monthNum);
            request.input("Year", sql.Int, yearNum);

            whereClause = `
      WHERE MONTH(ih.CreatedDateTime) = @Month
      AND YEAR(ih.CreatedDateTime) = @Year
    `;
          } else if (yearMatch) {
            const yearNum = parseInt(yearMatch[1]);
            request.input("Year", sql.Int, yearNum);

            whereClause = `
      WHERE YEAR(ih.CreatedDateTime) = @Year
    `;
          } else {
            // fallback default today
            whereClause = `
      WHERE ih.CreatedDateTime => CAST(GETDATE() AS DATE)
      AND ih.CreatedDateTime =< DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
    `;
          }
      }
    }

    // Build the complete query
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
        COALESCE(SUM(il.Quantity), 0) AS TotalQty
      FROM InvoiceHeader ih
      LEFT JOIN InvoiceLine il ON il.InvoiceId = ih.InvoiceId
      ${whereClause}
      GROUP BY 
        ih.InvoiceId, ih.InvoiceCode, ih.UserName, ih.PaymentType, ih.IsVoided,
        ih.CreatedDateTime, ih.VoidedBy, ih.ChangeAmount, ih.SubTotal,
        ih.TotalTax, ih.GrandTotal, ih.CoinsDiscount
      ORDER BY ih.CreatedDateTime DESC
    `;

    // console.log("Executing query:", query);
    // console.log("Parameters:", { fromDate, toDate, reportType });
    // console.log("Query result count:", result.recordset?.length || 0);

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
const getFlashReport = async ( fromDate, toDate ) => {
  const pool = await poolPromise;
  const connection = await pool.connect();
  try {
    let from = fromDate;
    let to = toDate;
    console.log("Flash report from service:", { from, to });

    if (!from || !to) {
      const today = new Date().toISOString().split("T")[0];
      from = today;
      to = today;
    }

    // const params = { fromDate: from, toDate: to };

    // Metrics Query
    const metricsQuery = `
      SELECT
        SUM(h.GrandTotal) AS GrossSales,
        SUM(h.TotalTax) AS TotalTax,
        SUM(h.GrandTotal) - SUM(h.TotalTax) AS NetSales,
        SUM(h.GrandTotal) * 1.0 / NULLIF(COUNT(DISTINCT h.InvoiceId), 0) AS AvgTransaction,
        COUNT(DISTINCT h.InvoiceId) AS Transactions
      FROM InvoiceHeader h
      WHERE ISNULL(h.IsVoided, 0) = 0
        AND h.CreatedDateTime BETWEEN @fromDate AND @toDate;
    `;
    const metricsResult = await connection
      .request()
      .input("fromDate", sql.DateTime, from)
      .input("toDate", sql.DateTime, to)
      .query(metricsQuery);

    // const [metrics] = await connection.query(metricsQuery, params);

    // Payments Breakdown Query
    const paymentsQuery = `
      SELECT 
          SUM(h.GrandTotal) AS Total, 
          h.PaymentType
      FROM InvoiceHeader h
      WHERE ISNULL(h.IsVoided, 0) = 0
        AND h.CreatedDateTime BETWEEN @fromDate AND @toDate
      GROUP BY h.PaymentType;
    `;

     const paymentsResult = await connection
      .request()
      .input("fromDate", sql.DateTime, from)
      .input("toDate", sql.DateTime, to)
      .query(paymentsQuery);


    // const [payments] = await connection.query(paymentsQuery, params);

    // Taxable vs Non-Taxable Sales
    const taxQuery = `
      SELECT
          SUM(CASE WHEN ISNULL(i.Sales_Tax, 0) = 1 THEN l.Total + l.Tax ELSE 0 END) AS TaxableSales,
          SUM(CASE WHEN ISNULL(i.Sales_Tax, 0) = 0 THEN l.Total ELSE 0 END) AS NonTaxableSales
      FROM InvoiceHeader h
      LEFT JOIN InvoiceLine l ON h.InvoiceId = l.InvoiceId
      LEFT JOIN Items i ON l.ItemId = i.ItemId
      WHERE ISNULL(h.IsVoided, 0) = 0
        AND h.CreatedDateTime BETWEEN @fromDate AND @toDate;
    `;

   const taxResult = await connection
      .request()
      .input("fromDate", sql.DateTime, from)
      .input("toDate", sql.DateTime, to)
      .query(taxQuery);

    return {
      metrics: metricsResult.recordset[0] || {},
      payments: paymentsResult.recordset || [],
      tax: taxResult.recordset[0] || {},
    };
  } catch (err) {
    console.error("Error generating flash report from service:", err);
    throw err;
  } finally {
    connection.release();
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
            SUM(il.Total) AS TotalAmount 
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
  request.input("fromDate", sql.Date, fromDate || null);
  request.input("toDate", sql.Date, toDate || null);

  const [summaryResult, itemsResult] = await Promise.all([
    request.query(summaryQuery),
    request.query(itemsQuery),
  ]);
  // console.log("Hourly summary rows:", summaryResult,  "Items rows:", itemsResult);

  return formatHourlyReport(summaryResult.recordset, itemsResult.recordset);
};
const formatHourlyReport = (summary, items) => {
  const hourlyData = {};

  // Group items by hour
  items.forEach((item) => {
    const key = `${item.SaleDate}_${item.SaleHour}`;
    if (!hourlyData[key]) {
      hourlyData[key] = {
        items: [],
      };
    }
    hourlyData[key].items.push({
      name: item.ItemName,
      quantity: parseFloat(item.Quantity),
      totalPrice: parseFloat(item.TotalPrice).toFixed(2),
      unitPrice: parseFloat(item.UnitPrice).toFixed(2),
      discount: parseFloat(item.Discount).toFixed(2),
      tax: parseFloat(item.Tax).toFixed(2),
      soldAt: item.SoldAt,
    });
  });

  // Combine with summary data
  return summary.map((hour) => {
    const key = `${hour.SaleDate}_${hour.SaleHour}`;
    const saleDate = new Date(hour.SaleDate);
    const formattedDate = `${String(saleDate.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(saleDate.getDate()).padStart(
      2,
      "0"
    )}/${saleDate.getFullYear()}`;
    const hourFormatted = String(hour.SaleHour).padStart(2, "0");

    return {
      hour: `${formattedDate} ${hourFormatted}:00`,
      amount: parseFloat(hour.TotalAmount).toFixed(2),
      items: hour.TotalItems,
      transactions: hour.Transactions,
      itemsDetail: hourlyData[key] ? hourlyData[key].items : [],
    };
  });
};

// Service: fetch per item sales history
const getPerItemSalesHistory = async ({
  fromDate,
  toDate,
  invoiceCode,
  itemId,
}) => {
  try {
    const pool = await poolPromise;

    let query = `
      SELECT 
        ih.InvoiceCode,
        i.UPC,
        i.Name AS ItemName,
        il.Price,
        il.Quantity,
        il.Tax,
        (il.Price * il.Quantity + il.Tax) AS TotalPrice,
        ih.UserName AS Username,
        ih.CreatedDateTime AS DateTime,
        ih.PaymentType,
        CASE WHEN ih.IsVoided = 1 THEN 'Yes' ELSE 'No' END AS Voided
      FROM InvoiceHeader ih
      LEFT JOIN InvoiceLine il ON ih.InvoiceId = il.InvoiceId
      LEFT JOIN Items i ON il.ItemId = i.ItemId
      WHERE i.ItemId = @itemId
    `;

    const request = pool.request().input("itemId", sql.Int, itemId);

    if (fromDate) {
      query +=
        " AND CAST(ih.CreatedDateTime AS DATE) >= CAST(@fromDate AS DATE)";
      request.input("fromDate", sql.Date, fromDate);
    }

    if (toDate) {
      query += " AND CAST(ih.CreatedDateTime AS DATE) <= CAST(@toDate AS DATE)";
      request.input("toDate", sql.Date, toDate);
    }

    if (invoiceCode) {
      query += " AND ih.InvoiceCode = @invoiceCode";
      request.input("invoiceCode", sql.VarChar(50), invoiceCode.trim());
    }

    const result = await request.query(query);
    const records = result.recordset;

    const totalPrice = records.reduce(
      (sum, item) => (item.Quantity > 0 ? sum + (item.TotalPrice || 0) : sum),
      0
    );
    const totalQuantity = records.reduce(
      (sum, item) => (item.Quantity > 0 ? sum + (item.Quantity || 0) : sum),
      0
    );

    return {
      totalRecords: records.length,
      totalQuantity,
      totalPrice,
      salesHistory: records,
    };
  } catch (err) {
    console.error("Error fetching per item sales history in service:", err);
    throw err;
  }
};

module.exports = {
  getTodayYesterdaySales,
  getSalesHistory,
  getActiveSales,
  getFlashReport,
  downloadgetSalesHistory,
  generateHourlyReport,
  getPerItemSalesHistory,
};
