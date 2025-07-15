const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TripayService = require('../utils/tripay');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topup')
        .setDescription('Top-up saldo menggunakan Tripay')
        .addIntegerOption(option =>
            option.setName('jumlah')
                .setDescription('Jumlah saldo yang ingin di top-up (minimal Rp 10.000)')
                .setRequired(true)
                .setMinValue(10000)),

    async execute(interaction, db) {
        try {
            const amount = interaction.options.getInteger('jumlah');
            const userId = interaction.user.id;
            const userName = interaction.user.username;

            // Check minimum amount
            if (amount < 10000) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Jumlah Tidak Valid',
                        description: 'Jumlah minimal top-up adalah Rp 10.000',
                        color: 0xff0000,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            // Check maximum amount (optional limit)
            if (amount > 10000000) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Jumlah Terlalu Besar',
                        description: 'Jumlah maksimal top-up adalah Rp 10.000.000',
                        color: 0xff0000,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            // Create Tripay transaction
            const tripay = new TripayService();

            if (!tripay.isConfigured()) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Sistem Pembayaran Tidak Tersedia',
                        description: 'Sistem pembayaran sedang dalam perbaikan. Silakan coba lagi nanti.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

            const transaction = await tripay.createTransaction(amount, userId, userName);

            if (!transaction.success) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Gagal Membuat Transaksi',
                        description: transaction.message || 'Terjadi kesalahan saat membuat transaksi.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

            // Save topup request to database
            await db.createTopupRequest(
                userId,
                amount,
                transaction.data.reference,
                transaction.data.checkout_url
            );

            const embed = new EmbedBuilder()
                .setTitle('💰 Top-up Saldo')
                .setDescription(`Top-up sebesar **Rp ${amount.toLocaleString()}** telah dibuat!`)
                .setColor(0x0099ff)
                .addFields(
                    {
                        name: '📋 Referensi',
                        value: `\`${transaction.data.reference}\``,
                        inline: true
                    },
                    {
                        name: '💳 Metode Pembayaran',
                        value: 'QRIS',
                        inline: true
                    },
                    {
                        name: '⏰ Expired',
                        value: `<t:${transaction.data.expired_time}:R>`,
                        inline: true
                    },
                    {
                        name: '🔗 Link Pembayaran',
                        value: `[Klik di sini untuk membayar](${transaction.data.checkout_url})`,
                        inline: false
                    },
                    {
                        name: '📱 Cara Pembayaran',
                        value: '1. Klik link pembayaran di atas\n2. Scan QR Code dengan aplikasi e-wallet\n3. Konfirmasi pembayaran\n4. Saldo akan otomatis ditambahkan',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Transaksi akan expired dalam 24 jam' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in topup command:', error);

            const errorMessage = {
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat membuat transaksi top-up.',
                    color: 0xff0000,
                    timestamp: new Date()
                }]
            };

            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply({ ...errorMessage, ephemeral: true });
            }
        }
    }
}; 