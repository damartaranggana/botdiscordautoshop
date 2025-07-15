const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tambah_stok')
        .setDescription('Tambah stok produk (Admin only)')
        .addStringOption(option =>
            option.setName('produk')
                .setDescription('Nama produk')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('kode')
                .setDescription('Kode-kode produk, pisahkan dengan koma (contoh: kode1,kode2,kode3)')
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

            const productName = interaction.options.getString('produk');
            const codesString = interaction.options.getString('kode');

            // Get product
            const product = await db.getProduct(productName);
            if (!product) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Produk Tidak Ditemukan',
                        description: `Produk dengan nama "${productName}" tidak ditemukan.`,
                        color: 0xff0000,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            // Parse codes
            const codes = codesString.split(',').map(code => code.trim()).filter(code => code.length > 0);

            if (codes.length === 0) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Kode Tidak Valid',
                        description: 'Tidak ada kode yang valid ditemukan.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            // Check for duplicate codes
            const uniqueCodes = [...new Set(codes)];
            if (uniqueCodes.length !== codes.length) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Kode Duplikat',
                        description: 'Ditemukan kode yang duplikat dalam input.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            // Get current stock count
            const currentStock = await db.getStockCount(product.id);

            // Add stock
            try {
                await db.addStock(product.id, uniqueCodes);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Stok Berhasil Ditambahkan')
                    .setDescription(`Berhasil menambahkan **${uniqueCodes.length}** kode ke produk **${product.name}**`)
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '📝 Produk',
                            value: product.name,
                            inline: true
                        },
                        {
                            name: '➕ Kode Ditambahkan',
                            value: uniqueCodes.length.toString(),
                            inline: true
                        },
                        {
                            name: '📦 Total Stok',
                            value: `${currentStock + uniqueCodes.length}`,
                            inline: true
                        }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Ditambahkan oleh: ${interaction.user.username}` });

                // Show sample of added codes (first 5)
                if (uniqueCodes.length > 0) {
                    const sampleCodes = uniqueCodes.slice(0, 5);
                    const sampleText = sampleCodes.map(code => `• ${code}`).join('\n');
                    const moreText = uniqueCodes.length > 5 ? `\n... dan ${uniqueCodes.length - 5} kode lainnya` : '';

                    embed.addFields({
                        name: '🔑 Contoh Kode',
                        value: `\`\`\`${sampleText}${moreText}\`\`\``,
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });

                // Log to admin channel
                try {
                    const channelId = process.env.LOG_CHANNEL_ID;
                    if (channelId) {
                        const channel = await interaction.client.channels.fetch(channelId);
                        if (channel) {
                            await channel.send({
                                embeds: [{
                                    title: '📦 Stok Ditambahkan',
                                    description: `Admin: <@${interaction.user.id}>\nProduk: ${product.name}\nKode Ditambahkan: ${uniqueCodes.length}\nTotal Stok: ${currentStock + uniqueCodes.length}`,
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
                console.error('Error adding stock:', error);
                await interaction.editReply({
                    embeds: [{
                        title: '❌ Error',
                        description: 'Terjadi kesalahan saat menambahkan stok. Mungkin ada kode yang sudah ada atau terjadi kesalahan database.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }]
                });
            }

        } catch (error) {
            console.error('Error in tambah_stok command:', error);

            const errorMessage = {
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat menambahkan stok.',
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