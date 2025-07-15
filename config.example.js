// Configuration example file
// Copy this to config.js and modify according to your needs

module.exports = {
    // Bot configuration
    bot: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID,
        presence: {
            activities: [{
                name: 'Toko Digital - /produk untuk melihat catalog',
                type: 3 // WATCHING
            }],
            status: 'online'
        }
    },

    // Tripay configuration
    tripay: {
        apiKey: process.env.TRIPAY_API_KEY,
        privateKey: process.env.TRIPAY_PRIVATE_KEY,
        merchantCode: process.env.TRIPAY_MERCHANT_CODE,
        callbackUrl: process.env.TRIPAY_CALLBACK_URL,
        baseUrl: 'https://tripay.co.id/api',
        sandboxBaseUrl: 'https://tripay.co.id/api-sandbox',
        isProduction: process.env.NODE_ENV === 'production'
    },

    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        endpoints: {
            health: '/health',
            tripayCallback: '/tripay/callback'
        }
    },

    // Database configuration
    database: {
        path: process.env.DB_PATH || './database/store.db',
        backupPath: './backups/',
        autoBackup: true,
        backupInterval: '0 2 * * *' // Daily at 2 AM
    },

    // Role configuration
    roles: {
        admin: process.env.ADMIN_ROLE_ID,
        customer: process.env.CUSTOMER_ROLE_ID
    },

    // Channel configuration
    channels: {
        log: process.env.LOG_CHANNEL_ID
    },

    // Store configuration
    store: {
        currency: 'IDR',
        currencySymbol: 'Rp',
        minTopupAmount: 10000,
        maxTopupAmount: 10000000,
        lowStockThreshold: 5,
        defaultPaymentMethod: 'QRIS'
    },

    // Cron jobs configuration
    cron: {
        backup: '0 2 * * *', // Daily at 2 AM
        stockCheck: '0 * * * *' // Every hour
    },

    // Embed colors
    colors: {
        success: 0x00ff00,
        error: 0xff0000,
        warning: 0xffaa00,
        info: 0x0099ff,
        primary: 0x0099ff
    },

    // Embed limits
    limits: {
        fieldValueLength: 1024,
        descriptionLength: 4096,
        titleLength: 256,
        footerLength: 2048,
        authorLength: 256,
        fieldsPerEmbed: 25
    }
}; 