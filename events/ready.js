const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Set bot presence
        client.user.setPresence({
            activities: [{
                name: 'Toko Digital - /produk untuk melihat catalog',
                type: 3 // WATCHING
            }],
            status: 'online'
        });
    }
}; 