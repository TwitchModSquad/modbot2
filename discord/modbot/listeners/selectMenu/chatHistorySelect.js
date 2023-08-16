const { StringSelectMenuInteraction, EmbedBuilder, codeBlock, cleanCodeBlockContent } = require("discord.js");

const listener = {
    name: 'chatHistorySelect',
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "chathistory";
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const startTime = Date.now();
        const [streamerID, chatterID] = interaction.values[0].split(":");
        try {
            const streamer = await global.utils.Twitch.getUserById(streamerID, false, true);
            const chatter = await global.utils.Twitch.getUserById(chatterID, false, true);

            const chatHistory = await global.utils.Schemas.TwitchChat.find({streamer: streamer._id, chatter: chatter._id})
                    .sort({time_sent: -1})
                    .limit(25);

            const bans = await global.utils.Schemas.TwitchBan.find({
                        streamer: streamer._id,
                        chatter: chatter._id,
                        time_end: null,
                        time_start: {
                            $gt: chatHistory[chatHistory.length - 1].time_sent,
                        }
                    });

            let chatHistoryString = "";
            let lastTime = Date.now();
            chatHistory.forEach(ch => {
                if (chatHistoryString !== "") chatHistoryString += "\n";
                const bansFilter = bans.filter(x => x.time_start < lastTime && x.time_start > ch.time_sent);
                bansFilter.forEach(ban => {
                    chatHistoryString += `${global.utils.formatTime(ban.time_start)} [#${streamer.login}] ${chatter.display_name} was banned!\n`;
                });
                chatHistoryString += `${global.utils.formatTime(ch.time_sent)} [${chatter.display_name}] ${ch.message}`;
                lastTime = ch.time_sent;
            });

            const elapsedTime = Date.now() - startTime;

            const embed = new EmbedBuilder()
                    .setTitle(`Chat History in ${streamer.login}`)
                    .setColor(0x03a9fc)
                    .setAuthor({name: chatter.display_name, iconURL: chatter.profile_image_url, url: `https://twitch.tv/${chatter.login}`})
                    .setDescription(codeBlock(cleanCodeBlockContent(chatHistoryString)))
                    .setFooter({text: `Logs in ${streamer.display_name} • Generated in ${elapsedTime} ms`, iconURL: streamer.profile_image_url});

            interaction.reply({embeds: [embed], ephemeral: true});
        } catch (err) {
            console.error(err);
            interaction.error(String(err));
        }
    }
};

module.exports = listener;
