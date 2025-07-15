const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tambah_produk')
        .setDescription('Tambah produk baru (Admin only)')
        .addStringOption(option =>
            option.setName('nama')
                .setDescription('Nama produk')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('harga')
                .setDescription('Harga produk (dalam Rupiah)')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('deskripsi')
                .setDescription('Deskripsi produk (opsional)')
                .setRequired(false))
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

            const name = interaction.options.getString('nama');
            const price = interaction.options.getInteger('harga');
            const description = interaction.options.getString('deskripsi') || '';

            // Check if product already exists
            const existingProduct = await db.getProduct(name);
            if (existingProduct) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Produk Sudah Ada',
                        description: `Produk dengan nama "${name}" sudah ada.`,
                        color: 0xff0000,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            // Create new product
            await db.createProduct(name, price, description);

            const embed = new EmbedBuilder()
                .setTitle('✅ Produk Berhasil Ditambahkan')
                .setDescription(`Produk **${name}** telah berhasil ditambahkan ke katalog!`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '📝 Nama Produk',
                        value: name,
                        inline: true
                    },
                    {
                        name: '💰 Harga',
                        value: `Rp ${price.toLocaleString()}`,
                        inline: true
                    },
                    {
                        name: '📦 Stok',
                        value: '0 (gunakan `/tambah_stok` untuk menambah stok)',
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: `Ditambahkan oleh: ${interaction.user.username}` });

            if (description) {
                embed.addFields({
                    name: '📄 Deskripsi',
                    value: description,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed] });

            // Log to admin channel
            try {
                const channelId = process.env.LOG_CHANNEL_ID;
                if (channelId) {
                    const channel = await interaction.client.channels.fetch(channelId);
                    if (channel) {
                        await channel.send({
                            embeds: [{
                                title: '➕ Produk Baru Ditambahkan',
                                description: `Admin: <@${interaction.user.id}>\nProduk: ${name}\nHarga: Rp ${price.toLocaleString()}`,
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
            console.error('Error in tambah_produk command:', error);
            await interaction.reply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat menambahkan produk.',
                    color: 0xff0000,
                    timestamp: new Date()
                }],
                ephemeral: true
            });
        }
    }
}; 