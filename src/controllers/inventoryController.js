const inventoryService = require("../services/inventoryService");

// Controller to get low stock items with alert number
const lowStockAlert = async (req, res) => {
  try {
    const lowStockItems = await inventoryService.getLowStockItems();
    res.status(200).json({
      success: true,
      message:
        lowStockItems.length > 0
          ? "Low stock items fetched successfully"
          : "No low stock items found",
      LowStockCount: lowStockItems.length,
      LowStockItems: lowStockItems,
    });
  } catch (err) {
    console.error("Error fetching low stock items:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to get droped items
const dropedItems = async (req, res) => {
  try {
    const dropedItems = await inventoryService.getDropedItems();
    res.status(200).json({
      success: true,
      message:
        dropedItems.data.length > 0
          ? "Dropped items fetched successfully"
          : "No dropped items found",
      DropItemCount: dropedItems.length,
      DropedItems: dropedItems,
    });
  } catch (err) {
    console.error("Error fetching low stock items:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to get total inventory number
const totalInventory = async (req, res) => {
  try {
    const totalCount = await inventoryService.getTotalInventory();
    res.status(200).json({
      success: true,
      message:
        dropedItems.length > 0
          ? "Total Inventory fetched successfully"
          : "No Total Inventory found",
      TotalInventoryCount: totalCount[0].TotalInventoryCount,
    });
  } catch (err) {
    console.error("Error fetching Total Inventory Number:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller to get inventory tracking data
const inventoryTracking = async (req, res) => {
  try {
    const { trackingType, productID, fromDate, toDate } = req.body;
    if (!trackingType) {
      return res.status(400).json({
        success: false,
        message: "trackingType is required (Sales, Quantity, Price)",
      });
    }
    const trackingData = await inventoryService.getInventoryTrackingData({
      trackingType,
      productID,
      fromDate,
      toDate,
    });
    if (!trackingData || trackingData.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No tracking data found",
        count: 0,
        data: [],
      });
    }
    res.status(200).json({
      success: true,
      message: "Inventory tracking data fetched successfully",
      count: trackingData.length,
      data: trackingData,
    });
  } catch (err) {
    console.error("Error fetching inventory tracking data:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Controller to void an invoice
const voideInvoice = async (req, res) => {
  try {
    const { InvoiceCode, VoidedBy } = req.body;
    if (!InvoiceCode  || !VoidedBy) {
      return res.status(400).json({
        success: false,
        message: "InvoiceCode and VoidedBy is required",
      });
    }
    const result = await inventoryService.toVoidInvoice(InvoiceCode, VoidedBy);
    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Invoice voided successfully",
      });
    }
  } catch (err) {
    console.error("Error voiding invoice:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  lowStockAlert,
  dropedItems,
  totalInventory,
  inventoryTracking,
  voideInvoice,
};
