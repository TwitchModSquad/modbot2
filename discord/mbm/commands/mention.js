const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const utils = require("../../../utils");

const command = {
    data: new SlashCommandBuilder()
        .setName("mention")
        .setDescription("Sends a mention to all moderators of specified streamer(s)")
        .addStringOption(x => x
            .setName("streamer-1")
            .setDescription("A streamer to mention the moderators of")
            .setMinLength(3)
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addStringOption(x => x
            .setName("streamer-2")
            .setDescription("A streamer to mention the moderators of")
            .setMinLength(3)
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addStringOption(x => x
            .setName("streamer-3")
            .setDescription("A streamer to mention the moderators of")
            .setMinLength(3)
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addStringOption(x => x
            .setName("streamer-4")
            .setDescription("A streamer to mention the moderators of")
            .setMinLength(3)
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addStringOption(x => x
            .setName("streamer-5")
            .setDescription("A streamer to mention the moderators of")
            .setMinLength(3)
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(false)
        )
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const streamers = [];

        for (let i = 1; i < 6; i++) {
            const streamerName = interaction.options.getString(`streamer-${i}`, false);
            if (!streamerName) continue;

            try {
                streamers.push(await utils.Twitch.getUserByName(streamerName, true));
            } catch(err) {
                return interaction.error(`Unable to find streamer with name \`${streamerName}\`!`);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0x772ce8)
            .setAuthor({
                name: interaction.user.globalName,
                iconURL: interaction.user.avatarURL(),
            })
            .setTitle("Streamer Mention");

        let mentions = [];

        for (let i = 0; i < streamers.length; i++) {
            const streamer = streamers[i];
            const moderators = await streamer.getMods();
            let streamerMentions = [];
            for (let m = 0; m < moderators.length; m++) {
                const moderator = moderators[m];
                await moderator.moderator.populate("identity");
                if (moderator.moderator?.identity) {
                    const discordUsers = await moderator.moderator.identity.getDiscordUsers();
                    if (discordUsers.length > 0) {
                        streamerMentions.push(`<@${discordUsers[0]._id}>`);
                    }
                }
            }
            if (streamerMentions.length > 0) {
                embed.setThumbnail(streamer.profile_image_url);
                mentions = [
                    ...mentions,
                    ...streamerMentions,
                ];
                embed.addFields({
                    name: streamer.display_name,
                    value: streamerMentions.join("\n"),
                    inline: true,
                });
            }
        }

        if (mentions.length === 0) {
            return interaction.error("No moderators found under the specified streamer(s)!");
        }

        interaction.reply({content: mentions.join(" "), embeds: [embed]});
    }
};

module.exports = command;
