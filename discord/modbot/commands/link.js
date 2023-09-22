const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, codeBlock } = require("discord.js");

const utils = require("../../../utils");

const command = {
    data: new SlashCommandBuilder()
        .setName("link")
        .setDescription("Links a Twitch & Discord account")
        .addStringOption(x => x
            .setName("twitch")
            .setDescription("The Twitch username to link")
            .setMinLength(3)
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addUserOption(x => x
            .setName("discord")
            .setDescription("The Discord user to link")
            .setRequired(true)
        )
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const twitchUser = interaction.options.getString("twitch", true);
        const discordUser = interaction.options.getUser("discord", true);

        try {
            const twitch = await utils.Twitch.getUserByName(twitchUser, true);
            const discord = await utils.Discord.getUserById(discordUser.id, false, true);

            const identity = await utils.consolidateIdentites([twitch], [discord]);
            const twitchUsers = await identity.getTwitchUsers();
            const discordUsers = await identity.getDiscordUsers();

            const embed = new EmbedBuilder()
                .setTitle("Identity Consolidated!")
                .setDescription("Identity was successfully consolidated.")
                .setColor(0x772ce8)
                .setFields({
                    name: `Twitch User${twitchUsers.length === 1 ? "" : "s"} (${twitchUsers.length})`,
                    value: codeBlock(twitchUsers.map(x => x.display_name).join("\n")),
                    inline: true,
                }, {
                    name: `Discord User${discordUsers.length === 1 ? "" : "s"} (${discordUsers.length})`,
                    value: codeBlock(discordUsers.map(x => x.globalName).join("\n")),
                    inline: true,
                });

            interaction.reply({embeds: [embed], ephemeral: true});
        } catch (err) {
            interaction.error("An error occurred: " + err);
        }
    }
};

module.exports = command;
