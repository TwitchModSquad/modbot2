const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const mongoose = require("mongoose");
const mongoosastic = require("mongoosastic");

const TwitchRole = require("./TwitchRole");

const config = require("../../config.json");
const { EmbedBuilder, codeBlock, cleanCodeBlockContent } = require('discord.js');

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
        es_type: "completion",
        es_search_analyzer: "simple",
        es_indexed: true,
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
    },
    chat_listen: {
        type: Boolean,
        default: false,
    },
    blacklisted: Boolean,
    migrated: Boolean,
    created_at: {
        type: Date,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

userSchema.pre("save", function(next) {
    this.updated_at = Date.now();
    next();
});

userSchema.methods.embed = async function() {
    const mods = await this.getMods();
    const streamers = await this.getStreamers();

    const bans = await this.getBans();

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

    if (bans.length > 0) {
        let banString = "";
        for (let i = 0; i < bans.length; i++) {
            const ban = bans[i];
            if (banString !== "") banString += "\n";
            if (ban.message) {
                banString += `[${ban.streamer.display_name} on ${ban.time_start.toLocaleDateString()}](https://discord.com/channels/${config.discord.guilds.modsquad}/${config.discord.modbot.channels.ban}/${ban.message._id})`
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
    const followers = (await global.utils.Twitch.Helix.helix.users.getFollows({followedUser: this._id, limit: 1})).total;
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
            .populate("chatter");
    for (let i = 0; i < bans.length; i++) {
        bans[i].message = await global.utils.Schemas.DiscordMessage.findOne({twitchBan: bans[i]._id});
    }
    return bans;
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

userSchema.plugin(mongoosastic, config.elasticsearch);

module.exports = userSchema;
