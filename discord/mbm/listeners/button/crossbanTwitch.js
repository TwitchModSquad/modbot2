const { ButtonInteraction, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, StringSelectMenuBuilder } = require("discord.js");
const utils = require("../../../../utils");

const listener = {
    name: 'crossbanTwitch',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ButtonInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("cb-t-");
    },
    /**
     * Listener for a button press
     * @param {ButtonInteraction} interaction 
     */
    async listener (interaction) {
        const embed = new EmbedBuilder()
            .setTitle("Select the streamers you'd like to crossban in")
            .setDescription("This list shows active streamers authenticated with TMS. All selected streamers will crossban this user utilizing *your* account.")
            .setColor(0xe83b3b);

        const discordUser = await utils.Discord.getUserById(interaction.user.id, true);

        if (!discordUser?.identity?.authenticated)
            return interaction.error("You have not authenticated with TMS! Do so [here](https://tms.to/join)");

        const twitchUsers = await discordUser.identity.getTwitchUsers();
        const streamers = await discordUser.identity.getStreamers();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(interaction.component.customId)
            .setPlaceholder("Select channels to carry out the crossban in")
            .setMinValues(1)
            .setMaxValues(twitchUsers.length + streamers.length)
            .setOptions([
                ...twitchUsers.map(x => {return {label: x.display_name, value: x._id}}),
                ...streamers.map(x => {return {label: x.streamer.display_name, value: x.streamer._id}}),
            ]);

        interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder()
                    .setComponents(selectMenu)
            ],
            ephemeral: true,
        });
    }
};

module.exports = listener;
