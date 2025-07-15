const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client, db) {
        if (!interaction.isAutocomplete()) return;

        const { commandName, options } = interaction;

        if (commandName === 'beli' || commandName === 'tambah_stok' || commandName === 'cek_stok') {
            const focusedOption = options.getFocused(true);

            if (focusedOption.name === 'produk') {
                try {
                    const products = await db.getProducts();
                    const filtered = products.filter(product =>
                        product.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                    );

                    const choices = filtered.slice(0, 25).map(product => ({
                        name: product.name,
                        value: product.name
                    }));

                    await interaction.respond(choices);
                } catch (error) {
                    console.error('Error in autocomplete:', error);
                    await interaction.respond([]);
                }
            }
        }
    }
}; 