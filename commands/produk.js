const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('produk')
        .setDescription('Tampilkan daftar produk yang tersedia'),

    async execute(interaction, db) {
        try {
            const products = await db.getProducts();

            if (products.length === 0) {
                return await interaction.reply({
                    embeds: [{
                        title: '📦 Produk Tidak Tersedia',
                        description: 'Belum ada produk yang tersedia saat ini.',
                        color: 0xffaa00,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🛒 Daftar Produk')
                .setDescription('Berikut adalah daftar produk yang tersedia:')
                .setColor(0x0099ff)
                .setTimestamp();

            for (const product of products) {
                const stockCount = await db.getStockCount(product.id);
                const stockStatus = stockCount > 0 ? `✅ ${stockCount} tersedia` : '❌ Habis';

                embed.addFields({
                    name: `${product.name}`,
                    value: `💰 Harga: **Rp ${product.price.toLocaleString()}**\n📦 Stok: ${stockStatus}${product.description ? `\n📝 ${product.description}` : ''}`,
                    inline: true
                });
            }

            embed.addFields({
                name: '📋 Cara Pembelian',
                value: '1. Top-up saldo dengan `/topup <jumlah>`\n2. Beli produk dengan `/beli <nama_produk>`\n3. Kode akan dikirim via DM',
                inline: false
            });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in produk command:', error);
            await interaction.reply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat mengambil data produk.',
                    color: 0xff0000,
                    timestamp: new Date()
                }],
                ephemeral: true
            });
        }
    }
}; 