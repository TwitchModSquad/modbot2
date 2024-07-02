const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const mongoose = require("mongoose");

const TwitchRole = require("./TwitchRole");

const TwitchBan = require("./TwitchBan");
const TwitchTimeout = require("./TwitchTimeout");

const config = require("../../config.json");
const { EmbedBuilder, codeBlock, cleanCodeBlockContent, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const TwitchChat = require('./TwitchChat');
const UserFlag = require('../flag/UserFlag');

const userSchema = new mongoose.Schema({
    _id: {
        type: String,
    },
    login: {
        type: String,
        minLength: 1,
        maxLength: 25,
        required: true,
        index: true,
    },
    display_name: {
        type: String,
        minLength: 1,
        maxLength: 25,
        required: true,
    },
    identity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Identity",
        index: true,
    },
    type: {
        type: String,
        enum: ["", "admin", "global_mod", "staff"],
        default: "",
    },
    broadcaster_type: {
        type: String,
        enum: ["", "affiliate", "partner"],
        default: "",
    },
    follower_count: Number,
    description: String,
    profile_image_url: String,
    offline_image_url: String,
    commands: {
        prefix: String,
        blacklist: Boolean,
        join: Boolean,
        stats: Boolean,
        tmsstats: Boolean,
        group: Boolean,
        continue: Boolean,
        restart: Boolean,
        scene: Boolean,
        s: Boolean,
        points: Boolean,
    },
    chat_listen: {
        type: Boolean,
        default: false,
    },
    blacklisted: Boolean,
    featured: Boolean,
    migrated: Boolean,
    safe: Boolean,
    created_at: {
        type: Date,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
    updated_modded_channels: Date,
});

userSchema.pre("save", function(next) {
    this.updated_at = Date.now();
    next();
});

userSchema.methods.embed = async function(bans = null, communities = null) {
    const mods = await this.getMods();
    const streamers = await this.getStreamers();
    const flags = await this.getFlags();

    if (!bans) bans = await this.getBans();
    if (!communities) communities = await this.getActiveCommunities();

    const embed = new EmbedBuilder()
            .setAuthor({name: this.display_name, iconURL: this.profile_image_url, url: `https://twitch.tv/${this.login}`})
            .setThumbnail(this.profile_image_url)
            .setColor(0x9147ff)
            .setDescription(
                `${codeBlock(this._id)}` +
                `**Name:** ${this.display_name}\n` +
                (this.follower_count ? `**Followers:** ${global.utils.comma(this.follower_count)}\n` : "") +
                `[Profile](https://twitch.tv/${this.login}) | [TMS User Log](${config.express.domain.root}panel/user/${this._id})` +
                (this.description !== "" ? `\n**Description**${codeBlock(cleanCodeBlockContent(this.description))}` : "")
            );

    if (communities.length > 0) {
        embed.addFields({
            name: "Active Communities",
            value: codeBlock(cleanCodeBlockContent(
                await this.generateCommunityTable(communities)
            )),
            inline: false,
        });
    }

    if (mods.length > 0) {
        embed.addFields({
            name: "Moderators",
            value: mods.map(x => x.moderator.display_name).join(", "),
            inline: true,
        })
    }

    if (streamers.length > 0) {
        embed.addFields({
            name: "Streamers",
            value: streamers.map(x => x.streamer.display_name).join(", "),
            inline: true,
        })
    }

    if (flags.length > 0) {
        embed.addFields({
            name: "User Flags",
            value: flags.map(x => `\`${x.flag.icon ? `${x.flag.icon} ` : ""}${x.flag.name}\``).join(" "),
            inline: true,
        });
    }

    if (bans.length > 0) {
        let banString = "";
        for (let i = 0; i < bans.length; i++) {
            const ban = bans[i];
            if (banString !== "") banString += "\n";
            if (ban.message) {
                banString += `[${ban.streamer.display_name} on ${ban.time_start.toLocaleDateString()}](https://discord.com/channels/${config.discord.guilds.modsquad}/${config.discord.channels.ban.tms}/${ban.message._id})`
            } else {
                banString += `${ban.streamer.display_name} on ${ban.time_start.toLocaleDateString()}`;
            }
        }
        embed.addFields({
            name: "Bans",
            value: banString,
            inline: false,
        })
    }
    
    return embed;
}

userSchema.methods.message = async function(ephemeral = true) {
    const bans = await this.getBans();
    const communities = await this.getActiveCommunities();

    const components = [];
    
    if (bans.length > 0) {
        const banSelectMenu = new StringSelectMenuBuilder()
            .setCustomId("ban")
            .setPlaceholder("View ban information")
            .setMinValues(1)
            .setMaxValues(1);

        bans.forEach((ban, i) => {
            if (i > 24) return;
            banSelectMenu.addOptions({
                label: `Ban in #${ban.streamer.login} on ${utils.parseDate(ban.time_start)}${ban.time_end ? " (inactive)" : ""}`,
                value: String(ban._id),
            });
        });

        components.push(
            new ActionRowBuilder()
                .setComponents(banSelectMenu)
        );
    }

    if (communities.length > 0) {
        const chatHistorySelectMenu = new StringSelectMenuBuilder()
            .setCustomId("chathistory")
            .setPlaceholder("View chat history")
            .setMinValues(1)
            .setMaxValues(1);

        communities.forEach((com, i) => {
            if (i > 24) return;
            chatHistorySelectMenu.addOptions({
                label: `${com.streamer.display_name} (${com.messages} message${com.messages === 1 ? "" : "s"})`,
                value: `${com.streamer._id}:${com.chatter._id}`,
            });
        });

        components.push(
            new ActionRowBuilder()
                .setComponents(chatHistorySelectMenu)
        );
    }

    return {
        embeds: [await this.embed(bans, communities)],
        components: components,
        ephemeral: ephemeral,
    };
}

userSchema.methods.public = function() {
    return {
        id: this._id,
        login: this.login,
        display_name: this.display_name,
        type: this.type,
        broadcaster_type: this.broadcaster_type,
        follower_count: this.follower_count,
        description: this.description,
        profile_image_url: this.profile_image_url,
        offline_image_url: this.offline_image_url,
        chat_listen: this.chat_listen,
        blacklisted: this.blacklisted,
        created_at: this.created_at,
        updated_at: this.updated_at,
    };
}

userSchema.methods.fetchFollowers = async function () {
    const followers = (await global.utils.Twitch.Helix.channels.getChannelFollowerCount(this._id));
    this.follower_count = followers;
    return followers;
}

userSchema.methods.updateData = async function() {
    const helixUser = await global.utils.Twitch.Helix.users.getUserById(this._id);
    this.login = helixUser.name;
    this.display_name = helixUser.displayName;
    this.type = helixUser.type;
    this.broadcaster_type = helixUser.broadcasterType;
    this.description = helixUser.description;
    this.profile_image_url = helixUser.profilePictureUrl;
    this.offline_image_url = helixUser.offlinePlaceholderUrl;
    return this;
}

userSchema.methods.tmsAffiliation = function() {
    return this.chat_listen ? "member" : this.broadcaster_type;
}

userSchema.methods.createIdentity = async function() {
    if (this.identity) {
        await this.populate("identity");
        return this.identity;
    }

    const identity = await global.utils.Schemas.Identity.create({});
    this.identity = identity;
    await this.save();
    return identity;
}

userSchema.methods.getMods = async function(includeInactive = false) {
    let data = {streamer: this};
    if (!includeInactive) data.time_end = null;
    return await TwitchRole.find(data)
            .populate("streamer")
            .populate("moderator");
}

userSchema.methods.getStreamers = async function(includeInactive = false) {
    let data = {moderator: this};
    if (!includeInactive) data.time_end = null;
    return await TwitchRole.find(data)
            .populate("streamer")
            .populate("moderator");
}

userSchema.methods.getTokens = async function() {
    const tokens = await global.utils.Schemas.TwitchToken.find({user: this._id});
    return tokens;
}

userSchema.methods.getBans = async function() {
    const bans = await global.utils.Schemas.TwitchBan.find({chatter: this._id})
            .populate("streamer")
            .populate("chatter")
            .sort({time_start: -1});
    for (let i = 0; i < bans.length; i++) {
        bans[i].message = await global.utils.Schemas.DiscordMessage.findOne({twitchBan: bans[i]._id});
    }
    return bans;
}

userSchema.methods.getFlags = async function() {
    return await UserFlag.find({twitchUser: this._id})
        .populate("flag");
}

userSchema.methods.getActiveCommunities = async function() {
    const channelHistory = await utils.Schemas.TwitchUserChat.find({chatter: this})
        .populate(["streamer","chatter"])
        .sort({last_message: -1});
    return channelHistory;
}

userSchema.methods.generateCommunityTable = async function(allChannelHistory = null) {
    if (!allChannelHistory) allChannelHistory = await this.getActiveCommunities();

    let memberChannelHistory = allChannelHistory.filter(x => x.streamer.chat_listen);
    let channelHistory = allChannelHistory.filter(x => !x.streamer.chat_listen);

    let channelHistoryTable = [["Channel", "Last Active", ""]];

    const bans = await TwitchBan.find({chatter: this._id, time_end: null}).populate("streamer");

    for (let i = 0; i < Math.min(memberChannelHistory.length, 15); i++) {
        const history = memberChannelHistory[i];
        channelHistoryTable.push([
            history.streamer.display_name,
            global.utils.parseDate(history.last_message),
            bans.find(x => x.streamer._id === history.streamer._id) ? "❌ Banned" : "",
        ]);
    }

    const otherChannelCount = Math.min(channelHistory.length, 15) - memberChannelHistory.length;

    if (otherChannelCount > 0)
        channelHistoryTable.push(["", "Other Channels", ""]);
    
    for (let i = 0; i < otherChannelCount; i++) {
        const history = channelHistory[i];
        channelHistoryTable.push([
            history.streamer.display_name,
            global.utils.parseDate(history.last_message),
            bans.find(x => x.streamer._id === history.streamer._id) ? "❌ Banned" : "",
        ]);
    }

    for (let i = 0; i < bans.length; i++) {
        const ban = bans[i];
        if (!allChannelHistory.find(x => x.streamer._id === ban.streamer._id)) {
            channelHistoryTable.push([
                ban.streamer.display_name,
                "No chat logs!",
                "❌ Banned",
            ])
        }
    }

    return global.utils.stringTable(channelHistoryTable, 2);
}

userSchema.methods.fetchMods = async function() {
    const results = await fetch(config.twitch.gql.uri, {
        method: "POST",
        body: config.twitch.gql.getmods_body.replace("::login", this.login),
        headers: {
            'Client-Id': config.twitch.gql.client_id,
        },
    });

    const json = await results.json();
    if (json) {
        if (results.status === 200) {
            try {
                const edges = json[0].data.user.mods.edges;
                let mods = [];
                await TwitchRole.updateMany({streamer: this}, {time_end: Date.now()});
                for (let i = 0; i < edges.length; i++) {
                    try {
                        const user = await global.utils.Twitch.getUserById(edges[i].node.id, false, true);
                        const currentRecord = await TwitchRole.findOne({streamer: this, moderator: user})
                                .populate("streamer")
                                .populate("moderator");
                        if (currentRecord) {
                            currentRecord.time_end = null;
                            await currentRecord.save();
                            mods.push(currentRecord);
                        } else {
                            mods.push(await TwitchRole.create({streamer: this, moderator: user, source: "gql"}));
                        }
                    } catch(e) {
                        console.error(e);
                    }
                }
                return mods;
            } catch(e) {
                console.error(e);
                console.error(json);
                throw "Received invalid Json response";
            }
        } else {
            throw `Received error: ${json.hasOwnProperty("message") ? json.message : results.status}`
        }
    } else {
        throw "Json not returned in response";
    }
}

userSchema.methods.fetchModdedChannels = async function() {
    const channels = (await global.utils.Twitch.Helix.moderation.getModeratedChannels(this._id)).data;

    await TwitchRole.updateMany({
        moderator: this,
        time_end: null,
    }, {
        time_end: Date.now(),
    })
    for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        try {
            const streamer = await global.utils.Twitch.getUserById(channel.id, false, true);
            await TwitchRole.findOneAndUpdate({
                streamer, moderator: this,
            }, {
                time_end: null,
                source: "helix",
            }, {
                upsert: true,
                new: true,
            });
        } catch(err) {
            console.error(err);
        }
    }
    return await TwitchRole.find({moderator: this, time_end: null})
        .populate(["streamer","moderator"]);
}

userSchema.methods.migrateData = function() {
    return new Promise((resolve, reject) => {
        reject("Data migration no longer exists!");
    });
}

module.exports = userSchema;
