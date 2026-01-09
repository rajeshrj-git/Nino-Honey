const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'orders.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create tables if they don't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_transaction_id TEXT UNIQUE NOT NULL,
        order_data TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        shiprocket_order_id TEXT,
        payment_details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Helper Function: Insert Order
function insertOrder(order) {
    return new Promise((resolve, reject) => {
        const { merchantTransactionId, orderData } = order;
        const sql = `INSERT INTO orders (merchant_transaction_id, order_data) VALUES (?, ?)`;

        db.run(sql, [merchantTransactionId, JSON.stringify(orderData)], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID });
            }
        });
    });
}

// Helper Function: Get Order by Transaction ID
function getOrderByTxnId(txnId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM orders WHERE merchant_transaction_id = ?`;
        db.get(sql, [txnId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Helper Function: Update Order Status
function updateOrderPayment(id, status, paymentDetails) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE orders SET status = ?, payment_details = ? WHERE id = ?`;
        db.run(sql, [status, JSON.stringify(paymentDetails), id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Helper Function: Update Shiprocket ID
function updateOrderShiprocket(id, shiprocketId) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE orders SET shiprocket_order_id = ? WHERE id = ?`;
        db.run(sql, [shiprocketId, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    db,
    insertOrder,
    getOrderByTxnId,
    updateOrderPayment,
    updateOrderShiprocket
};
