const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saldo')
        .setDescription('Cek saldo Anda'),

    async execute(interaction, db) {
        try {
            const userId = interaction.user.id;
            const user = await db.getUser(userId);

            if (!user) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ User Tidak Ditemukan',
                        description: 'Terjadi kesalahan dengan data user Anda.',
                        color: 0xff0000,
                        timestamp: new Date()
                    }],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('💰 Saldo Anda')
                .setDescription(`**Rp ${user.balance.toLocaleString()}**`)
                .setColor(user.balance > 0 ? 0x00ff00 : 0xff9900)
                .addFields({
                    name: '💳 Cara Top-up',
                    value: 'Gunakan perintah `/topup <jumlah>` untuk menambah saldo',
                    inline: false
                })
                .setTimestamp()
                .setFooter({ text: `User: ${interaction.user.username}` });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error in saldo command:', error);
            await interaction.reply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat mengambil data saldo.',
                    color: 0xff0000,
                    timestamp: new Date()
                }],
                ephemeral: true
            });
        }
    }
}; 