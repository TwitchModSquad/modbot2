const { StringSelectMenuInteraction } = require("discord.js");
const mongoose = require("mongoose");

const utils = require("../../../../utils/");

const listener = {
    name: 'banSelect',
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "ban";
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        let ban;
        try {
            ban = await utils.Schemas.TwitchBan.findById(new mongoose.Types.ObjectId(interaction.values[0]))
                .populate("streamer").populate("chatter");
        } catch(err) {
            console.error(err);
            interaction.error(`Unable to retrieve ban ID ${interaction.values[0]}!`);
            return;
        }
        let message = await ban.message();
        message.ephemeral = true;
        interaction.reply(message).catch(console.error);
    }
};

module.exports = listener;
