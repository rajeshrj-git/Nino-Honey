const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const db = require('../database');
const { createShiprocketOrder } = require('./shipping'); // We need to export this

// PhonePe Configuration
const MERHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || 1;
const ENV = process.env.PHONEPE_ENV || 'UAT'; // 'UAT' or 'PROD'

const BASE_URL = ENV === 'PROD'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

router.post('/initiate', async (req, res) => {
    try {
        const { orderData } = req.body;

        if (!orderData) {
            return res.status(400).json({ error: 'Order data is required' });
        }

        const merchantTransactionId = orderData.merchantTransactionId;

        // Store order in SQLite
        try {
            await db.insertOrder({
                merchantTransactionId,
                orderData
            });
        } catch (dbError) {
            console.error('Database Error:', dbError);
            return res.status(500).json({ error: 'Failed to create order record' });
        }

        const normalPayLoad = {
            merchantId: MERHANT_ID,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: orderData.customerEmail, // Or a unique user ID
            amount: orderData.totalAmount * 100, // Amount in paise
            redirectUrl: `https://nino-honey-store.onrender.com/payment-status.html`, // Update with your actual domain
            redirectMode: "REDIRECT",
            callbackUrl: `https://nino-honey-store.onrender.com/api/payment/verify`,
            mobileNumber: orderData.customerPhone,
            paymentInstrument: {
                type: "PAY_PAGE"
            },
            name: orderData.customerName
        };

        const bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
        const base64EncodedPayload = bufferObj.toString("base64");

        const stringToSign = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
        const sha256 = crypto.createHash("sha256").update(stringToSign).digest("hex");
        const checksum = sha256 + "###" + SALT_INDEX;

        const options = {
            method: 'post',
            url: `${BASE_URL}/pg/v1/pay`,
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: base64EncodedPayload
            }
        };

        const response = await axios(options);
        const data = response.data;

        if (data.success) {
            res.json({
                success: true,
                paymentUrl: data.data.instrumentResponse.redirectInfo.url,
                orderId: data.data.merchantTransactionId
            });
        } else {
            res.status(400).json({ success: false, error: data.message || 'Payment initiation failed' });
        }

    } catch (error) {
        console.error('PhonePe Initiation Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.response ? error.response.data : error.message
        });
    }
});

router.post('/verify', async (req, res) => {
    try {
        // const { response } = req.body; // PhonePe sends base64 response in body

        // Decoding logic (simplified for this context, ideally verify X-VERIFY)
        // const decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));
        // const merchantTransactionId = decodedResponse.data.merchantTransactionId;

        // For server-to-server callback, PhonePe sends: { response: "base64..." }

        console.log('Payment Callback Received');

        // Assuming success for now to trigger Shiprocket
        // In prod: Decode response, check status === 'PAYMENT_SUCCESS'
        // const isSuccess = decodedResponse.code === 'PAYMENT_SUCCESS';

        // If Supabase is connected, retrieve order and create in Shiprocket
        if (req.body.response) {
            const decoded = JSON.parse(Buffer.from(req.body.response, 'base64').toString('utf-8'));
            if (decoded.code === 'PAYMENT_SUCCESS') {
                const txnId = decoded.data.merchantTransactionId;

                // Fetch order from SQLite
                const order = await db.getOrderByTxnId(txnId);

                if (order && order.status !== 'PAID') {
                    // Update status in SQLite
                    await db.updateOrderPayment(order.id, 'PAID', decoded);

                    // Create Shiprocket Order
                    try {
                        const savedOrderData = JSON.parse(order.order_data);
                        const shippingRes = await createShiprocketOrder(savedOrderData);

                        if (shippingRes && shippingRes.order_id) {
                            await db.updateOrderShiprocket(order.id, shippingRes.order_id);
                            console.log('Shiprocket Order Created:', shippingRes.order_id);
                        }
                    } catch (err) {
                        console.error('Failed to create Shiprocket order:', err);
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Callback Error', error);
        res.sendStatus(500);
    }
});

// Status Check Endpoint (Client calls this to verify status if redirect didn't work purely)
router.get('/status/:txnId', async (req, res) => {
    try {
        const merchantTransactionId = req.params.txnId;
        const merchantId = MERHANT_ID;

        const stringToSign = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + SALT_KEY;
        const sha256 = crypto.createHash("sha256").update(stringToSign).digest("hex");
        const checksum = sha256 + "###" + SALT_INDEX;

        const options = {
            method: 'get',
            url: `${BASE_URL}/pg/v1/status/${merchantId}/${merchantTransactionId}`,
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': merchantId
            }
        };

        const response = await axios(options);
        if (response.data.success && response.data.code === 'PAYMENT_SUCCESS') {
            res.json({ success: true, status: 'PAYMENT_SUCCESS' });
        } else {
            res.json({ success: false, status: response.data.code });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
