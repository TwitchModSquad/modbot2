const { ButtonInteraction, EmbedBuilder, ActionRowBuilder } = require("discord.js");
const utils = require("../../../../utils");

const listener = {
    name: 'crossbanDiscord',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ButtonInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("cb-d-");
    },
    /**
     * Listener for a button press
     * @param {ButtonInteraction} interaction 
     */
    async listener (interaction) {
        interaction.error("Not yet implemented");
    }
};

module.exports = listener;
