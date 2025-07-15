const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('beli')
        .setDescription('Beli produk dengan saldo')
        .addStringOption(option =>
            option.setName('produk')
                .setDescription('Nama produk yang ingin dibeli')
                .setRequired(true)
                .setAutocomplete(true)),

    async execute(interaction, db) {
        try {
            const productName = interaction.options.getString('produk');
            const userId = interaction.user.id;

            await interaction.deferReply({ ephemeral: true });

            // Get user data
            const user = await db.getUser(userId);
            if (!user) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ User Tidak Ditemukan',
                        description: 'Terjadi kesalahan dengan data user Anda.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

            // Get product data
            const product = await db.getProduct(productName);
            if (!product) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Produk Tidak Ditemukan',
                        description: `Produk dengan nama "${productName}" tidak ditemukan.\nGunakan \`/produk\` untuk melihat daftar produk yang tersedia.`,
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

            // Check stock availability
            const stockCount = await db.getStockCount(product.id);
            if (stockCount === 0) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Stok Habis',
                        description: `Produk "${product.name}" sedang habis.\nSilakan coba lagi nanti atau pilih produk lain.`,
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

            // Check user balance
            if (user.balance < product.price) {
                const needed = product.price - user.balance;
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Saldo Tidak Mencukupi',
                        description: `Saldo Anda: **Rp ${user.balance.toLocaleString()}**\nHarga produk: **Rp ${product.price.toLocaleString()}**\nKurang: **Rp ${needed.toLocaleString()}**`,
                        color: 0xff0000,
                        timestamp: new Date(),
                        footer: { text: 'Gunakan /topup untuk menambah saldo' }
                    }]
                });
            }

            // Get available code
            const availableCode = await db.getAvailableCode(product.id);
            if (!availableCode) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Kode Tidak Tersedia',
                        description: 'Terjadi kesalahan saat mengambil kode produk.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

            // Process purchase
            await db.markCodeAsUsed(availableCode.id);
            await db.updateUserBalance(userId, -product.price);
            await db.createTransaction(
                userId,
                product.id,
                'purchase',
                product.price,
                availableCode.code
            );

            // Send code to user via DM
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🎉 Pembelian Berhasil!')
                    .setDescription(`Terima kasih telah membeli **${product.name}**`)
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '🔑 Kode Produk',
                            value: `\`\`\`${availableCode.code}\`\`\``,
                            inline: false
                        },
                        {
                            name: '💰 Harga',
                            value: `Rp ${product.price.toLocaleString()}`,
                            inline: true
                        },
                        {
                            name: '💳 Saldo Tersisa',
                            value: `Rp ${(user.balance - product.price).toLocaleString()}`,
                            inline: true
                        }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Simpan kode ini dengan baik!' });

                await interaction.user.send({ embeds: [dmEmbed] });

                // Give customer role if configured
                const customerRoleId = process.env.CUSTOMER_ROLE_ID;
                if (customerRoleId && interaction.guild) {
                    try {
                        const member = await interaction.guild.members.fetch(userId);
                        const role = await interaction.guild.roles.fetch(customerRoleId);
                        if (member && role && !member.roles.cache.has(customerRoleId)) {
                            await member.roles.add(role);
                        }
                    } catch (error) {
                        console.error('Error adding customer role:', error);
                    }
                }

            } catch (error) {
                console.error('Error sending DM:', error);
                // If DM fails, send code in reply (not ideal but better than losing the code)
                return await interaction.editReply({
                    embeds: [{
                        title: '⚠️ Pembelian Berhasil - DM Gagal',
                        description: `Pembelian berhasil, tetapi tidak dapat mengirim DM.\n\n**Kode Produk: ${product.name}**\n\`\`\`${availableCode.code}\`\`\`\n\n**Saldo Tersisa:** Rp ${(user.balance - product.price).toLocaleString()}`,
                        color: 0xffaa00,
                        timestamp: new Date(),
                        footer: { text: 'Pastikan DM terbuka untuk pembelian selanjutnya' }
                    }]
                });
            }

            // Send success message
            await interaction.editReply({
                embeds: [{
                    title: '✅ Pembelian Berhasil',
                    description: `Pembelian **${product.name}** berhasil!\nKode produk telah dikirim ke DM Anda.`,
                    color: 0x00ff00,
                    fields: [
                        {
                            name: '💰 Harga',
                            value: `Rp ${product.price.toLocaleString()}`,
                            inline: true
                        },
                        {
                            name: '💳 Saldo Tersisa',
                            value: `Rp ${(user.balance - product.price).toLocaleString()}`,
                            inline: true
                        }
                    ],
                    timestamp: new Date()
                }]
            });

            // Log to admin channel
            try {
                const channelId = process.env.LOG_CHANNEL_ID;
                if (channelId) {
                    const channel = await interaction.client.channels.fetch(channelId);
                    if (channel) {
                        await channel.send({
                            embeds: [{
                                title: '🛒 Pembelian Produk',
                                description: `User: <@${userId}>\nProduk: ${product.name}\nHarga: Rp ${product.price.toLocaleString()}\nSisa Stok: ${stockCount - 1}`,
                                color: 0x00ff00,
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
            console.error('Error in beli command:', error);

            const errorMessage = {
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat memproses pembelian.',
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