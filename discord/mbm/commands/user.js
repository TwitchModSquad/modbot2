const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");

const utils = require("../../../utils");

const command = {
    data: new SlashCommandBuilder()
        .setName("user")
        .setDescription("Looks up Twitch or Discord user information")
        .addStringOption(x => x
            .setName("twitch")
            .setDescription("The Twitch username to look up")
            .setMinLength(3)
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addUserOption(x => x
            .setName("discord")
            .setDescription("The Discord user to look up")
            .setRequired(false)
        )
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const twitchUser = interaction.options.getString("twitch", false);
        const discordUser = interaction.options.getUser("discord");

        let user;
        if (twitchUser) {
            user = await utils.Twitch.getUserByName(twitchUser, true);
        } else if (discordUser) {
            user = await utils.Discord.getUserById(discordUser.id);
        } else {
            return interaction.error("A Discord user or a Twitch user must be specified!");
        }

        interaction.reply({embeds: [await user.embed()], ephemeral: true});
    }
};

module.exports = command;
