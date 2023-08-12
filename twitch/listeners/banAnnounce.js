const { EmbedBuilder, codeBlock, cleanCodeBlockContent, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const utils = require("../../utils");

const config = require("../../config.json");

const CHANNEL_MAXIMUM = 15;

let channel = null;

const listener = {
    name: "banAnnounce",
    eventName: "ban",
    listener: async (client, streamer, chatter, timebanned, userstate, bpm) => {
        let ban;
        try {
            ban = await utils.Schemas.TwitchBan.create({
                streamer: streamer,
                chatter: chatter,
            });
        } catch(e) {
            console.error(e);
            return;
        }

        if (client.type !== "member") return;

        if (bpm > 5) return;

        if (!channel) {
            try {
                channel = await global.client.modbot.channels.fetch(config.discord.modbot.channels.ban);
            } catch(err) {
                console.error(err);
                return;
            }
        }

        const embed = new EmbedBuilder()
                .setTitle("User has been banned!")
                .setDescription(`User \`${cleanCodeBlockContent(chatter.display_name)}\` was banned from channel \`${cleanCodeBlockContent(streamer.display_name)}\``)
                .setThumbnail(chatter.profile_image_url)
                .setAuthor({iconURL: streamer.profile_image_url, name: streamer.display_name, url: `https://twitch.tv/${streamer.login}`})
                .setFooter({text: `Bans per Minute: ${bpm}`, iconURL: config.iconURI})
                .setColor(0xe3392d);

        const components = [];

        const chatHistory = await utils.Schemas.TwitchChat
                .find({streamer: streamer._id, chatter: chatter._id})
                .sort({time_sent: -1})
                .limit(10);

        let chatHistoryString = "";
        chatHistory.forEach(ch => {
            if (chatHistoryString !== "") chatHistoryString += "\n";
            chatHistoryString += `${utils.formatTime(ch.time_sent)} [${chatter.display_name}] ${ch.message}`;
        });

        if (chatHistoryString === "")
            chatHistoryString = "There are no logs in this channel from this user!";

        const channelHistoryDistinct = await utils.Schemas.TwitchChat
                .distinct("streamer", {chatter: chatter._id});

        let channelHistory = [];
        for (let i = 0; i < channelHistoryDistinct.length; i++) {
            const channelId = channelHistoryDistinct[i];

            let lastMessage = await utils.Schemas.TwitchChat
                    .find({streamer: channelId, chatter: chatter._id})
                    .sort({time_sent: -1})
                    .limit(1)
                    .populate("streamer");
            
            if (lastMessage && lastMessage?.length > 0) {
                lastMessage = lastMessage[0];
                lastMessage.bannedIn = await utils.Schemas.TwitchBan
                        .exists({streamer: channelId, chatter: chatter._id, time_end: null});
                lastMessage.timedOutIn = await utils.Schemas.TwitchTimeout
                        .exists({streamer: channelId, chatter: chatter._id, time_end: {$gt: Date.now()}});
                channelHistory.push(lastMessage);
            }
        }

        channelHistory.sort((a, b) => b.time_sent - a.time_sent);

        let channelHistoryTable = [["Channel", "Last Active", ""]];
        for (let i = 0; i < Math.min(channelHistory.length, CHANNEL_MAXIMUM); i++) {
            let lastMessage = channelHistory[i];
            channelHistoryTable.push([lastMessage.streamer.display_name, utils.parseDate(lastMessage.time_sent), (lastMessage.bannedIn ? "[❌banned]" : "") + (lastMessage.timedOutIn ? "[⏲️t/o]" : "")])
        }

        embed.addFields({
            name: "Chat History",
            value: codeBlock(cleanCodeBlockContent(chatHistoryString)),
        });

        if (channelHistoryTable.length > 1) {
            embed.addFields({
                name: `Channel Activity (${channelHistory.length} channel${channelHistory.length === 1 ? "" : "s"})`,
                value: codeBlock(
                    cleanCodeBlockContent(
                        utils.stringTable(channelHistoryTable)
                    )
                ),
            });

            const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId("chathistory")
                    .setPlaceholder("View Chat History")
                    .setMinValues(1)
                    .setMaxValues(1);

            for (let i = 0; i < Math.min(channelHistory.length, 25); i++) {
                const lastMessage = channelHistory[i];
                selectMenu.addOptions({
                    label: lastMessage.streamer.display_name,
                    value: `${lastMessage.streamer._id}:${lastMessage.chatter}`,
                })
            }

            const row = new ActionRowBuilder()
                    .addComponents(selectMenu);

            components.push(row);
        }

        channel.send({embeds: [embed], components: components}).then(async message => {
            try {
                await utils.Schemas.DiscordMessage.create({
                    _id: message.id,
                    twitchBan: ban._id,
                });
            } catch(e) {
                console.error(e);
            }
        }, console.error);
    }
};

module.exports = listener;
