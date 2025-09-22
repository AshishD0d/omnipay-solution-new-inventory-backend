
const { poolPromise, sql } = require("../config/db");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

// Auth middleware
 const userAuth = async (req, res, next) => {
  try {

    // 1. Get token from headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Please login" });
    }
    const token = authHeader.split(" ")[1];

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userCode = decoded.userCode;

    // 3. Query MSSQL to check user
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("UserCode", sql.Int, userCode)
      .query("SELECT * FROM Users WHERE UserCode = @UserCode");

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.recordset[0];

    // 4. Attach user to request
    req.user = user;
    next();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { userAuth };
