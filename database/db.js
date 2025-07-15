const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        const dbPath = process.env.DB_PATH || './database/store.db';
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        const tables = [
            // Users table for balance and user info
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                balance INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Products table
            `CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                price INTEGER NOT NULL,
                description TEXT,
                active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Stock table for product codes
            `CREATE TABLE IF NOT EXISTS stock (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                used BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`,

            // Transactions table
            `CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                product_id INTEGER,
                type TEXT NOT NULL, -- 'purchase', 'topup', 'admin_add'
                amount INTEGER NOT NULL,
                code_given TEXT,
                tripay_reference TEXT,
                status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`,

            // Topup requests table
            `CREATE TABLE IF NOT EXISTS topup_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                tripay_reference TEXT UNIQUE NOT NULL,
                tripay_checkout_url TEXT NOT NULL,
                status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'failed'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Settings table
            `CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        tables.forEach(table => {
            this.db.run(table, (err) => {
                if (err) {
                    console.error('Error creating table:', err);
                }
            });
        });
    }

    // User methods
    async getUser(discordId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE discord_id = ?',
                [discordId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async createUser(discordId, username) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO users (discord_id, username) VALUES (?, ?)',
                [discordId, username],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateUserBalance(discordId, amount) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?',
                [amount, discordId],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async setUserBalance(discordId, amount) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?',
                [amount, discordId],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Product methods
    async getProducts() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM products WHERE active = 1',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getProduct(name) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM products WHERE name = ? AND active = 1',
                [name],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async createProduct(name, price, description = '') {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO products (name, price, description) VALUES (?, ?, ?)',
                [name, price, description],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async deleteProduct(name) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE products SET active = 0 WHERE name = ?',
                [name],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Stock methods
    async getStockCount(productId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT COUNT(*) as count FROM stock WHERE product_id = ? AND used = 0',
                [productId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    }

    async addStock(productId, codes) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO stock (product_id, code) VALUES (?, ?)');

            let completed = 0;
            let errors = [];

            codes.forEach(code => {
                stmt.run([productId, code], function (err) {
                    if (err) errors.push(err);
                    completed++;

                    if (completed === codes.length) {
                        stmt.finalize();
                        if (errors.length > 0) {
                            reject(errors);
                        } else {
                            resolve(codes.length);
                        }
                    }
                });
            });
        });
    }

    async getAvailableCode(productId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM stock WHERE product_id = ? AND used = 0 ORDER BY id ASC LIMIT 1',
                [productId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async markCodeAsUsed(codeId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE stock SET used = 1 WHERE id = ?',
                [codeId],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async removeCode(productId, code) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM stock WHERE product_id = ? AND code = ? AND used = 0',
                [productId, code],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Transaction methods
    async createTransaction(userId, productId, type, amount, codeGiven = null, tripayRef = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO transactions (user_id, product_id, type, amount, code_given, tripay_reference, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, productId, type, amount, codeGiven, tripayRef, 'completed'],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getTransactions(limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT t.*, p.name as product_name FROM transactions t LEFT JOIN products p ON t.product_id = p.id ORDER BY t.created_at DESC LIMIT ?',
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    // Topup methods
    async createTopupRequest(userId, amount, tripayRef, checkoutUrl) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO topup_requests (user_id, amount, tripay_reference, tripay_checkout_url) VALUES (?, ?, ?, ?)',
                [userId, amount, tripayRef, checkoutUrl],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getTopupRequest(tripayRef) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM topup_requests WHERE tripay_reference = ?',
                [tripayRef],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async updateTopupStatus(tripayRef, status) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE topup_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE tripay_reference = ?',
                [status, tripayRef],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

module.exports = Database; 