const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client, db) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            // Ensure user exists in database
            await ensureUserExists(db, interaction.user.id, interaction.user.username);

            // Pass database instance to command
            await command.execute(interaction, db);
        } catch (error) {
            console.error('Error executing command:', error);

            const errorMessage = {
                embeds: [{
                    title: '❌ Error',
                    description: 'Terjadi kesalahan saat menjalankan perintah ini.',
                    color: 0xff0000,
                    timestamp: new Date()
                }],
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
};

async function ensureUserExists(db, userId, username) {
    try {
        let user = await db.getUser(userId);
        if (!user) {
            await db.createUser(userId, username);
        }
    } catch (error) {
        console.error('Error ensuring user exists:', error);
    }
} 