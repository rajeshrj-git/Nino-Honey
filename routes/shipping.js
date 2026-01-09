const express = require('express');
const router = express.Router();
const axios = require('axios');

const EMAIL = process.env.SHIPROCKET_EMAIL;
const PASSWORD = process.env.SHIPROCKET_PASSWORD;

let token = null;

async function getAuthToken() {
    if (token) return token;

    try {
        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: EMAIL,
            password: PASSWORD
        });
        token = response.data.token;
        return token;
    } catch (error) {
        console.error('Shiprocket Auth Error:', error.message);
        throw new Error('Failed to authenticate with Shiprocket');
    }
}

async function createShiprocketOrder(orderData) {
    // Logic extracted from route
    const t = await getAuthToken();
    const shiprocketOrder = {
        order_id: orderData.orderNumber,
        order_date: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
        pickup_location: "Primary",
        billing_customer_name: orderData.customerName,
        billing_last_name: "",
        billing_address: orderData.customerAddress,
        billing_city: orderData.customerCity || "Chennai", // Fallback or update frontend to send city
        billing_pincode: orderData.customerPincode || "600001",
        billing_state: orderData.customerState,
        billing_country: "India",
        billing_email: orderData.customerEmail,
        billing_phone: orderData.customerPhone,
        shipping_is_billing: true,
        order_items: orderData.items.map(item => ({
            name: item.id,
            sku: item.size,
            units: item.quantity,
            selling_price: item.price
        })),
        payment_method: "Prepaid",
        sub_total: orderData.totalAmount,
        length: 10, breadth: 10, height: 10, weight: 0.5
    };

    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', shiprocketOrder, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${t}`
        }
    });

    return response.data;
}

router.post('/create-order', async (req, res) => {
    try {
        const orderData = req.body;
        const data = await createShiprocketOrder(orderData);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Shiprocket Create Order Error:', error.response ? error.response.data : error.message);
        res.status(500).json({
            success: false,
            error: error.response ? error.response.data : error.message
        });
    }
});

router.get('/track/:orderId', async (req, res) => {
    try {
        const t = await getAuthToken();
        const { orderId } = req.params; // Shiprocket Order ID or AWB

        const response = await axios.get(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${t}`
            }
        });

        res.json({ success: true, data: response.data });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
