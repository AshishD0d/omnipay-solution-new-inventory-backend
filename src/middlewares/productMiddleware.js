const { poolPromise, sql } = require("../config/db");

const validateProduct = async (req, res, next) => {
  try {
    let { ItemID, Name, UPC } = req.body;

    if (!Name || !UPC) {
      return res.status(400).json({
        success: false,
        message: "Name and UPC are required",
      });
    }

    // Ensure ItemID is integer
    ItemID = ItemID ? parseInt(ItemID, 10) : null;

    const pool = await poolPromise;
    let query = `
      SELECT ItemID 
      FROM Items 
      WHERE (Name = @Name OR UPC = @UPC)
    `;

    if (ItemID) {
      query += ` AND ItemID <> @ItemID`;
    }

    const request = pool.request()
      .input("Name", sql.NVarChar, Name.trim())
      .input("UPC", sql.VarChar, UPC.trim());

    if (ItemID) {
      request.input("ItemID", sql.Int, ItemID);
    }

    const result = await request.query(query);

    if (result.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Another product with same Name or UPC already exists",
      });
    }

    next();
  } catch (err) {
    console.error("Validation error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = { validateProduct };
