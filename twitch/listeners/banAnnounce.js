const { EmbedBuilder, codeBlock, cleanCodeBlockContent, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const utils = require("../../utils");

const config = require("../../config.json");

const CHANNEL_MAXIMUM = 15;

const listener = {
    name: "banAnnounce",
    eventName: "ban",
    listener: async (client, streamer, chatter, timebanned, userstate, bpm) => {
        const startTime = Date.now();

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

        let banData = null;
        try {
            const streamerTokens = await streamer.getTokens(["moderator:manage:banned_users"]);
            let accessToken = null;
            for (let i = 0; i < streamerTokens.length; i++) {
                try {
                    accessToken = await utils.Authentication.Twitch.getAccessToken(streamerTokens[i].refresh_token);
                    await streamerTokens[i].use();
                } catch(e) {}
            }
            if (accessToken) {
                banData = await utils.Authentication.Twitch.getBan(accessToken, streamer._id, chatter._id);
            }
        } catch(e) {
            console.error(e);
        }

        const embed = new EmbedBuilder()
                .setTitle("User has been banned!")
                .setDescription(`User \`${cleanCodeBlockContent(chatter.display_name)}\` was banned from channel \`${cleanCodeBlockContent(streamer.display_name)}\``)
                .setThumbnail(chatter.profile_image_url)
                .setAuthor({iconURL: streamer.profile_image_url, name: streamer.display_name, url: `https://twitch.tv/${streamer.login}`})
                .setColor(0xe3392d);

        if (banData) {
            embed.addFields({
                name: "Moderator",
                value: codeBlock(banData.moderator_name),
                inline: true,
            }, {
                name: "Reason",
                value: codeBlock(cleanCodeBlockContent(banData.reason ? banData.reason : "No reason")),
                inline: true,
            });
        }

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

        let memberChannelHistory = [];
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

                if (lastMessage.streamer.chat_listen) {
                    memberChannelHistory.push(lastMessage);
                } else {
                    channelHistory.push(lastMessage);
                }
            }
        }

        channelHistory.sort((a, b) => b.time_sent - a.time_sent);
        memberChannelHistory.sort((a, b) => b.time_sent - a.time_sent);

        let channelHistoryTable = [["Channel", "Last Active", ""]];

        if (memberChannelHistory.length > 0)
            channelHistoryTable.push(["", "Member Channels", ""]);

        for (let i = 0; i < Math.min(memberChannelHistory.length, CHANNEL_MAXIMUM); i++) {
            let lastMessage = memberChannelHistory[i];
            channelHistoryTable.push([lastMessage.streamer.display_name, utils.parseDate(lastMessage.time_sent), (lastMessage.bannedIn ? "[❌banned]" : "") + (lastMessage.timedOutIn ? "[⏲️t/o]" : "")])
        }

        const otherChannelCount = Math.min(channelHistory.length, CHANNEL_MAXIMUM) - memberChannelHistory.length;

        if (otherChannelCount > 0)
            channelHistoryTable.push(["", "Other Channels", ""]);

        for (let i = 0; i < otherChannelCount; i++) {
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
                        utils.stringTable(channelHistoryTable, 2)
                    )
                ),
            });

            const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId("chathistory")
                    .setPlaceholder("View Chat History")
                    .setMinValues(1)
                    .setMaxValues(1);

            for (let i = 0; i < Math.min(memberChannelHistory.length, 25); i++) {
                const lastMessage = memberChannelHistory[i];
                selectMenu.addOptions({
                    label: lastMessage.streamer.display_name,
                    value: `${lastMessage.streamer._id}:${lastMessage.chatter}`,
                })
            }

            for (let i = 0; i < (Math.min(channelHistory.length, 25) - memberChannelHistory.length); i++) {
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

        const elapsedTime = Date.now() - startTime;

        embed.setFooter({text: `Bans per Minute: ${bpm} • Generated in ${elapsedTime} ms`, iconURL: config.iconURI});

        utils.Discord.channels.ban.send({embeds: [embed], components: components}).then(async message => {
            try {
                await utils.Schemas.DiscordMessage.create({
                    _id: message.id,
                    twitchBan: ban._id,
                });
            } catch(e) {
                console.error(e);
            }
        }, console.error);

        utils.EventManager.fire("banAnnounce", streamer, chatter, {embeds: [embed], components: components}, bpm);
    }
};

module.exports = listener;
