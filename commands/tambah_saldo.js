const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tambah_saldo')
        .setDescription('Tambah saldo user secara manual (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan ditambahkan saldonya')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('jumlah')
                .setDescription('Jumlah saldo yang akan ditambahkan')
                .setRequired(true))
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

            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('jumlah');

            // Check if amount is valid
            if (amount === 0) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Jumlah Tidak Valid',
                        description: 'Jumlah tidak boleh 0.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            // Get user data
            let user = await db.getUser(targetUser.id);
            if (!user) {
                // Create user if doesn't exist
                await db.createUser(targetUser.id, targetUser.username);
                user = await db.getUser(targetUser.id);
            }

            const oldBalance = user.balance;
            const newBalance = oldBalance + amount;

            // Update user balance
            await db.updateUserBalance(targetUser.id, amount);

            // Create transaction record
            await db.createTransaction(
                targetUser.id,
                null,
                'admin_add',
                amount,
                null,
                null
            );

            const embed = new EmbedBuilder()
                .setTitle('✅ Saldo Berhasil Ditambahkan')
                .setDescription(`Saldo user ${targetUser.username} berhasil ${amount > 0 ? 'ditambahkan' : 'dikurangi'}!`)
                .setColor(amount > 0 ? 0x00ff00 : 0xff9900)
                .addFields(
                    {
                        name: '👤 User',
                        value: `<@${targetUser.id}>`,
                        inline: true
                    },
                    {
                        name: `${amount > 0 ? '➕' : '➖'} Jumlah`,
                        value: `Rp ${Math.abs(amount).toLocaleString()}`,
                        inline: true
                    },
                    {
                        name: '💰 Saldo Lama',
                        value: `Rp ${oldBalance.toLocaleString()}`,
                        inline: true
                    },
                    {
                        name: '💳 Saldo Baru',
                        value: `Rp ${newBalance.toLocaleString()}`,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: `Oleh: ${interaction.user.username}` });

            await interaction.reply({ embeds: [embed] });

            // Notify the user
            try {
                const userNotificationEmbed = new EmbedBuilder()
                    .setTitle('💰 Saldo Diperbarui')
                    .setDescription(`Saldo Anda telah ${amount > 0 ? 'ditambahkan' : 'dikurangi'} sebesar **Rp ${Math.abs(amount).toLocaleString()}**`)
                    .setColor(amount > 0 ? 0x00ff00 : 0xff9900)
                    .addFields(
                        {
                            name: '💳 Saldo Baru',
                            value: `Rp ${newBalance.toLocaleString()}`,
                            inline: true
                        }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Diperbarui oleh admin' });

                await targetUser.send({ embeds: [userNotificationEmbed] });
            } catch (error) {
                console.error('Error sending notification to user:', error);
            }

            // Log to admin channel
            try {
                const channelId = process.env.LOG_CHANNEL_ID;
                if (channelId) {
                    const channel = await interaction.client.channels.fetch(channelId);
                    if (channel) {
                        await channel.send({
                            embeds: [{
                                title: '💰 Saldo Manual Update',
                                description: `Admin: <@${interaction.user.id}>\nUser: <@${targetUser.id}>\nJumlah: ${amount > 0 ? '+' : ''}Rp ${amount.toLocaleString()}\nSaldo Baru: Rp ${newBalance.toLocaleString()}`,
                                color: 0x0099ff,
                                timestamp: new Date(),
                                footer: { text: 'Store Bot Log' }
                            }]
                        });
                    }
                }
            } catch (error) {
                console.error('Error logging to admin channel:', error);
            }

        } catch (error) {
            console.error('Error in tambah_saldo command:', error);
            await interaction.reply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat menambahkan saldo.',
                    color: 0xff0000,
                    timestamp: new Date()
                }],
                ephemeral: true
            });
        }
    }
}; 