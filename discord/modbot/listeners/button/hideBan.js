const { ButtonInteraction } = require("discord.js");
const utils = require("../../../../utils");

const listener = {
    name: 'hideBan',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ButtonInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "hide-ban";
    },
    /**
     * Listener for a button press
     * @param {ButtonInteraction} interaction 
     */
    async listener (interaction) {
        
    }
};

module.exports = listener;
