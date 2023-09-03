const { StringSelectMenuInteraction } = require("discord.js");

const utils = require("../../../../utils/");
const { default: mongoose } = require("mongoose");

const listener = {
    name: 'archiveSelectMenu',
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "entry";
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const [, type] = interaction.component.customId.split("-");
        const id = interaction.values[0];

        try {
            const entry = await utils.Schemas.Archive.findById(new mongoose.Types.ObjectId(id));
            if (entry) {
                let embed = await entry.embed();
                interaction.reply({embeds: [embed], ephemeral: true});
            } else {
                interaction.error("Archive entry not found!");
            }
        } catch(err) {
            console.error(err);
            interaction.error("Archive entry not found!");
        }
    }
};

module.exports = listener;
