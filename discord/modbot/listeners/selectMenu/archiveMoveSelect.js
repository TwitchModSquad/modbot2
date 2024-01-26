const { StringSelectMenuInteraction, EmbedBuilder, codeBlock, cleanCodeBlockContent, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const utils = require("../../../../utils/");

const listener = {
    name: 'archiveMoveSelect',
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "archive-sort";
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const archiveMessage = await utils.Schemas.ArchiveMessage.findOne({message: interaction.message.id})
                .populate("entry");
        if (archiveMessage) {
            const archive = archiveMessage.entry;
            const channel = await global.client.modbot.channels.fetch(interaction.values[0]);

            channel.send(await archive.message()).then(message => {
                utils.Schemas.ArchiveMessage.create({
                    entry: archive._id,
                    channel: channel.id,
                    message: message.id,
                }).catch(console.error);

                interaction.message.delete().then(() => {
                    archiveMessage.deleteOne().catch(console.error);
                }, console.error);

                interaction.success(`Successfully moved archive entry to ${message.url}!`)
            });
        } else {
            interaction.error("Unable to resolve archive entry from message!");
        }
    }
};

module.exports = listener;
