const { ButtonInteraction, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const listener = {
    name: 'groupAddUser',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ButtonInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("group-useradd-");
    },
    /**
     * Listener for a button press
     * @param {ButtonInteraction} interaction 
     */
    async listener (interaction) {
        interaction.showModal(
            new ModalBuilder()
                .setCustomId(interaction.component.customId)
                .setTitle("Add Group Users")
                .setComponents(
                    new ActionRowBuilder()
                        .setComponents(
                            new TextInputBuilder()
                                .setCustomId("users")
                                .setLabel("Twitch Users")
                                .setMinLength(3)
                                .setMaxLength(512)
                                .setPlaceholder("Twitch Users - Separate users with new lines")
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                        )
                )
        );
    }
};

module.exports = listener;
