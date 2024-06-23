const mongoose = require("mongoose");

const config = require("../../config.json");
const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, codeBlock, cleanCodeBlockContent } = require("discord.js");
const { ApiClient } = require("@twurple/api");

const Flag = require("../flag/Flag");
const oai = require("../gpt");

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
    flags: {
        type: [{
            type: mongoose.Types.ObjectId,
            ref: "Flag",
        }],
        default: [],
    },
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

banSchema.methods.updateData = async function(save = false) {
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
            if (save) {
                await this.save();
            }
            console.log(`Retrieved ban data for #${this.streamer.login}/${this.chatter.login}`);
        } else {
            console.warn(`Retrieved ban data for #${this.streamer.login}/${this.chatter.login}, but it was empty!`);
        }
    } catch(err) {
        console.warn(`Failed to get ban data for #${this.streamer.login}/${this.chatter.login}: ${err}`);
    }
}

const parseFlags = async tags => {
    const flags = [];
    for (let i = 0; i < tags.length; i++) {
        const effectiveName = tags[i].toLowerCase().replace(/[-_]/g, " ");
        let flag = await Flag.findOne().or([{name: effectiveName}], {aliases: effectiveName});
        if (!flag) {
            flag = await Flag.create({
                name: effectiveName,
            });
        }
        flags.push(flag);
    }
    return flags;
}

banSchema.methods.updateFlags = async function(chatHistory, save = false) {
    if (chatHistory.length === 0) return;
    if (config.development) {
        return console.warn("Will not retrieve flags from GPT as development mode is on!");
    }

    try {
        const assistant = await oai.beta.assistants.retrieve(config.gpt.assistants.ban);
        const thread = await oai.beta.threads.create();
        const message = await oai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: chatHistory.map(x => x.message).join("\n"),    
        });
        const run = await oai.beta.threads.runs.createAndPoll(thread.id, {
            assistant_id: assistant.id,
        });
        if (run.status === "completed") {
            
            const messages = await oai.beta.threads.messages.list(thread.id);
            const assistantMessage = messages.data.find(x => x.role === "assistant");

            if (assistantMessage?.content && assistantMessage.content.length > 0) {
                const message = assistantMessage.content[0].text?.value;
                if (message) {
                    try {
                        const jsonObject = JSON.parse(message);
                        if (typeof(jsonObject.tags) === "object") {
                            if (jsonObject.tags.length > 0) {
                                this.flags = await parseFlags(jsonObject.tags);
                                if (save) {
                                    await this.save();
                                }
                            } else {
                                console.log("No tags returned from ban " + this._id);
                            }
                            console.log(`Completed parsing flags for ban ${this._id}`)
                        } else {
                            console.error("Invalid JSON: " + jsonObject);
                        }
                    } catch(err) {
                        console.error(err);
                        console.error("Failed to parse json: " + message);
                    }
                } else {
                    console.error("Flag message text is missing from " + this._id);
                }
            } else {
                console.error("Failed to get flag content from " + this._id);
            }
        }
    } catch(err) {
        console.error(err);
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

banSchema.methods.message = async function(showButtons = false, getData = false, bpm = null, chatHistory = null) {
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

    if (this?.flags && this.flags.length > 0) {
        await this.populate("flags");
        embed.addFields({
            name: "Flags",
            value: codeBlock(this.flags.map(x => `${x.icon ? x.icon + " " : ""}${x.displayName()}`).join(", ")),
            inline: true,
        })
    }

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

    if (!chatHistory) {
        chatHistory = await this.getChatHistory();
    }

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
                        .setStyle(ButtonStyle.Secondary)
                )
        );
    }

    return {
        embeds: [embed],
        components: components,
    }
}

module.exports = mongoose.model("TwitchBan", banSchema);
