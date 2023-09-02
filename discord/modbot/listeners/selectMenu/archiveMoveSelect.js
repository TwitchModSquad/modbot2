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
            const users = await archive.getUsers();
            const channel = await global.client.modbot.channels.fetch(interaction.values[0]);

            const components = [];
            let buttons = [];

            for (let i = 0; i < users.length; i++) {
                if (users[i].twitchUser) {
                    const user = users[i].twitchUser;
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`cb-t-${user._id}`)
                            .setLabel(`Crossban ${user.display_name}`)
                            .setStyle(ButtonStyle.Danger)
                    );
                } else if (users[i].discordUser) {
                    const user = users[i].discordUser;
                    buttons.push(
                        new ButtonBuilder()
                            .setCustomId(`cb-d-${user._id}`)
                            .setLabel(`Crossban ${user.displayName}`)
                            .setStyle(ButtonStyle.Danger)
                    );
                }
                if (buttons.length >= 5) {
                    components.push(
                        new ActionRowBuilder()
                            .setComponents(buttons)
                    );
                    buttons = [];
                }
            }

            components.push(
                new ActionRowBuilder()
                    .setComponents(buttons)
            );

            channel.send({components: buttons.length > 0 ? components : null, embeds: [await archive.embed()]}).then(message => {
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
