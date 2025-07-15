const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cek_stok')
        .setDescription('Cek stok produk (Admin only)')
        .addStringOption(option =>
            option.setName('produk')
                .setDescription('Nama produk (kosongkan untuk semua produk)')
                .setRequired(false)
                .setAutocomplete(true))
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

            if (productName) {
                // Show specific product stock
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

                const stockCount = await db.getStockCount(product.id);
                const stockStatus = stockCount > 0 ? '✅ Tersedia' : '❌ Habis';
                const stockColor = stockCount > 0 ? 0x00ff00 : 0xff0000;

                const embed = new EmbedBuilder()
                    .setTitle('📦 Detail Stok Produk')
                    .setDescription(`Informasi stok untuk produk **${product.name}**`)
                    .setColor(stockColor)
                    .addFields(
                        {
                            name: '📝 Nama Produk',
                            value: product.name,
                            inline: true
                        },
                        {
                            name: '💰 Harga',
                            value: `Rp ${product.price.toLocaleString()}`,
                            inline: true
                        },
                        {
                            name: '📦 Stok',
                            value: `${stockCount} kode`,
                            inline: true
                        },
                        {
                            name: '🔍 Status',
                            value: stockStatus,
                            inline: true
                        }
                    )
                    .setTimestamp();

                if (product.description) {
                    embed.addFields({
                        name: '📄 Deskripsi',
                        value: product.description,
                        inline: false
                    });
                }

                await interaction.reply({ embeds: [embed] });
            } else {
                // Show all products stock
                const products = await db.getProducts();

                if (products.length === 0) {
                    return await interaction.reply({
                        embeds: [{
                            title: '📦 Tidak Ada Produk',
                            description: 'Belum ada produk yang tersedia.',
                            color: 0xffaa00,
                            timestamp: new Date()
                        }],
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('📦 Stok Semua Produk')
                    .setDescription('Berikut adalah informasi stok untuk semua produk:')
                    .setColor(0x0099ff)
                    .setTimestamp();

                let totalProducts = 0;
                let totalStock = 0;
                let lowStockCount = 0;
                const lowStockThreshold = 5;

                for (const product of products) {
                    const stockCount = await db.getStockCount(product.id);
                    const stockStatus = stockCount > 0 ? '✅' : '❌';
                    const lowStock = stockCount <= lowStockThreshold && stockCount > 0;

                    if (lowStock) lowStockCount++;
                    totalProducts++;
                    totalStock += stockCount;

                    embed.addFields({
                        name: `${stockStatus} ${product.name}`,
                        value: `Stok: **${stockCount}** kode\nHarga: Rp ${product.price.toLocaleString()}${lowStock ? '\n⚠️ Stok rendah!' : ''}`,
                        inline: true
                    });
                }

                embed.addFields({
                    name: '📊 Ringkasan',
                    value: `Total Produk: ${totalProducts}\nTotal Stok: ${totalStock} kode\nStok Rendah: ${lowStockCount} produk`,
                    inline: false
                });

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in cek_stok command:', error);
            await interaction.reply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat mengecek stok.',
                    color: 0xff0000,
                    timestamp: new Date()
                }],
                ephemeral: true
            });
        }
    }
}; 