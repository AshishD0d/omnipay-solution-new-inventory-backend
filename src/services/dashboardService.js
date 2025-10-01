const { poolPromise, sql } = require("../config/db");

// Service to fetch live sales trend data
const getLiveSalesTrend = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
    SELECT
    RIGHT('00' + CAST((DATEPART(HOUR, CreatedDateTime) / 2) * 2 AS VARCHAR), 2) 
        + ':00' AS InvoiceTime,           
    SUM(GrandTotal) AS TotalAmount,
    SUM(TotalQty) AS TotalItems
    FROM InvoiceHeader
    WHERE IsVoided = 0
      AND CAST(CreatedDateTime AS DATE) = CAST(GETDATE() AS DATE)
    GROUP BY (DATEPART(HOUR, CreatedDateTime) / 2) * 2
    ORDER BY (DATEPART(HOUR, CreatedDateTime) / 2) * 2;
    `);
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Service to fetch top selling items today
const getTopSellingItemsToday = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT TOP (5)
        IL.ItemId,
        IL.ItemName,
        SUM(IL.Quantity) AS TotalQty
        FROM InvoiceLine IL
        INNER JOIN InvoiceHeader IH ON IL.InvoiceId = IH.InvoiceId
        WHERE IH.IsVoided = 0
        GROUP BY IL.ItemId, IL.ItemName
        ORDER BY TotalQty DESC;
    `);
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

module.exports = { getLiveSalesTrend, getTopSellingItemsToday };
