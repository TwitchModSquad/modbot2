const { ButtonInteraction, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, codeBlock, cleanCodeBlockContent, ButtonBuilder, ButtonStyle } = require("discord.js");
const utils = require("../../../../utils");

const listener = {
    name: 'hideBanButton',
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
        const banMessage = await utils.Schemas.DiscordMessage.findById(interaction.message.id)
            .populate("twitchBan");

        if (!banMessage || !banMessage.twitchBan) {
            return interaction.error("No ban record found for this message!");
        }
        
        await interaction.showModal(
            new ModalBuilder()
                .setCustomId("hide-ban")
                .setTitle("Hide Ban")
                .addComponents(
                    new ActionRowBuilder()
                        .addComponents(
                            new TextInputBuilder()
                                .setCustomId("reason")
                                .setLabel("Reason")
                                .setPlaceholder("Joke ban")
                                .setMinLength(3)
                                .setMaxLength(64)
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        )
                )
        );

        interaction.awaitModalSubmit({time:120000}).then(async modalInteract => {
            const reason = modalInteract.fields.getTextInputValue("reason");
            const banMessages = await utils.Schemas.DiscordMessage.find({twitchBan: banMessage.twitchBan});
            for (let i = 0; i < banMessages.length; i++) {
                const banMsg = banMessages[i];
                try {
                    const message = await banMsg.getMessage();
                    await message.delete();
                    await banMsg.deleteOne();
                } catch(err) {
                    console.error(err);
                }
            }
            const hideReasonEmbed = new EmbedBuilder()
                .setTitle("Hidden Ban Reason")
                .setDescription(`Hidden by <@${interaction.user.id}>` + codeBlock(cleanCodeBlockContent(reason)));

            const reinstateButton = new ButtonBuilder()
                .setCustomId("reinstate-ban")
                .setLabel("Reinstate")
                .setStyle(ButtonStyle.Primary);

            const discordMessage = await banMessage.twitchBan.message(false, false, null);
            discordMessage.components = [
                new ActionRowBuilder()
                    .setComponents(reinstateButton)
            ];
            discordMessage.embeds.push(hideReasonEmbed);

            utils.Discord.channels.ban.hide.send(discordMessage).then(msg => {
                utils.Schemas.DiscordMessage.create({
                    _id: msg.id,
                    channel: msg.channel.id,
                    guild: msg.guildId,
                    twitchBan: banMessage.twitchBan,
                }).catch(console.error);
            }, console.error);
            modalInteract.success("Successfully hid ban message!");
        }, console.error);
    }
};

module.exports = listener;
