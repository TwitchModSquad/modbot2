const { StringSelectMenuInteraction, EmbedBuilder, codeBlock, cleanCodeBlockContent } = require("discord.js");

const utils = require("../../../../utils/");

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
            const streamer = await utils.Twitch.getUserById(streamerID, false, true);
            const chatter = await utils.Twitch.getUserById(chatterID, false, true);

            const chatHistory = await utils.Schemas.TwitchChat.find({streamer: streamer._id, chatter: chatter._id})
                    .sort({time_sent: -1})
                    .limit(20);

            const bans = await utils.Schemas.TwitchBan.find({
                        streamer: streamer._id,
                        chatter: chatter._id,
                        time_end: null,
                        time_start: {
                            $gt: chatHistory[0].time_sent,
                            $lt: chatHistory[chatHistory.length - 1].time_sent,
                        }
                    });

            let chatHistoryString = "";
            chatHistory.forEach(ch => {
                if (chatHistoryString !== "") chatHistoryString += "\n";
                chatHistoryString += utils.formatTime(ch.time_sent) + ` [${chatter.display_name}] ${ch.message}`;
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
            interaction.error(err);
        }
    }
};

module.exports = listener;
