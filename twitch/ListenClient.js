const { ChatMessage, ClearChat } = require("@twurple/chat")
const fs = require('fs');

const utils = require("../utils/");
const config = require("../config.json");

const ListenShard = require("./ListenShard");

const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));

const twitchListeners = grabFiles('./twitch/listeners');

const io = require("@pm2/io");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class ListenClient {

    /**
     * Represents the type of client
     * @type {"member"|"partner"|"affiliate"}
     */
    type;

    /**
     * Represents the ListenShards
     * @type {ListenShard[]}
     */
    shards = [];

    /**
     * Channels that could not be joined due to excessive concurrent channels
     * @type {{user:string,reason:string}[]}
     */
    unjoined = [];

    /**
     * Holds listeners for TMI events
     */
    listeners = {
        message: [],
        timeout: [],
        ban: [],
    };

    /**
     * Stores a key-object pair of the number of bans in a minute in each channel
     */
    bannedPerMinute = {};

    /**
     * Wraps listener parameters to be more TMS friendly than TMI functions
     */
    listenerWrappers = {
        /**
         * @param {string} channel 
         * @param {string} user 
         * @param {string} message 
         * @param {ChatMessage} msg 
         * @returns 
         */
        message: async (channel, user, message, msg) => {
            try {
                if (msg.channelId === null) return;
                
                let streamer = await utils.Twitch.getUserById(msg.channelId, false, true);
                let chatter = await utils.Twitch.getUserById(msg.userInfo.userId, false, true);
        
                this.listeners.message.forEach(func => {
                    try {
                        func(this, streamer, chatter, msg, message, msg.userInfo.userId === config.twitch.id);
                    } catch (e) {
                        console.error(e);
                    }
                });
            } catch (e) {
                console.error(e);
            }
        },
        /**
         * 
         * @param {string} channel 
         * @param {string} user 
         * @param {number} duration 
         * @param {ClearChat} msg 
         */
        timeout: async (channel, user, duration, msg) => {
            try {
                if (msg.targetUserId === null) return;

                let streamer = await utils.Twitch.getUserById(msg.channelId, false, true);
                let chatter = await utils.Twitch.getUserById(msg.targetUserId, false, true);
        
                this.listeners.timeout.forEach(func => {
                    try {
                        func(this, streamer, chatter, duration, msg.date, msg);
                    } catch (e) {
                        console.error(e);
                    }
                });
            } catch (e) {
                console.error(e);
            }
        },
        /**
         * @param {string} channel 
         * @param {string} user 
         * @param {ClearChat} msg 
         */
        ban: async (channel, user, msg) => {
            try {
                let streamer = await utils.Twitch.getUserById(msg.channelId, false, true);
                let chatter = await utils.Twitch.getUserById(msg.targetUserId, false, true);

                if (!this.bannedPerMinute.hasOwnProperty(streamer._id)) this.bannedPerMinute[streamer._id] = [];
                this.bannedPerMinute[streamer._id] = [
                    ...this.bannedPerMinute[streamer._id],
                    Date.now(),
                ]
                
                this.listeners.ban.forEach(func => {
                    try {
                        func(this, streamer, chatter, msg.date, msg, this.bannedPerMinute[streamer._id].length);
                    } catch (e) {
                        console.error(e);
                    }
                });
            } catch (e) {
                console.error(e);
            }
        },
    }

    /**
     * Unknown listeners. These listeners are added to the ChatClient manually, without any wrapping.
     * @type {{name:string,eventName:string,listener:function}[]}
     */
    unknownListeners = [];

    /**
     * Adds channel to channel list & joins it if the client is initialized
     * @param {{_id:string,login:string}} user 
     * @returns {Promise<ListenShard?>}
     */
    async join(user) {
        if (this.getShardFor(user.login)) {
            return console.warn(`Attempted to join ${channel}, but they have already been joined!`);
        }

        const moderators = (await user.getMods()).map(x => x.moderator);
        
        // First critera: TwitchModSquad is a moderator, use their shard!
        if (moderators.find(x => x._id === config.twitch.id) || user._id === config.twitch.id) {
            let tmsShard = this.shards.find(x => x.type === "tms");
            while (!tmsShard) {
                console.warn("No TMS client present. Retrying");
                tmsShard = this.shards.find(x => x.type === "tms");
                await delay(1000);
            }
            tmsShard.join(user.login).catch(console.error);
            return tmsShard;
        }

        // Second criteria: If the user is authorized, use their own shard!
        // Check if a user has an existing shard
        for (let i = 0; i < this.shards.length; i++) {
            const shard = this.shards[i];
            if (shard.type !== "user") continue;

            if (user._id === shard.user._id) {
                shard.join(user.login).catch(console.error);
                return shard;
            }
        }

        // Attept to get a shard for the user
        const tokens = await user.getTokens();
        if (tokens.find(x => x.tokenData.scope.includes("chat:read"))) {
            utils.Twitch.authProvider.addIntentsToUser(user._id, [`${user._id}:chat`]);
            const ownShard = new ListenShard(user, "user", `${user._id}:chat`);
            this.initializeShard(ownShard);
            ownShard.join(user.login).catch(console.error);
            return ownShard;
        }

        // Third criteria: If there already is a ListenShard with a moderator of the channel, use their shard!
        let existingModShard;

        for (let i = 0; i < this.shards.length; i++) {
            const shard = this.shards[i];
            if (shard.type !== "user") continue;

            for (let y = 0; y < moderators.length; y++) {
                const moderator = moderators[y];
                if (moderator._id === shard.user._id) {
                    existingModShard = shard;
                    break;
                }
            }

            if (existingModShard) break;
        }
        
        if (existingModShard) {
            existingModShard.join(user.login).catch(console.error);
            return existingModShard;
        }

        // Fourth criteria: Attempt to find a moderator with a chat:read token
        for (let i = 0; i < moderators.length; i++) {
            const moderator = moderators[i];
            const tokens = await moderator.getTokens();
            if (tokens.find(x => x.tokenData.scope.includes("chat:read"))) {
                utils.Twitch.authProvider.addIntentsToUser(moderator._id, [`${moderator._id}:chat`])
                const modShard = new ListenShard(moderator, "user", `${moderator._id}:chat`);
                this.initializeShard(modShard);
                modShard.join(user.login).catch(console.error);
                return modShard;
            }
        }

        // Fifth criteria: If there is enough space on the default shard, join that one!
        let defaultShard = this.shards.find(x => x.type === "default");
        while (!defaultShard) {
            defaultShard = this.shards.find(x => x.type === "default");
            console.warn("Unable to get default shard! Retrying");
            await delay(1000);
        }

        if (defaultShard.client.currentChannels.length >= 100) {
            this.unjoined.push({user: user.login, reason: "Concurrent Limit"});
            console.warn(`Unable to join ${user.login} due to excessive concurrent channels!`);
            return null;
        }

        try {
            await defaultShard.join(user.login);
            return defaultShard;
        } catch(err) {
            console.error(`Unable to join ${user.login}: ${err}`);
        }
        return null;
    }

    /**
     * Returns the shard for the specified channel, or null if they are not joined
     * @param {string} channelName 
     * @returns {ListenShard?}
     */
    getShardFor(channelName) {
        for (let i = 0; i < this.shards.length; i++) {
            const shard = this.shards[i];
            if (shard.client.currentChannels.includes("#" + channelName)) {
                return shard;
            }
        }
        return null;
    }

    /**
     * Returns the total channels in this ListenClient
     * @returns {number}
     */
    totalChannels() {
        let total = 0;
        this.shards.forEach(shard => {
            total += shard.totalChannels();
        });
        return total;
    }
    
    /**
     * Removes channel to channel list & parts from it if the client is initialized
     * @param {string} channel 
     */
    part(channel) {
        channel = channel.replace("#", "").toLowerCase();
        this.shards.forEach(shard => {
            shard.part(channel);
        });
    }

    initializeListeners() {
        for (const file of twitchListeners) {
            const listener = require(`./listeners/${file}`);

            if (this.listenerWrappers.hasOwnProperty(listener.eventName)) {
                if (!this.listeners.hasOwnProperty(listener.eventName)) this.listeners[listener.eventName] = [];

                this.listeners[listener.eventName] = [
                    ...this.listeners[listener.eventName],
                    listener.listener,
                ];
            } else {
                this.unknownListeners.push(listener);
                console.warn(`Unknown listener ${listener.name} used (of event name ${listener.eventName})`)
            }
        }
    }

    initializeBPMCounter() {
        setInterval(() => {
            for (const [streamer, timestampList] of Object.entries(this.bannedPerMinute)) {
                let now = Date.now();
                this.bannedPerMinute[streamer] = timestampList.filter(ts => now - ts < 60000);
            }
        }, 1000);
    }

    /**
     * Internal function to initialize the listeners to this client
     * @param {ListenShard} shard
     */
    initializeShard(shard) {
        shard.client.onJoin((channel, user) => {
            console.log(`[${shard.scope}] #${channel}: joined with user ${user}`);
        });
        
        shard.client.onJoinFailure((channel, reason) => {
            this.unjoined.push({
                user: channel,
                reason: String(reason),
            });
            console.warn(`[${shard.scope}] Unable to join channel ${channel}: ${reason}`);
        });

        shard.client.onMessage(this.listenerWrappers.message);
        shard.client.onTimeout(this.listenerWrappers.timeout);
        shard.client.onBan(this.listenerWrappers.ban);

        shard.client.onConnect(() => {
            if (shard.user) {
                console.log(`ListenClient ${shard.type} (${shard.user.login}) connected!`);
            } else {
                console.log(`ListenClient ${shard.type} connected!`);
            }
        });

        this.unknownListeners.forEach(listener => {
            shard.client.on(listener.eventName, listener.listener);
        });

        shard.client.connect();

        this.shards.push(shard);
    }

    /**
     * Creates the clients, initializes them, and connects to TMI
     */
    initialize() {
        this.initializeListeners();
        this.initializeBPMCounter();

        // Initialize default TMS shard
        const defaultShard = new ListenShard(null, "default", ["tms:chat"]);
        this.initializeShard(defaultShard);

        // Initialize TMS shard (for channels with TwitchModSquad as a moderator)
        const tmsShard = new ListenShard(null, "tms", ["tms:chat"]);
        this.initializeShard(tmsShard);
    }

    /**
     * Constructor for a ListenClient
     * @param {"member"|"partner"|"affiliate"} type 
     */
    constructor(type) {
        this.type = type;
    }

}

module.exports = ListenClient;