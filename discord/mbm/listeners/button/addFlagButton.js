const { ButtonInteraction, EmbedBuilder, ActionRowBuilder } = require("discord.js");
const utils = require("../../../../utils");

const listener = {
    name: 'addFlagButton',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ButtonInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "flag";
    },
    /**
     * Listener for a button press
     * @param {ButtonInteraction} interaction 
     */
    async listener (interaction) {
        const message = await utils.Schemas.DiscordMessage.findById(interaction.message.id)
            .populate("twitchBan");
        const chatter = await utils.Twitch.getUserById(message.twitchBan.chatter);

        const embed = new EmbedBuilder()
            .setColor(0x772ce8)
            .setTitle("Add Flags to User")
            .setDescription(`Use the select menu below to add flags to \`${chatter.display_name}\`.`);

        interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder()
                    .setComponents(await utils.flagSelect(chatter))
            ],
            ephemeral: true,
        });
    }
};

module.exports = listener;
