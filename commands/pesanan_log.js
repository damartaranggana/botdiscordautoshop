const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pesanan_log')
        .setDescription('Lihat log transaksi (Admin only)')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Jumlah transaksi yang ditampilkan (default: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(50))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, db) {
        try {
            // Check if user has admin role
            const adminRoleId = process.env.ADMIN_ROLE_ID;
            if (adminRoleId && !interaction.member.roles.cache.has(adminRoleId)) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Akses Ditolak',
                        description: 'Anda tidak memiliki izin untuk menggunakan perintah ini.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            const limit = interaction.options.getInteger('limit') || 10;

            await interaction.deferReply();

            // Get transactions
            const transactions = await db.getTransactions(limit);

            if (transactions.length === 0) {
                return await interaction.editReply({
                    embeds: [{
                        title: '📋 Tidak Ada Transaksi',
                        description: 'Belum ada transaksi yang tercatat.',
                        color: 0xffaa00,
                        timestamp: new Date()
                    }]
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Log Transaksi')
                .setDescription(`Menampilkan ${transactions.length} transaksi terakhir`)
                .setColor(0x0099ff)
                .setTimestamp();

            let totalRevenue = 0;
            const transactionsByType = {
                purchase: 0,
                topup: 0,
                admin_add: 0
            };

            // Group transactions by type for summary
            transactions.forEach(transaction => {
                if (transaction.type === 'purchase') {
                    totalRevenue += transaction.amount;
                }
                transactionsByType[transaction.type]++;
            });

            // Add transaction details
            for (const transaction of transactions) {
                const date = new Date(transaction.created_at);
                const formattedDate = date.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                let transactionInfo = '';
                let emoji = '';
                let color = '';

                switch (transaction.type) {
                    case 'purchase':
                        emoji = '🛒';
                        color = 'purchase';
                        transactionInfo = `**Pembelian**: ${transaction.product_name || 'Unknown'}\n**User**: <@${transaction.user_id}>\n**Harga**: Rp ${transaction.amount.toLocaleString()}`;
                        break;
                    case 'topup':
                        emoji = '💰';
                        color = 'topup';
                        transactionInfo = `**Top-up Saldo**\n**User**: <@${transaction.user_id}>\n**Jumlah**: Rp ${transaction.amount.toLocaleString()}`;
                        if (transaction.tripay_reference) {
                            transactionInfo += `\n**Ref**: ${transaction.tripay_reference}`;
                        }
                        break;
                    case 'admin_add':
                        emoji = '⚙️';
                        color = 'admin';
                        transactionInfo = `**Admin Add Balance**\n**User**: <@${transaction.user_id}>\n**Jumlah**: ${transaction.amount >= 0 ? '+' : ''}Rp ${transaction.amount.toLocaleString()}`;
                        break;
                }

                embed.addFields({
                    name: `${emoji} ${formattedDate}`,
                    value: transactionInfo,
                    inline: true
                });
            }

            // Add summary
            embed.addFields({
                name: '📊 Ringkasan',
                value: `🛒 Pembelian: ${transactionsByType.purchase}\n💰 Top-up: ${transactionsByType.topup}\n⚙️ Admin Add: ${transactionsByType.admin_add}\n💵 Total Revenue: Rp ${totalRevenue.toLocaleString()}`,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in pesanan_log command:', error);

            const errorMessage = {
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat mengambil log transaksi.',
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