const dashboardService = require("../services/dashboardService");

// Controller to fetch live sales trend data
const liveSalesTrend = async (req, res) => {
  try {
    const data = await dashboardService.getLiveSalesTrend();
    res.status(200).json({
      success: true,
      message: data.length > 0 ? "Live sales trend fetched successfully" : "No sales data found",
      chartName: "Live Sales Trend",
      data: data.map(row => ({
        time: row.InvoiceTime,
        amount: parseFloat(row.TotalAmount),
        totalItems: row.TotalItems
      }))
    });
  } catch (err) {
    console.error("Error fetching live sales trend:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Controller to fetch top selling items today
const topSellingItemsToday = async (req, res) => {
  try {
    const data = await dashboardService.getTopSellingItemsToday();  
    res.status(200).json({
      success: true,
      message: data.length > 0 ? "Top selling items fetched successfully" : "No sales data found",
      chartName: "Top Selling Items Today",
      data: data.map(row => ({
        itemName: row.ItemName,
        totalQty: row.TotalQty,
      }))
    });
  } catch (err) {
    console.error("Error fetching top selling items:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};







module.exports = { liveSalesTrend, topSellingItemsToday };
