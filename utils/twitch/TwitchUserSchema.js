const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const mongoose = require("mongoose");

const TwitchRole = require("./TwitchRole");

const TwitchBan = require("./TwitchBan");
const TwitchTimeout = require("./TwitchTimeout");

const config = require("../../config.json");
const con = require("../../old-db");
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
    const followers = (await global.utils.Authentication.Twitch.getChannelFollowers(this._id)).total;
    this.follower_count = followers;
    return followers;
}

userSchema.methods.updateData = async function() {
    const helixUser = await global.utils.Twitch.Helix.helix.users.getUserById(this._id);
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

userSchema.methods.getTokens = async function(requiredScopes = []) {
    const tokens = await global.utils.Schemas.TwitchToken.find({user: this._id});
    let finalTokens = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const scopes = token.scope.split(" ");
        let validToken = true;
        for (let s = 0; s < requiredScopes.length; s++) {
            if (!scopes.includes(requiredScopes[s])) validToken = false;
        }
        if (validToken) finalTokens.push(token);
    }
    return finalTokens;
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

    let channelHistoryTable = [["Channel", "Last Active"]];

    if (memberChannelHistory.length > 0)
        channelHistoryTable.push(["", "Member Channels"]);

    for (let i = 0; i < Math.min(memberChannelHistory.length, 15); i++) {
        let history = memberChannelHistory[i];
        channelHistoryTable.push([history.streamer.display_name, global.utils.parseDate(history.last_message)])
    }

    const otherChannelCount = Math.min(channelHistory.length, 15) - memberChannelHistory.length;

    if (otherChannelCount > 0)
        channelHistoryTable.push(["", "Other Channels"]);

    for (let i = 0; i < otherChannelCount; i++) {
        let history = channelHistory[i];
        channelHistoryTable.push([history.streamer.display_name, global.utils.parseDate(history.last_message)])
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

userSchema.methods.fetchModdedChannels = async function(accessToken) {
    const channels = await global.utils.Authentication.Twitch.getModeratedChannels(accessToken, this._id);
    await TwitchRole.updateMany({
        moderator: this,
        time_end: null,
    }, {
        time_end: Date.now(),
    })
    for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        try {
            const streamer = await global.utils.Twitch.getUserById(channel.broadcaster_id, false, true);
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

let migrating = false;
userSchema.methods.migrateData = function() {
    return new Promise((resolve, reject) => {
        if (migrating) return reject("A migration is already taking place!");
        con.query("select id, streamer_id, user_id, moderator_id, timebanned, reason, active from twitch__ban where user_id = ?;", [this._id], async (err, bans) => {
            if (err) return reject(err);

            for (let i = 0; i < bans.length; i++) {
                const ban = bans[i];
                const streamer = await global.utils.Twitch.getUserById(ban.streamer_id, false, true);
                const chatter = await global.utils.Twitch.getUserById(ban.user_id, false, true);
                const moderator = ban.moderator_id ? await global.utils.Twitch.getUserById(ban.moderator_id, false, true) : null;

                await TwitchBan.findOneAndUpdate({
                    migrate_id: ban.id,
                }, {
                    streamer: streamer,
                    chatter: chatter,
                    moderator: moderator,
                    reason: ban.reason,
                    time_start: new Date(ban.timebanned),
                    time_end: ban.active ? null : new Date(ban.timebanned + 1000),
                    migrate_id: ban.id,
                }, {
                    upsert: true,
                    new: true,
                });
            }

            con.query("select id, streamer_id, user_id, timeto, duration from twitch__timeout where user_id = ?;", [this._id], async (err2, tos) => {
                if (err2) return reject(err2);

                for (let t = 0; t < tos.length; t++) {
                    const to = tos[t];
                    const streamer = await global.utils.Twitch.getUserById(to.streamer_id, false, true);
                    const chatter = await global.utils.Twitch.getUserById(to.user_id, false, true);

                    await TwitchTimeout.findOneAndUpdate({
                        migrate_id: to.id,
                    }, {
                        streamer: streamer,
                        chatter: chatter,
                        time_start: new Date(to.timeto),
                        time_end: new Date(to.timeto + (to.duration * 1000)),
                        duration: to.duration,
                        migrate_id: to.id,
                    }, {
                        upsert: true,
                        new: true,
                    });
                }

                if (!this.migrated) {
                    migrating = true;
                    const start = Date.now();
                    console.log(`Now migrating chat logs from ${this.display_name}`);
                    con.query("select id, streamer_id, user_id, message, deleted, color, emotes, badges, timesent from twitch__chat where user_id = ? order by timesent desc limit 25000;", [this._id], async (err3, chats) => {
                        if (err3) {
                            migrating = false;
                            console.error(err3);
                            return;
                        }

                        console.log(`Received ${chats.length} chat messages from ${this.display_name} at ${Date.now() - start} ms`);
                        for (let c = 0; c < chats.length; c++) {
                            const chat = chats[c];
                            try {
                                const streamer = await global.utils.Twitch.getUserById(chat.streamer_id, false, true);
                                const chatter = await global.utils.Twitch.getUserById(chat.user_id, false, true);
                                await TwitchChat.findOneAndUpdate({
                                    _id: chat.id,
                                }, {
                                    _id: chat.id,
                                    streamer: streamer,
                                    chatter: chatter,
                                    color: chat.color,
                                    badges: chat.badges,
                                    emotes: chat.emotes,
                                    message: chat.message,
                                    deleted: chat.deleted,
                                    time_sent: new Date(chat.timesent),
                                }, {
                                    upsert: true,
                                    new: true,
                                });
                            } catch(e) {
                                console.error(e);
                            }
                        }
                        console.log(`Completed migration for ${this.display_name} in ${Date.now() - start} ms!`);
                        migrating = false;
                    });
                }

                this.migrated = true;
                await this.save();

                resolve();
            });
        });
    });
}

module.exports = userSchema;
