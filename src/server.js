const express = require('express');
const path = require('path');
const cookiesParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
// require('dotenv').config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookiesParser());
app.use("/uploads/images", express.static(path.join(__dirname, "uploads/images")));

// Test route
app.get('/ping', (req, res) => {
    res.send('API is running...');
});

// Main routes index
const routes = require('./routes/index');
app.use('/api', routes);




// Start server
const port = process.env.PORT || 3000;
 app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}...`);
});
  
process.removeAllListeners('warning');

