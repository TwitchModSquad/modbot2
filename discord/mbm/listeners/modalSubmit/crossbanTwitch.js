const { ModalSubmitInteraction, EmbedBuilder, codeBlock, cleanCodeBlockContent } = require("discord.js");
const mongoose = require("mongoose");

const utils = require("../../../../utils/");

const {streamerCache} = require("../selectMenu/crossbanTwitch");

const listener = {
    name: 'crossbanTwitch',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ModalSubmitInteraction} interaction 
     */
    verify(interaction) {
        return interaction.customId.startsWith("cb-t-");
    },
    /**
     * Listener for a button press
     * @param {ModalSubmitInteraction} interaction 
     */
    async listener (interaction) {
        const userId = interaction.customId.split("-")[2];
        let reason = interaction.fields.getTextInputValue("reason");
        let user = null;

        if (reason.length < 3) reason = null;

        try {
            user = await utils.Twitch.getUserById(userId, false, true);
        } catch(e) {
            return interaction.error("Unable to get user!");
        }

        if (!streamerCache.hasOwnProperty(interaction.user.id))
            return interaction.error("Missing cache of selected streamers! Please try again");

        const discordUser = await utils.Discord.getUserById(interaction.user.id, true);

        if (!discordUser?.identity?.authenticated)
            return interaction.error("You have not authenticated with TMS! Do so [here](https://tms.to/join)");

        const twitchUsers = await discordUser.identity.getTwitchUsers();

        let bansRemaining = streamerCache[interaction.user.id];
        let success = "";
        let error = "";

        try {
            for (let i = 0; i < twitchUsers.length; i++) {
                let successfulBans = [];
                for (let b = 0; b < bansRemaining.length; b++) {
                    try {
                        const streamer = await utils.Twitch.getUserById(bansRemaining[b]);
                        try {
                            const bans = await utils.Twitch.Helix.asUser(twitchUsers[i]._id, async ctx => {
                                return await ctx.moderation.banUser(streamer._id, {
                                    user: user._id,
                                    reason,
                                })
                            });
                            if (bans.length > 0) {
                                successfulBans.push(bansRemaining[b]);
                                success += `\n${streamer.display_name}`;
                            } else {
                                error += `\n${streamer.display_name} - No Ban Returned`;
                            }
                        } catch(err) {
                            if (err?._statusCode === 403) {
                                error += `\n${streamer.display_name} - No Permission`;
                                continue;
                            }

                            try {
                                const body = JSON.parse(err?._body);

                                if (body?.message) {
                                    error += `\n${streamer.display_name} - ${body.message}`
                                    continue;
                                }
                            } catch(err2) {
                                console.error(err2);
                            }
                            console.error(err);
                            error += `\n${streamer.display_name} - Unknown Error`;
                        }
                    } catch(err) {}
                }
                bansRemaining = bansRemaining.filter(x => !successfulBans.find(y => y === x));
            }

            const embed = new EmbedBuilder()
                    .setTitle("Crossban Results")
                    .setColor(0x772ce8);

            if (success !== "") {
                embed.addFields({
                    name: "Successes",
                    value: codeBlock(cleanCodeBlockContent(success)),
                    inline: true,
                })
            }
            if (error !== "") {
                embed.addFields({
                    name: "Errors",
                    value: codeBlock(cleanCodeBlockContent(error)),
                    inline: true,
                })
            }

            interaction.reply({embeds: [embed], ephemeral: true});
        } catch(e) {
            console.error(e);
        }
    }
};

module.exports = listener;
