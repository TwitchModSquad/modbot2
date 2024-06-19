const { StringSelectMenuInteraction, EmbedBuilder, codeBlock, cleanCodeBlockContent, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const utils = require("../../../../utils/");

const listener = {
    name: 'crossbanTwitch',
    streamerCache: {},
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("cb-t-");
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const userId = interaction.component.customId.split("-")[2];
        let user = null;

        try {
            user = await utils.Twitch.getUserById(userId, false, true);
        } catch(e) {
            return interaction.error("Unable to get user!");
        }

        listener.streamerCache[interaction.user.id] = interaction.values;

        interaction.showModal(
            new ModalBuilder()
                .setCustomId(interaction.component.customId)
                .setTitle(`Crossban ${user.display_name}`)
                .setComponents(
                    new ActionRowBuilder()
                        .setComponents(
                            new TextInputBuilder()
                                .setCustomId("reason")
                                .setLabel("Reason")
                                .setPlaceholder("This reason is sent to Twitch and is viewable by the user")
                                .setMinLength(3)
                                .setMaxLength(64)
                                .setRequired(false)
                                .setStyle(TextInputStyle.Short)
                        )
                )
        )
    }
};

module.exports = listener;
