const { PermissionsBitField, Guild, Client, TextChannel, EmbedBuilder, ActionRowBuilder, Message } = require("discord.js");

const DiscordAction = require("./DiscordAction");
const DiscordGuild = require("./DiscordGuild");
const DiscordChannel = require("./DiscordChannel");
const DiscordMessage = require("./DiscordMessage");

const { TwitchLivestream } = require("../twitch/TwitchStream");

const GUILD_REFRESH_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
const USER_KEEP_LENGTH = 30_000; // 30 seconds

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const convertToDotNotation = (obj, newObj = {}, prefix = "") => {
    for(let key in obj) {
        if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
            convertToDotNotation(obj[key], newObj, prefix + key + ".");
        } else {
            newObj[prefix + key] = obj[key];
        }
    }
    return newObj;
}

/**
 * Manages Discord commands, channel actions, and more. Also serves as an event fire for these actions.
 * @author Twijn
 */
class DiscordGuildManager {
    
    /**
     * All Discord Commands available to be added
     * @type {{label:string,description:string,name:string}[]}
     */
    discordCommands = [
        {
            label: "Ban Scan",
            description: "Runs a scan on a streamer to determine any chatters that have been banned in other channels.",
            name: "banscan",
        },
        {
            label: "Chatdump",
            description: "Creates a 'dump' of all chat messages, with filters for streamer, chatter, and more.",
            name: "chatdump",
        },
        {
            label: "User",
            description: "Shows user information, including channel bans and active communities.",
            name: "user",
        },
    ];

    /**
     * All actions available to be added
     * @type {{label:string,description:string,name:string,type:string}[]}
     */
    actions = [
        {
            label: "Guild Edit",
            description: "Fires when a guild is edited.",
            name: "guildEdit",
            type: "boolean",
        },
        {
            label: "Channel Create",
            description: "Fires when a channel is created in the guild.",
            name: "channelCreate",
            type: "boolean",
        },
        {
            label: "Channel Delete",
            description: "Fires when a channel is deleted in the guild.",
            name: "channelDelete",
            type: "boolean",
        },
        {
            label: "Channel Edit",
            description: "Fires when a channel is edited in the guild.",
            name: "channelEdit",
            type: "boolean",
        },
        {
            label: "Invite Create",
            description: "Fires when an invite is created.",
            name: "inviteCreate",
            type: "boolean",
        },
        {
            label: "Member Add",
            description: "Fires when a member joins the guild.",
            name: "memberAdd",
            type: "boolean",
        },
        {
            label: "Member Remove",
            description: "Fires when a member leaves the guild.",
            name: "memberRemove",
            type: "boolean",
        },
        {
            label: "Member Leave",
            description: "Fires when a member leaves the guild on their own accord.",
            name: "memberRemoveLeave",
            type: "boolean",
        },
        {
            label: "Member Kicked",
            description: "Fires when a member leaves the guild by being kicked or banned.",
            name: "memberRemoveKick",
            type: "boolean",
        },
        {
            label: "Member Edit",
            description: "Fires when a member or moderator edits their profile.",
            name: "memberEdit",
            type: "boolean",
        },
        {
            label: "Member Edit Name",
            description: "Fires when a member or moderator edits their name.",
            name: "memberEditName",
            type: "boolean",
        },
        {
            label: "Member Edit Avatar",
            description: "Fires when a member or moderator edits their avatar.",
            name: "memberEditAvatar",
            type: "boolean",
        },
        {
            label: "Member Edit Roles",
            description: "Fires when a member has their roles updated.",
            name: "memberEditRoles",
            type: "boolean",
        },
        {
            label: "Message Edit",
            description: "Fires when a message is edited.",
            name: "messageEdit",
            type: "boolean",
        },
        {
            label: "Message Delete",
            description: "Fires when a message is deleted.",
            name: "messageDelete",
            type: "boolean",
        },
        {
            label: "Message Delete (Deleted)",
            description: "Fires when a message is deleted by the user.",
            name: "messageDeleteDelete",
            type: "boolean",
        },
        {
            label: "Message Delete (Moderator)",
            description: "Fires when a message is deleted by a moderator.",
            name: "messageDeleteModerator",
            type: "boolean",
        },
        {
            label: "Twitch Livestream",
            description: "Fires when a stream goes live.",
            name: "twitchLivestream",
            type: "boolean",
        },
        {
            label: "Twitch Ban",
            description: "Fires when a user is banned in a channel.",
            name: "twitchBan",
            type: "boolean",
        },
    ];

    /**
     * The Discord client to use for retrieving channels & guilds
     * @type {Client}
     */
    #client;

    /**
     * Stores all guilds that MBM has joined, without a DiscordGuild database object
     * @type {Guild[]}
     */
    #guilds = [];

    /**
     * Stores all channels that have actions enabled, with a DiscordChannel database object
     * @type {{channel:TextChannel,dbChannel:object}[]}
     */
    #channels = [];

    /**
     * Stores a user's guild cache
     * @type {{userId:string,guilds:string[],generated:number}[]}
     */
    #userCache = [];

    /**
     * Cache for livestream messages.
     * @type {{streamer:string,message:Message}[]} 
     */
    #livestreamMessageCache = [];

    /**
     * Returns an array of guilds from their IDs
     * @param {string[]} ids 
     * @returns {Guild}
     */
    getGuildsFromIds(ids) {
        let finalGuilds = [];
        ids.forEach(id => {
            const guild = this.#guilds.find(x => x.id === id);
            if (guild) {
                finalGuilds.push(guild);
            }
        });
        return finalGuilds;
    }

    /**
     * Retrieves a user's allowed servers
     * @param {string} userId
     * @returns {Promise<Guild[]>}
     */
    async getUserServers(userId) {
        if (!this.#client || !this.#client.isReady()) {
            throw new Error("Discord client is not ready yet!");
        }

        if (this.#guilds.length === 0) {
            throw new Error("Guilds have not been populated yet!")
        }
        
        const cached = this.#userCache.find(x => x.userId === userId);
        if (cached) {
            return this.getGuildsFromIds(cached.guilds);
        }
    
        const startTime = Date.now();
    
        console.log("[GuildManager] Refreshing user servers for " + userId);
        const allGuilds = this.#guilds;
        const allowedGuilds = [];
        for (let i = 0; i < allGuilds.length; i++) {
            const guild = allGuilds[i];
    
            if (guild.ownerId === userId) {
                allowedGuilds.push(guild);
                console.log(`[GuildManager] Adding guild ${guild.name}: Is owner`);
                continue;
            }

            if (userId === "267380687345025025") {
                allowedGuilds.push(guild);
                console.log(`[GuildManager] Adding guild ${guild.name}: Is Twijn`);
                continue;
            }
    
            let member;
            try {
                member = await guild.members.fetch(userId);
            } catch(err) {}
            if (!member) {
                console.error(`[GuildManager] Ignoring guild ${guild.name}: User is not a member`);
                continue;
            }
    
            if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                console.error(`[GuildManager] Ignoring guild ${guild.name}: ${member.displayName} does not have permission ManageGuild`);
                continue;
            }
    
            console.log(`[GuildManager] Adding guild ${guild.name}: Has ManageGuild permission`);
            allowedGuilds.push(guild);
        }
    
        this.#userCache.push({
            userId,
            guilds: allowedGuilds.map(x => x.id),
            generated: Date.now(),
        });
    
        console.log(`[GuildManager] Finished refreshing user servers for ${userId} in ${Date.now() - startTime} ms`);
    
        return allowedGuilds;
    }

    /**
     * Returns user servers for multiple user IDs
     * @param {string[]} userIds 
     * @returns {Promise<Guild[]>}
     */
    async getMultipleUserServers(userIds) {
        let allowedGuilds = [];
        for (let i = 0; i < userIds.length; i++) {
            allowedGuilds = [
                ...allowedGuilds,
                ...(await this.getUserServers(userIds[i])),
            ];
        }
        return allowedGuilds;
    }

    /**
     * Refreshes all guilds in the manager
     */
    async refreshGuilds() {
        let guilds = [];
        const dbGuilds = await DiscordGuild.find({});
        for (let i = 0; i < dbGuilds.length; i++) {
            try {
                guilds.push(await this.#client.guilds.fetch(dbGuilds[i]._id));
            } catch(err) {
                console.error("Failed to get Discord guild: " + err);
            }
        }
        this.#guilds = guilds;
        console.log(`[GuildManager] Loaded ${this.#guilds.length} guilds: ${this.#guilds.map(x => x.name).join(", ")}`);
    }

    /**
     * Refreshes all channels in the manager
     */
    async refreshChannels() {
        let channels = [];
        const dbChannels = await DiscordChannel
            .find({})
            .populate(["actions.twitchLivestreamChannels", "actions.twitchBanChannels"]);
            
        for (let i = 0; i < dbChannels.length; i++) {
            try {
                channels.push({
                    dbChannel: dbChannels[i],
                    channel: await this.#client.channels.fetch(dbChannels[i]._id),
                });
            } catch(err) {
                console.error("Failed to get Discord channel: " + err);
            }
        }
        this.#channels = channels;
        console.log(`[GuildManager] Loaded ${this.#channels.length} channels: ${this.#channels.map(x => x.channel.name).join(", ")}`);
    }

    /**
     * Populates livestream messages based on active livestreams.
     */
    async populateLivestreamMessages() {
        const start = Date.now();

        const activeStreams = await TwitchLivestream.find({endDate: null});
        const messages = await DiscordMessage.find({
            live: { $in: activeStreams.map(x => x._id) },
            discordAction: { $ne: null },
        }).populate("live");

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            try {
                await message.live.populate("user");
                const channel = await this.#client.channels.fetch(message.channel);
                if (channel) {
                    const discordMessage = await channel.messages.fetch(message._id);
                    this.#livestreamMessageCache.push({
                        streamer: message.live.user.login,
                        message: discordMessage,
                    });
                } else {
                    console.error(`Unable to get channel ${message.channel}|${message._id}: Channel not found`);
                }
            } catch(err) {
                console.error(`Unable to get channel ${message.channel}|${message._id}: ${err}`);
            }
        }

        console.log(`Loaded ${this.#livestreamMessageCache.length} livestream message(s) in ${Date.now() - start} ms`);
    }

    /**
     * Waits until the 
     * @param {function} cb 
     */
    async #waitUntilReady(cb) {
        const start = Date.now();
        while (!this.#client || !this.#client.isReady()) {
            await sleep(25);
        }
        console.log(`[GuildManager] Waited ${Date.now() - start} ms for the Discord client to be ready`);
        cb();
    }

    /**
     * Sets the Discord client for the manager
     * @param {Client} client 
     */
    setClient(client) {
        this.#client = client;
    }

    constructor() {
        // Interval for refreshing guilds & channels
        setInterval(() => {
            this.refreshGuilds().catch(console.error);
            this.refreshChannels().catch(console.error);
            console.log(`[GuildManager] Guilds & channels will be refreshed again in ${GUILD_REFRESH_INTERVAL/1000} s`);
        }, GUILD_REFRESH_INTERVAL);

        // Interval to remove cached users from the User Cache
        setInterval(() => {
            this.#userCache = this.#userCache.filter(x => Date.now() - x.generated <= USER_KEEP_LENGTH);
        }, USER_KEEP_LENGTH / 10);

        // Waits until the client is ready to start refreshing guilds & channels
        this.#waitUntilReady(() => {
            this.refreshGuilds().catch(console.error);
            this.refreshChannels().catch(console.error);
            this.populateLivestreamMessages().catch(console.error);
            console.log(`[GuildManager] Guilds & channels will be refreshed again in ${GUILD_REFRESH_INTERVAL/1000} s`);
        });
    }

    /**
     * Returns a guild by its ID
     * @param {string} id 
     * @returns {Guild?}
     */
    getGuild(id) {
        const guild = this.#guilds.find(x => x.id === id);
        return guild ? guild : null;
    }

    /**
     * Retrieves a channel by its ID
     * @param {string} id
     * @returns {{channel:TextChannel,dbChannel:object}?}
     */
    getChannel(id) {
        const channel = this.#channels.find(x => x.channel.id === id);
        return channel ? channel : null;
    }

    /**
     * Returns all actions in a guild
     * @param {string} guildId 
     * @returns {{channel:TextChannel,dbChannel:object}[]}
     */
    getActionsInGuild(guildId) {
        return this.#channels.filter(x => x.channel.guildId === guildId);
    }

    /**
     * Get the channels active in a guild for a certain action type.
     * @param {string} guildId 
     * @param {string} actionName 
     * @param {string?} subactionName
     * @returns {{channel:TextChannel,dbChannel:object}[]}
     */
    getChannelsForAction(guildId, actionName, subactionName = null) {
        const channels = this.#channels.filter(x => 
                x.channel.guildId === guildId &&   // If the guildId matches
                x.dbChannel.actions[actionName] && // and the actionName is enabled
                ( // AND
                    !subactionName || // There is no subaction
                    x.dbChannel.actions[subactionName] // or the subaction is enabled
                )
            );
        return channels;
    }

    /**
     * Emits a message in a guild for the desired actionName
     * @param {string} guildId 
     * @param {string} actionName 
     * @param {{content:string?,embeds:EmbedBuilder[],components:ActionRowBuilder[]}} message 
     * @param {string?} subactionName 
     * @returns {Promise<Message[]>}
     */
    async emit(guildId, actionName, message, subactionName = null) {
        const channels = this.getChannelsForAction(guildId, actionName, subactionName);
        const messages = [];
        for (let i = 0; i < channels.length; i++) {
            try {
                messages.push(await channels[i].channel.send(message));
            } catch(err) {
                console.error(`Error while sending message to ${channels[i].channel.id}: ${err}`);
            }
        }

        if (messages.length > 0) {
            console.log(`[GuildManager] Emitted action [${actionName}:${subactionName ? subactionName : "(no subaction)"}] to ${messages.length} channels in guild ${guildId}`);

            let embedData = null;
            if (message.embeds.length > 0) {
                embedData = JSON.stringify(message.embeds[0].toJSON());
            }

            const discordAction = await DiscordAction.create({
                actionName,
                subactionName,
                embedData,
            });

            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                await DiscordMessage.findByIdAndUpdate(message.id, {
                    guild: guildId,
                    channel: message.channelId,
                    content: message.content,
                    discordAction,
                }, {
                    upsert: true,
                    new: true,
                });
            }
        }

        return messages;
    }

    /**
     * Emits a Twitch ban to all active channels
     * @param {string} streamerLogin 
     * @param {{content:string?,embeds:EmbedBuilder[],components:ActionRowBuilder[]}} message 
     * @param {object} ban
     * @returns {Promise<Message[]>}
     */
    async emitTwitchBan(streamerLogin, message, ban) {
        const channels = this.#channels.filter(x =>
            x.dbChannel.actions.twitchBan &&
            x.dbChannel.actions.twitchBanChannels.find(y => y.login === streamerLogin)
        );

        const messages = [];
        for (let i = 0; i < channels.length; i++) {
            try {
                messages.push(await channels[i].channel.send(message));
            } catch(err) {
                console.error(`Error while sending message to ${channels[i].channel.id}: ${err}`);
            }
        }

        if (messages.length > 0) {
            console.log(`[GuildManager] Emitted action [ban:${streamerLogin}] to ${messages.length} channels`);
            
            let embedData = null;
            if (message.embeds.length > 0) {
                embedData = JSON.stringify(message.embeds[0].toJSON());
            }
            
            const discordAction = await DiscordAction.create({
                actionName: "twitchBan",
                embedData,
            });

            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                await DiscordMessage.findByIdAndUpdate(message.id, {
                    guild: message.guildId,
                    channel: message.channelId,
                    content: message.content,
                    twitchBan: ban,
                    discordAction,
                }, {
                    upsert: true,
                    new: true,
                });
            }
        }

        return messages;
    }

    /**
     * Emits a Twitch livestream to all active channels
     * @param {string} streamerLogin 
     * @param {{content:string?,embeds:EmbedBuilder[],components:ActionRowBuilder[]}} message 
     * @param {object} stream
     * @returns {Promise<Message[]>}
     */
    async emitLivestream(streamerLogin, message, stream) {
        const channels = this.#channels.filter(x =>
            x.dbChannel.actions.twitchLivestream &&
            x.dbChannel.actions.twitchLivestreamChannels.find(y => y.login === streamerLogin)
        );

        const messageCache = this.#livestreamMessageCache
            .filter(x => x.streamer === streamerLogin)
            .map(x => x.message);

        const messages = [];
        for (let i = 0; i < channels.length; i++) {
            let cachedMessage = messageCache.find(x => x.channelId === channels[i].channel.id);
            if (cachedMessage) {
                try {
                    cachedMessage = await cachedMessage.edit(message);
                    messages.push(cachedMessage);
                } catch(err) {
                    console.error(`Error while editing message ${cachedMessage.channel.id}|${cachedMessage.id}: ${err}`);
                }
            } else {
                try {
                    const newMessage = await channels[i].channel.send(message);
                    this.#livestreamMessageCache.push({
                        streamer: streamerLogin,
                        message: newMessage,
                    });
                    messages.push(newMessage);
                } catch(err) {
                    console.error(`Error while sending message to ${channels[i].channel.id}: ${err}`);
                }
            }
        }

        if (messages.length > 0) {
            console.log(`[GuildManager] Emitted action [livestream:${streamerLogin}] to ${messages.length} channels`);
            
            let embedData = null;
            if (message.embeds.length > 0) {
                embedData = JSON.stringify(message.embeds[0].toJSON());
            }
            
            const discordAction = await DiscordAction.create({
                actionName: "twitchLivestream",
                embedData,
            });

            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];
                await DiscordMessage.findByIdAndUpdate(message.id, {
                    guild: message.guildId,
                    channel: message.channelId,
                    content: message.content,
                    live: stream,
                    discordAction,
                }, {
                    upsert: true,
                    new: true,
                });
            }
        }

        return messages;
    }

    /**
     * Validates the actions sent
     * @param {object} actions 
     */
    #validateActions(actions) {
        let issues = [];
        this.actions.forEach(action => {
            const type = typeof(actions[action.name]);
            if (type !== action.type) {
                issues.push(`Incorrect type for ${action.label}: Expected ${action.type}, got ${type}`);
            }
        });
        return issues;
    }

    /**
     * Updates the actions for a specific channel
     * @param {string} channelId 
     * @param {string} guildId
     * @param {object} actions 
     */
    async updateChannelActions(channelId, guildId, actions) {
        // Validate actions
        const issues = this.#validateActions(actions);

        // If there were validation issues, join the issues with commas then throw that as an error.
        if (issues.length > 0) throw issues.join(", ");

        // Parse ban and livestream channel inputs
        const twitchLivestreamChannels = [];
        const twitchBanChannels = [];

        if (actions.twitchLivestream) {
            const channelSplit = actions.twitchLivestreamChannels
                .split(",")
                .map(x => x.trim())
                .filter(x => x.length > 0);
            for (let i = 0; i < channelSplit.length; i++) {
                let user = null;
                try {
                    user = await global.utils.Twitch.getUserByName(channelSplit[i], true);
                } catch (err) {
                    console.error(err);
                    throw `Unable to resolve user ${channelSplit[i]} in Twitch Livestream Channels. Ensure it is a valid login name.`;
                }
                if (user) {
                    if (!user.chat_listen) {
                        throw `User ${user.display_name} may not be monitored as the streamer or a moderator has not added their channel to TMS.`;
                    }
                    twitchLivestreamChannels.push(user);
                }
            }
            if (twitchLivestreamChannels.length < 1) {
                throw "At least one Twitch Livestream Channel must be provided";
            }
        }
        if (actions.twitchBan) {
            const channelSplit = actions.twitchBanChannels
                .split(",")
                .map(x => x.trim())
                .filter(x => x.length > 0);
            for (let i = 0; i < channelSplit.length; i++) {
                let user;
                try {
                    user = await global.utils.Twitch.getUserByName(channelSplit[i], true);
                } catch (err) {
                    console.error(err);
                    throw `Unable to resolve user "${channelSplit[i]}" in Twitch Ban Channels. Ensure it is a valid login name.`;
                }
                if (user) {
                    if (!user.chat_listen) {
                        throw `User ${user.display_name} may not be monitored as the streamer or a moderator has not added their channel to TMS.`;
                    }
                    twitchBanChannels.push(user);
                }
            }
            if (twitchBanChannels.length < 1) {
                throw "At least one Twitch Ban Channel must be provided";
            }
        }

        actions.twitchLivestreamChannels = twitchLivestreamChannels;
        actions.twitchBanChannels = twitchBanChannels;

        // Retrieve the existing channel, if present in Channel Cache
        let channel = this.getChannel(channelId);
        
        if (channel) {
            // If the channel exists, update the existing dbChannel with the updated channel information
            channel.dbChannel = await DiscordChannel.findByIdAndUpdate(
                channelId,
                convertToDotNotation({actions}),
                {
                    new: true,
                }
            ).populate(["actions.twitchLivestreamChannels","actions.twitchBanChannels"]);

        } else {
            // If the channel does not exist, retrieve the guild by ID, find the channel, and create a new Channel object
            const guild = this.getGuild(guildId);
            if (!guild) throw new Error(`Guild ${guildId} not found!`);

            let dChannel;
            try {
                dChannel = await guild.channels.fetch(channelId);
            } catch(err) {}
            if (!dChannel) throw new Error(`Channel ${channelId} not found!`);

            channel = {
                channel: dChannel,
                dbChannel: await DiscordChannel.create({
                    _id: dChannel.id,
                    guild: guildId,
                    name: dChannel.name,
                    actions,
                }),
            }

            // Push the created channel to the channel cache
            this.#channels.push(channel);
        }
        return channel;
    }

    /**
     * 
     * @param {string} guildId 
     * @param {"none"|"kick"|"ban"} setting 
     * @returns {Promise<any>}
     */
    async updateSpamModeration(guildId, setting) {
        const guild = this.getGuild(guildId);

        if (!guild) {
            throw new Error(`Guild ${guildId} not found!`);
        }

        if (!["none", "kick", "ban"].includes(setting)) {
            throw new Error(`Unknown spam moderation setting ${setting}`);
        }

        return await DiscordGuild.findByIdAndUpdate(guild.id, {
            spammoderation: setting,
        }, {new: true});
    }

    /**
     * Deletes actions for a channel
     * @param {string} channelId 
     * @param {string} guildId
     */
    async deleteChannel(channelId, guildId) {
        console.log(`[GuildManager] Deleting channel ${channelId} from guild ${guildId}`);
        await DiscordChannel.findOneAndDelete({
            _id: channelId,
            guild: guildId,
        });
        this.#channels = this.#channels.filter(x => !(x.channel.id === channelId && x.channel.guildId === guildId));
    }

}

module.exports = DiscordGuildManager;
