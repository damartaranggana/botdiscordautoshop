const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const express = require('express');
const Database = require('./database/db');
const TripayService = require('./utils/tripay');
const cron = require('node-cron');
require('dotenv').config();

class DiscordBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages
            ]
        });

        this.client.commands = new Collection();
        this.db = new Database();
        this.tripay = new TripayService();
        this.app = express();

        this.init();
    }

    init() {
        this.setupExpress();
        this.loadCommands();
        this.loadEvents();
        this.setupCronJobs();
        this.login();
    }

    setupExpress() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Tripay callback endpoint
        this.app.post('/tripay/callback', async (req, res) => {
            try {
                const { reference, status } = req.body;

                // Verify the callback signature
                if (!this.tripay.verifyCallback(req.body, req.headers['x-callback-signature'])) {
                    return res.status(401).json({ error: 'Invalid signature' });
                }

                // Process the callback
                await this.processTripayCallback(reference, status);
                res.json({ success: true });
            } catch (error) {
                console.error('Tripay callback error:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });

        const PORT = process.env.PORT || 3000;
        this.app.listen(PORT, () => {
            console.log(`Express server running on port ${PORT}`);
        });
    }

    async processTripayCallback(reference, status) {
        const topupRequest = await this.db.getTopupRequest(reference);
        if (!topupRequest) {
            console.error('Topup request not found:', reference);
            return;
        }

        if (status === 'PAID') {
            // Update user balance
            await this.db.updateUserBalance(topupRequest.user_id, topupRequest.amount);
            await this.db.updateTopupStatus(reference, 'paid');

            // Create transaction record
            await this.db.createTransaction(
                topupRequest.user_id,
                null,
                'topup',
                topupRequest.amount,
                null,
                reference
            );

            // Notify user
            try {
                const user = await this.client.users.fetch(topupRequest.user_id);
                if (user) {
                    await user.send({
                        embeds: [{
                            title: '💰 Top-up Berhasil!',
                            description: `Saldo Anda telah ditambahkan sebesar **Rp ${topupRequest.amount.toLocaleString()}**`,
                            color: 0x00ff00,
                            timestamp: new Date(),
                            footer: {
                                text: `Referensi: ${reference}`
                            }
                        }]
                    });
                }
            } catch (error) {
                console.error('Failed to notify user:', error);
            }

            // Log to admin channel
            this.logToAdminChannel('topup', {
                user_id: topupRequest.user_id,
                amount: topupRequest.amount,
                reference: reference
            });
        } else if (status === 'EXPIRED' || status === 'FAILED') {
            await this.db.updateTopupStatus(reference, status.toLowerCase());
        }
    }

    async loadCommands() {
        const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
        const commands = [];

        for (const file of commandFiles) {
            const filePath = join(__dirname, 'commands', file);
            const command = require(filePath);

            if (command.data && command.execute) {
                this.client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
            }
        }

        // Register slash commands
        this.registerSlashCommands(commands);
    }

    async registerSlashCommands(commands) {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error('Error registering commands:', error);
        }
    }

    loadEvents() {
        const eventFiles = readdirSync(join(__dirname, 'events')).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = join(__dirname, 'events', file);
            const event = require(filePath);

            if (event.once) {
                this.client.once(event.name, (...args) => event.execute(...args, this.client, this.db));
            } else {
                this.client.on(event.name, (...args) => event.execute(...args, this.client, this.db));
            }
        }
    }

    setupCronJobs() {
        // Daily backup (every day at 2 AM)
        cron.schedule('0 2 * * *', () => {
            this.createBackup();
        });

        // Check stock levels (every hour)
        cron.schedule('0 * * * *', () => {
            this.checkStockLevels();
        });
    }

    async createBackup() {
        try {
            const fs = require('fs');
            const path = require('path');
            const moment = require('moment');

            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const backupPath = path.join(__dirname, 'backups', `backup_${timestamp}.db`);

            // Create backups directory if it doesn't exist
            if (!fs.existsSync(path.dirname(backupPath))) {
                fs.mkdirSync(path.dirname(backupPath), { recursive: true });
            }

            // Copy database file
            fs.copyFileSync(process.env.DB_PATH || './database/store.db', backupPath);

            console.log(`Backup created: ${backupPath}`);
        } catch (error) {
            console.error('Backup failed:', error);
        }
    }

    async checkStockLevels() {
        try {
            const products = await this.db.getProducts();
            const lowStockThreshold = 5;

            for (const product of products) {
                const stockCount = await this.db.getStockCount(product.id);

                if (stockCount <= lowStockThreshold) {
                    this.logToAdminChannel('low_stock', {
                        product_name: product.name,
                        stock_count: stockCount
                    });
                }
            }
        } catch (error) {
            console.error('Stock check failed:', error);
        }
    }

    async logToAdminChannel(type, data) {
        const channelId = process.env.LOG_CHANNEL_ID;
        if (!channelId) return;

        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) return;

            let embed = {
                timestamp: new Date(),
                footer: { text: 'Store Bot Log' }
            };

            switch (type) {
                case 'purchase':
                    embed.title = '🛒 Pembelian Produk';
                    embed.description = `User: <@${data.user_id}>\nProduk: ${data.product_name}\nHarga: Rp ${data.amount.toLocaleString()}`;
                    embed.color = 0x00ff00;
                    break;
                case 'topup':
                    embed.title = '💰 Top-up Berhasil';
                    embed.description = `User: <@${data.user_id}>\nJumlah: Rp ${data.amount.toLocaleString()}\nReferensi: ${data.reference}`;
                    embed.color = 0x0099ff;
                    break;
                case 'low_stock':
                    embed.title = '⚠️ Stok Rendah';
                    embed.description = `Produk: ${data.product_name}\nSisa stok: ${data.stock_count}`;
                    embed.color = 0xff9900;
                    break;
            }

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to log to admin channel:', error);
        }
    }

    login() {
        this.client.login(process.env.DISCORD_TOKEN);
    }
}

// Initialize bot
const bot = new DiscordBot();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    bot.db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down bot...');
    bot.db.close();
    process.exit(0);
}); 