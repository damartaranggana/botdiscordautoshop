const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TripayService = require('../utils/tripay');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cek_transaksi')
        .setDescription('Cek status transaksi Tripay')
        .addStringOption(option =>
            option.setName('referensi')
                .setDescription('Referensi transaksi Tripay')
                .setRequired(true)),

    async execute(interaction, db) {
        try {
            const reference = interaction.options.getString('referensi');

            await interaction.deferReply({ ephemeral: true });

            // Get topup request from database
            const topupRequest = await db.getTopupRequest(reference);
            if (!topupRequest) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Transaksi Tidak Ditemukan',
                        description: `Transaksi dengan referensi "${reference}" tidak ditemukan.`,
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

            // Check if user owns this transaction
            if (topupRequest.user_id !== interaction.user.id) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Akses Ditolak',
                        description: 'Anda tidak memiliki akses untuk melihat transaksi ini.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

            // Get transaction detail from Tripay
            const tripay = new TripayService();

            if (!tripay.isConfigured()) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Sistem Pembayaran Tidak Tersedia',
                        description: 'Sistem pembayaran sedang dalam perbaikan.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

            let tripayDetail = null;
            try {
                tripayDetail = await tripay.getTransactionDetail(reference);
            } catch (error) {
                console.error('Error fetching from Tripay:', error);
            }

            // Prepare status information
            let statusText = '';
            let statusColor = 0xffaa00;
            let statusEmoji = '⏳';

            switch (topupRequest.status) {
                case 'pending':
                    statusText = 'Menunggu Pembayaran';
                    statusColor = 0xffaa00;
                    statusEmoji = '⏳';
                    break;
                case 'paid':
                    statusText = 'Pembayaran Berhasil';
                    statusColor = 0x00ff00;
                    statusEmoji = '✅';
                    break;
                case 'expired':
                    statusText = 'Transaksi Kadaluarsa';
                    statusColor = 0xff0000;
                    statusEmoji = '⏰';
                    break;
                case 'failed':
                    statusText = 'Pembayaran Gagal';
                    statusColor = 0xff0000;
                    statusEmoji = '❌';
                    break;
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Status Transaksi')
                .setDescription(`Informasi transaksi dengan referensi **${reference}**`)
                .setColor(statusColor)
                .addFields(
                    {
                        name: '📋 Referensi',
                        value: `\`${reference}\``,
                        inline: true
                    },
                    {
                        name: '💰 Jumlah',
                        value: `Rp ${topupRequest.amount.toLocaleString()}`,
                        inline: true
                    },
                    {
                        name: '🔍 Status',
                        value: `${statusEmoji} ${statusText}`,
                        inline: true
                    },
                    {
                        name: '📅 Dibuat',
                        value: `<t:${Math.floor(new Date(topupRequest.created_at).getTime() / 1000)}:R>`,
                        inline: true
                    },
                    {
                        name: '🔄 Diperbarui',
                        value: `<t:${Math.floor(new Date(topupRequest.updated_at).getTime() / 1000)}:R>`,
                        inline: true
                    }
                )
                .setTimestamp();

            // Add payment link if still pending
            if (topupRequest.status === 'pending') {
                embed.addFields({
                    name: '🔗 Link Pembayaran',
                    value: `[Klik di sini untuk membayar](${topupRequest.tripay_checkout_url})`,
                    inline: false
                });
            }

            // Add Tripay detail if available
            if (tripayDetail && tripayDetail.success) {
                const tripayData = tripayDetail.data;

                embed.addFields({
                    name: '📊 Detail Tripay',
                    value: `**Status**: ${tripayData.status}\n**Metode**: ${tripayData.payment_method}\n**Dibayar**: ${tripayData.paid_at ? new Date(tripayData.paid_at * 1000).toLocaleString('id-ID') : 'Belum dibayar'}`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in cek_transaksi command:', error);

            const errorMessage = {
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat mengecek transaksi.',
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