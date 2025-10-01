const { poolPromise, sql } = require("../config/db");

// Service: fetch low stock items
const getLowStockItems = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT ItemID, Name, UPC, ItemCost, ChargedCost, InStock, StockAlertLimit
      FROM Items
      WHERE EnableStockAlert = 1
        AND InStock <= StockAlertLimit
        AND IsActive = 1`);
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Service: fetch droped items
const getDropedItems = async () => {
  try {
    const pool = await poolPromise;
    const query = `
      SELECT 
          IH.InvoiceCode,
          IL.ItemId,
          IL.ItemName,
          IT.UPC,
          CM.Name AS Category,
          IL.Price,
          IL.Quantity,
          IL.Total AS TotalPrice,
          IH.VoidedBy,
          IH.VoidedOn,
          IH.UserName AS BilledBy
      FROM InvoiceLine IL
      INNER JOIN InvoiceHeader IH ON IL.InvoiceId = IH.InvoiceId
      LEFT JOIN Items IT ON IL.ItemId = IT.ItemID
      LEFT JOIN CategoryMaster CM ON IT.CategoryId = CM.CategoryID
      WHERE IH.IsVoided = 1
      ORDER BY IH.VoidedOn DESC;
    `;

    const result = await pool.request().query(query);

    return {
      count: result.recordset.length,
      data: result.recordset,
    };
  } catch (err) {
    throw err;
  }
};

// Service: fetch total inventory count
const getTotalInventory = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT count(*) as TotalInventoryCount
      FROM Items
        WHERE IsActive = 1`);
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Service: fetch inventory tracking data
const getInventoryTrackingData = async ({
  trackingType,
  productID,
  fromDate,
  toDate,
}) => {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("productID", sql.Int, productID || null);
    request.input(
      "FromDate",
      sql.DateTime,
      fromDate ? new Date(fromDate) : null
    );
    request.input("ToDate", sql.DateTime, toDate ? new Date(toDate) : null);

    let query = "";
    if (trackingType === "Sales") {
      query = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY i.SoldDateTime DESC) AS SrNo,
          i.InvoiceCode,
          i.ItemName,
          i.SoldQty,
          i.SoldPrice,
          i.TotalPrice,
          i.Discount,
          i.Tax,
          i.SoldBy,
          i.SoldDateTime
        FROM ItemSales_Audit i
        WHERE 
          (@ProductID IS NULL OR i.ItemID = @ProductID)
          AND (@FromDate IS NULL OR i.SoldDateTime >= @FromDate)
          AND (@ToDate IS NULL OR i.SoldDateTime <= @ToDate)
      `;
    } else if (trackingType === "Quantity") {
      query = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY q.ModifiedDate DESC) AS SrNo,
          it.Name AS ItemName,
          q.OldQty,
          q.NewQty,
          q.ModifiedDate,
          q.ModifiedBy
        FROM ItemQty_Audit q
        INNER JOIN Items it ON it.ItemID = q.ItemID
        WHERE 
          (@ProductID IS NULL OR it.ItemID  = @ProductID)
          AND (@FromDate IS NULL OR q.ModifiedDate >= @FromDate)
          AND (@ToDate IS NULL OR q.ModifiedDate <= @ToDate)
      `;
    } else if (trackingType === "Price") {
      query = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY p.ModifiedDate DESC) AS SrNo,
          ISNULL(it.Name, 'Unknown Item') AS ItemName,
          p.OldChargedCost,
          p.NewChargedCost,
          p.ModifiedDate,
          p.ModifiedBy
        FROM Items_Audit p
        LEFT JOIN Items it ON it.ItemID = p.ItemID
        WHERE 
          (@ProductID IS NULL OR p.ItemID = @ProductID)
          AND (@FromDate IS NULL OR p.ModifiedDate >= @FromDate)
          AND (@ToDate IS NULL OR p.ModifiedDate <= @ToDate)
      `;
    } else {
      throw new Error("Invalid trackingType. Allowed: Sales, Quantity, Price");
    }
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Service: void an invoice
const toVoidInvoice = async (InvoiceCode, VoidedBy) => {
  try {
    const pool = await poolPromise;
     // Step 1: Find InvoiceId
    const invoiceResult = await pool
      .request()
      .input("InvoiceCode", sql.NVarChar, InvoiceCode)
      .query("SELECT InvoiceId FROM InvoiceHeader WHERE InvoiceCode = @InvoiceCode");

    if (invoiceResult.recordset.length === 0) {
      return { message: "Invoice not found" };
    }

    const invoiceId = invoiceResult.recordset[0].InvoiceId;

    // Step 2: Update InvoiceHeader
    await pool
      .request()
      .input("InvoiceId", sql.Int, invoiceId)
      .input("VoidedBy", sql.NVarChar, VoidedBy)
      .query(`
        UPDATE InvoiceHeader
        SET IsVoided = 1, VoidedOn = GETDATE(), VoidedBy = @VoidedBy
        WHERE InvoiceId = @InvoiceId
      `);

    // Step 3: Update DroppedItem for Items
    await pool
      .request()
      .input("InvoiceId", sql.Int, invoiceId)
      .query(`
        UPDATE i
        SET i.DroppedItem = ISNULL(i.DroppedItem, 0) + il.Quantity
        FROM Items i
        INNER JOIN InvoiceLine il ON i.ItemID = il.ItemId
        WHERE il.InvoiceId = @InvoiceId
      `);

    return { success: true };
  } catch (err) {
    throw err;
  }
};


module.exports = {
  getLowStockItems,
  getDropedItems,
  getTotalInventory,
  getInventoryTrackingData,
  toVoidInvoice,
};
