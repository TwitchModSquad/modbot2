const mongoose = require("mongoose");

const config = require("../../config.json");
const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, codeBlock, cleanCodeBlockContent } = require("discord.js");
const { ApiClient } = require("@twurple/api");

const banSchema = new mongoose.Schema({
    streamer: {
        type: String,
        ref: "TwitchUser",
        required: true,
        index: true,
    },
    chatter: {
        type: String,
        ref: "TwitchUser",
        required: true,
        index: true,
    },
    moderator: {
        type: String,
        ref: "TwitchUser",
        index: true,
    },
    reason: String,
    time_start: {
        type: Date,
        default: Date.now,
    },
    time_end: {
        type: Date,
        default: null,
    },
    migrate_id: Number,
});

banSchema.methods.public = function() {
    return {
        id: this._id,
        streamer: this.streamer.public(),
        chatter: this.chatter.public(),
        time_start: this.time_start,
        time_end: this.time_end,
    };
}

banSchema.methods.updateData = async function() {
    if (typeof(this.chatter) === "string" || typeof(this.streamer) === "string") {
        await this.populate(["chatter", "streamer"]);
    }

    /**
     * @type {ApiClient}
     */
    const client = global.utils.Twitch.Helix;

    try {
        const banData = await client.asIntent([`${this.streamer._id}:bandata`], async ctx => {
            return await ctx.moderation.getBannedUsers(this.streamer._id, {
                userId: this.chatter._id,
                limit: 1,
            })
        });
        if (banData.data.length > 0) {
            const ban = banData.data[0];
            this.time_start = ban.creationDate;
            this.moderator = ban.moderatorId;
            this.reason = ban.reason;
            await this.save();
            console.log(`Retrieved ban data for #${this.streamer.login}/${this.chatter.login}`);
        } else {
            console.warn(`Retrieved ban data for #${this.streamer.login}/${this.chatter.login}, but it was empty!`);
        }
    } catch(err) {
        console.warn(`Failed to get ban data for #${this.streamer.login}/${this.chatter.login}: ${err}`);
    }
}

banSchema.methods.getChatHistory = async function() {
    const chatHistory = await global.utils.Schemas.TwitchChat
        .find({
            streamer: this.streamer,
            chatter: this.chatter,
            time_sent: {
                $lte: this.time_start,
            }
        })
        .sort({time_sent: -1})
        .limit(10);

    chatHistory.reverse();

    return chatHistory;
}

banSchema.methods.message = async function(showButtons = false, getData = false, bpm = null) {
    if (typeof(this.chatter) === "string" || typeof(this.streamer) === "string") {
        await this.populate(["chatter", "streamer"]);
    }

    const startTime = Date.now();

    if (getData) {
        await this.updateData();
    }

    const embed = new EmbedBuilder()
            .setTitle("User has been banned!")
            .setDescription(`User \`${cleanCodeBlockContent(this.chatter.display_name)}\` was banned from channel \`${cleanCodeBlockContent(this.streamer.display_name)}\``)
            .setThumbnail(this.chatter.profile_image_url)
            .setAuthor({iconURL: this.streamer.profile_image_url, name: this.streamer.display_name, url: `https://twitch.tv/${this.streamer.login}`})
            .setColor(0xe3392d);

    if (typeof(this.moderator) === "string") {
        await this.populate("moderator");
    }

    if (this?.moderator?.display_name) {
        embed.addFields({
            name: "Moderator",
            value: codeBlock(this.moderator.display_name),
            inline: true,
        }, {
            name: "Reason",
            value: codeBlock(cleanCodeBlockContent(this.reason ? this.reason : "No reason")),
            inline: true,
        });
    }

    const components = [];

    const chatHistory = await this.getChatHistory();

    let chatHistoryString = "";
    chatHistory.forEach(ch => {
        if (chatHistoryString !== "") chatHistoryString += "\n";
        chatHistoryString += `${global.utils.formatTime(ch.time_sent)} [${this.chatter.display_name}] ${ch.message}`;
    });

    if (chatHistoryString === "")
        chatHistoryString = "There are no logs in this channel from this user!";

    const allChannelHistory = await this.chatter.getActiveCommunities();

    let memberChannelHistory = allChannelHistory.filter(x => x.streamer.chat_listen);
    let channelHistory = allChannelHistory.filter(x => !x.streamer.chat_listen);

    embed.addFields({
        name: "Chat History",
        value: codeBlock(cleanCodeBlockContent(chatHistoryString)),
    });

    if (allChannelHistory.length > 0) {
        embed.addFields({
            name: `Channel Activity (${allChannelHistory.length} channel${allChannelHistory.length === 1 ? "" : "s"})`,
            value: codeBlock(
                cleanCodeBlockContent(
                    await this.chatter.generateCommunityTable(allChannelHistory)
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
                value: `${lastMessage.streamer._id}:${lastMessage.chatter._id}`,
            })
        }

        for (let i = 0; i < (Math.min(channelHistory.length, 25) - memberChannelHistory.length); i++) {
            const lastMessage = channelHistory[i];
            selectMenu.addOptions({
                label: lastMessage.streamer.display_name,
                value: `${lastMessage.streamer._id}:${lastMessage.chatter._id}`,
            })
        }

        const row = new ActionRowBuilder()
                .addComponents(selectMenu);

        components.push(row);
    }

    const elapsedTime = Date.now() - startTime;

    embed.setFooter({text: `${bpm ? `Bans per Minute: ${bpm} • ` : ""}Generated in ${elapsedTime} ms`, iconURL: config.iconURI});

    if (showButtons) {
        components.push(
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`cb-t-${this.chatter._id}`)
                        .setLabel("Crossban")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("hide-ban")
                        .setLabel("Hide Ban")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("flag")
                        .setLabel("Add Flag")
                        .setStyle(ButtonStyle.Primary)
                )
        );
    }

    return {
        embeds: [embed],
        components: components,
    }
}

module.exports = mongoose.model("TwitchBan", banSchema);
