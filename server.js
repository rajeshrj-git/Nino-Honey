const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const paymentRoutes = require('./routes/payment');
const shippingRoutes = require('./routes/shipping');

app.use('/api/payment', paymentRoutes);
app.use('/api/shipping', shippingRoutes);

// Catch-all route to serve index.html for SPA-like behavior (optional, but good for static sites)
// For now, since it's just static htmls, we rely on static middleware.
// If specific htmls need to be served on specific routes, we can add them here.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
