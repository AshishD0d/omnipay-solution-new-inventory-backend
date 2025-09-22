const sql = require('mssql');
// const dotenv = require('dotenv');
// dotenv.config();
require("dotenv").config();
// dotenv.config({ path: './.env' });


const config = {
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	server: process.env.DB_SERVER, 
	database: process.env.DB_DATABASE,
	options: {
		encrypt: true, 
		trustServerCertificate: true 
	}
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("✅ Database Connected Successfully");
    return pool;
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed:", err.message);
    throw err;
  });

module.exports = { sql, poolPromise };