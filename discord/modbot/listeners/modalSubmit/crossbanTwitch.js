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
            user = await utils.Twitch.getUserById(userId);
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
                const moderator = twitchUsers[i];
                const tokens = await moderator.getTokens(["moderator:manage:banned_users"]);
                let accessToken = null;
                for (let t = 0; t < tokens.length; t++) {
                    try {
                        accessToken = await utils.Authentication.Twitch.getAccessToken(tokens[t].refresh_token);
                        await tokens[t].use();
                        break;
                    } catch(e) {}
                }
                if (accessToken) {
                    let successfulBans = [];
                    for (let b = 0; b < bansRemaining.length; b++) {
                        try {
                            const streamer = await utils.Twitch.getUserById(bansRemaining[b]);
                            try {
                                await utils.Authentication.Twitch.banUser(streamer._id, moderator._id, accessToken, user._id, reason);
                                successfulBans.push(bansRemaining[b]);
                                success += `\n${streamer.display_name}`;
                            } catch(err) {
                                error += `\n${streamer.display_name} - ${err}`;
                            }
                        } catch(err) {}
                    }
                    bansRemaining = bansRemaining.filter(x => !successfulBans.find(y => y === x));
                } else {
                    return interaction.error("Unable to retrieve any access token! Please [log in to TMS](https://v2.tms.to/auth/login)")
                }
                if (bansRemaining.length === 0) break;
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
