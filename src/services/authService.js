const { poolPromise, sql } = require('../config/db');
const jwt = require('jsonwebtoken');

// Service: handle DB operation for login
 const login = async (username, password) => {
	try {
		const pool = await poolPromise;
		const result = await pool.request()
			.input('username', sql.VarChar, username)
			.input('password', sql.VarChar, password)
            .input('userRole', sql.VarChar, 'Admin')
			.query('SELECT TOP 1 * FROM Users WHERE username = @username AND password = @password');
		return result.recordset[0] || null;
	} catch (err) {
		throw err;
	}
};

// Service: generate JWT token
 const generateToken = (user) => {
    try {
        const payload = {
            username: user.UserName,
            userCode: user.UserCode,
            userRole: user.UserRole,
        };
        const secret = process.env.JWT_SECRET;
        const options = { expiresIn: '7d' };
        return jwt.sign(payload, secret, options);
    } catch (err) {
        throw err;
    }
};

module.exports = { login, generateToken };