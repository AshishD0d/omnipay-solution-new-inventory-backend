const { poolPromise, sql } = require("../config/db");

// Service: fetch all products
const getAllProducts = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT * FROM Items where IsActive=1");
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Service: add a new product
const addProduct = async (product) => {
  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input("Name", sql.NVarChar(sql.MAX), product.Name);
    request.input("UPC", sql.VarChar(500), product.UPC);
    request.input(
      "Additional_Description",
      sql.NVarChar(sql.MAX),
      product.Additional_Description
    );
    request.input("ItemCost", sql.Decimal(12, 2), product.ItemCost || 0);
    request.input("ChargedCost", sql.Decimal(12, 2), product.ChargedCost || 0);
    request.input("Sales_Tax", sql.Bit, product.Sales_Tax || 0);
    request.input("InStock", sql.Int, product.InStock || 0);
    request.input("VendorName", sql.NVarChar(sql.MAX), product.VendorName);
    request.input("CaseCost", sql.Decimal(12, 2), product.CaseCost || 0);
    request.input("NumberInCase", sql.Int, product.NumberInCase || 0);
    request.input("SalesTax", sql.Decimal(20, 5), product.SalesTax || 0);
    request.input("QuickADD", sql.Bit, product.QuickADD || 0);
    request.input("DroppedItem", sql.Bit, product.DroppedItem || 0);
    request.input("EnableStockAlert", sql.Bit, product.EnableStockAlert || 0);
    request.input("StockAlertLimit", sql.Int, product.StockAlertLimit || 0);
    request.input("AltUPC", sql.VarChar(500), product.AltUPC || null);
    request.input("ImageUrl", sql.NVarChar(sql.MAX), product.ImageUrl || null);
    request.input("CategoryId", sql.Int, product.CategoryId);
    request.input("IsActive", sql.Bit, product.IsActive ?? 1);
    request.input("CostPerItem", sql.Decimal(18, 2), product.CostPerItem || 0);
    request.input("Pack", sql.Int, product.Pack || 0);
    request.input("IsManual", sql.Bit, product.IsManual || 0);

    const result = await request.query(`
      INSERT INTO Items (
          Name, UPC, Additional_Description, ItemCost, ChargedCost, Sales_Tax, InStock,
          VendorName, CaseCost, NumberInCase, SalesTax, QuickADD, DroppedItem,
          EnableStockAlert, StockAlertLimit, AltUPC, ImageUrl, CategoryId, IsActive,
          CreatedDate, CostPerItem, Pack, IsManual
        )
        VALUES (
          @Name, @UPC, @Additional_Description, @ItemCost, @ChargedCost, @Sales_Tax, @InStock,
          @VendorName, @CaseCost, @NumberInCase, @SalesTax, @QuickADD, @DroppedItem,
          @EnableStockAlert, @StockAlertLimit, @AltUPC, @ImageUrl, @CategoryId, @IsActive,
          GETDATE(), @CostPerItem, @Pack, @IsManual
        );
        SELECT SCOPE_IDENTITY() AS ItemID;
    `);
    const insertedItemID = result.recordset[0].ItemID;

    if (
      Array.isArray(product.BulkPricingTiers) &&
      product.BulkPricingTiers.length > 0
    ) {
      for (const tier of product.BulkPricingTiers) {
        const { Quantity, Pricing, DiscountType } = tier;
        const tierReq = pool.request();
        tierReq.input("ItemID", sql.Int, insertedItemID);
        tierReq.input("Quantity", sql.Int, Quantity);
        tierReq.input("Pricing", sql.Decimal(12, 2), Pricing);
        tierReq.input("DiscountType", sql.VarChar(50), DiscountType);
        await tierReq.query(`INSERT INTO BulkPricing (ItemID, Quantity, Pricing, DiscountType)
            VALUES (@ItemID, @Quantity, @Pricing, @DiscountType)
        `);
      }
    }
    return { ItemID: insertedItemID, ...product };
  } catch (err) {
    throw err;
  }
};

// Service: update an existing product
const updateProduct = async (product) => {
  let transaction;
  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    const request = new sql.Request(transaction);
    const salesTaxBit = (product.Sales_Tax === 1 || product.Sales_Tax === "1" || product.Sales_Tax === true) ? 1 : 0;
    
    request.input("ItemID", sql.Int, product.ItemID);
    request.input("Name", sql.NVarChar(sql.MAX), product.Name);
    request.input("UPC", sql.VarChar(500), product.UPC);
    request.input(
      "Additional_Description",
      sql.NVarChar(sql.MAX),
      product.Additional_Description
    );
    request.input("ItemCost", sql.Decimal(12, 2), product.ItemCost || 0);
    request.input("ChargedCost", sql.Decimal(12, 2), product.ChargedCost || 0);
    request.input("Sales_Tax", sql.Bit, salesTaxBit);
    request.input("InStock", sql.Int, product.InStock || 0);
    request.input("VendorName", sql.NVarChar(sql.MAX), product.VendorName);
    request.input("CaseCost", sql.Decimal(12, 2), product.CaseCost || 0);
    request.input("NumberInCase", sql.Int, product.NumberInCase || 0);
    request.input("SalesTax", sql.Decimal(20, 5), product.SalesTax || 0);
    request.input("QuickADD", sql.Bit, product.QuickADD || 0);
    request.input("DroppedItem", sql.Bit, product.DroppedItem || 0);
    request.input("EnableStockAlert", sql.Bit, product.EnableStockAlert || 0);
    request.input("StockAlertLimit", sql.Int, product.StockAlertLimit || 0);
    request.input("AltUPC", sql.VarChar(500), product.AltUPC || null);
    request.input("ImageUrl", sql.NVarChar(sql.MAX), product.ImageUrl || null);
    request.input("CategoryId", sql.Int, product.CategoryId);
    request.input("IsActive", sql.Bit, product.IsActive ?? 1);
    request.input("CostPerItem", sql.Decimal(18, 2), product.CostPerItem || 0);
    request.input("UpdatedBy", sql.NVarChar(100), product.UpdatedBy || "Admin");
    request.input("Pack", sql.Int, product.Pack || 0);
    request.input("IsManual", sql.Bit, product.IsManual || 0);

    await request.query(`
      UPDATE Items
      SET 
        Name = @Name,
        UPC = @UPC,
        Additional_Description = @Additional_Description,
        ItemCost = @ItemCost,
        ChargedCost = @ChargedCost,
        Sales_Tax = @Sales_Tax,
        InStock = @InStock,
        VendorName = @VendorName,
        CaseCost = @CaseCost,
        NumberInCase = @NumberInCase,
        SalesTax = @SalesTax,
        QuickADD = @QuickADD,
        DroppedItem = @DroppedItem,
        EnableStockAlert = @EnableStockAlert,
        StockAlertLimit = @StockAlertLimit,
        AltUPC = @AltUPC,
        ImageUrl = ISNULL(@ImageUrl, ImageUrl), 
        CategoryId = @CategoryId,
        IsActive = @IsActive,
        CostPerItem = @CostPerItem,
        UpdatedAt = GETDATE(),
        UpdatedBy = @UpdatedBy,
        Pack = @Pack,
        IsManual = @IsManual
      WHERE ItemID = @ItemID
    `);

    // Handle BulkPricing
    if (
      Array.isArray(product.BulkPricingTiers) &&
      product.BulkPricingTiers.length > 0
    ) {
      await new sql.Request(transaction)
        .input("ItemID", sql.Int, product.ItemID)
        .query(`DELETE FROM BulkPricing WHERE ItemID = @ItemID`);

      for (const tier of product.BulkPricingTiers) {
        await new sql.Request(transaction)
          .input("ItemID", sql.Int, product.ItemID)
          .input("Quantity", sql.Int, tier.Quantity)
          .input("Pricing", sql.Decimal(12, 2), tier.Pricing)
          .input("DiscountType", sql.VarChar(10), tier.DiscountType).query(`
            INSERT INTO BulkPricing (ItemID, Quantity, Pricing, DiscountType)
            VALUES (@ItemID, @Quantity, @Pricing, @DiscountType)
          `);
      }
    }
    await transaction.commit();
    return product;
  } catch (err) {
    if (transaction) await transaction.rollback();
    throw err;
  }
};

// Service: fetch all categories
const getAllCategories = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query(
        "SELECT CategoryID, Name, Description FROM CategoryMaster where Active=1"
      );
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Service: fetch categories with their products
const getCategoriesWithProducts = async (CategoryId) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().input("CategoryId", sql.Int, CategoryId)
      .query(`SELECT ItemID, Name 
        FROM Items 
        WHERE CategoryId = @CategoryId AND IsActive = 1
        ORDER BY Name`);
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Service: fetch product by ID
const getProductById = async (itemId) => {
  try {
    const pool = await poolPromise;
    const productResult = await pool.request().input("ItemID", sql.Int, itemId)
      .query(`
        SELECT 
          ItemID, Name, UPC, Additional_Description, ItemCost, ChargedCost,
          Sales_Tax, InStock, VendorName, CaseCost, NumberInCase, SalesTax,
          QuickADD, DroppedItem, EnableStockAlert, StockAlertLimit, AltUPC,
          ImageUrl, CategoryId, IsActive, CreatedDate, CostPerItem, UpdatedAt,
          UpdatedBy, Pack, IsManual
        FROM Items
        WHERE ItemID = @ItemID
      `);
    if (productResult.recordset.length === 0) {
      return null;
    }
    const product = productResult.recordset[0];
    const bulkPricingResult = await pool
      .request()
      .input("ItemID", sql.Int, itemId).query(`
        SELECT 
          BulkPricingID, ItemID, Quantity, Pricing, DiscountType
        FROM BulkPricing
        WHERE ItemID = @ItemID
        ORDER BY Quantity ASC
      `);
    product.BulkPricingTiers = bulkPricingResult.recordset;
    return product;
  } catch (err) {
    throw err;
  }
};

// Service: delete product by ID
const deleteProductById = async (itemId) => {
  try {
    const pool = await poolPromise;
    // Start transaction to keep data consistent
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // Delete BulkPricing tiers
      await new sql.Request(transaction)
        .input("ItemID", sql.Int, itemId)
        .query("DELETE FROM BulkPricing WHERE ItemID = @ItemID");
      // Delete Item
      const result = await new sql.Request(transaction)
        .input("ItemID", sql.Int, itemId)
        .query("DELETE FROM Items WHERE ItemID = @ItemID");

      await transaction.commit();
      return result.rowsAffected[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    throw err;
  }
};

// Service: fetch product names and IDs
const getproductNameandID = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT ItemID, Name FROM Items WHERE IsActive = 1 ORDER BY Name");
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Service: generate PDF of all items
const generateAllItemsPDF = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(` SELECT 
       i.ItemID AS id,
       i.Name AS ItemName ,
       i.UPC,
       i.ItemCost,
       i.ChargedCost,
       i.InStock,
       i.VendorName,
       i.CaseCost,
       i.NumberInCase,
       i.SalesTax,
       c.Name AS CategoryName,
       i.Pack,
       i.IsManual
     FROM Items i
     LEFT JOIN Categorymaster c ON i.CategoryID = c.CategoryID
     WHERE i.IsActive = 1
     ORDER BY i.Name`);
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  getAllProducts,
  addProduct,
  updateProduct,
  getAllCategories,
  getCategoriesWithProducts,
  getProductById,
  deleteProductById,
  getproductNameandID,
  generateAllItemsPDF,
};
