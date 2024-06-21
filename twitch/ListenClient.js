const { ChatClient, ChatMessage, ClearChat } = require("@twurple/chat")
const fs = require('fs');

const utils = require("../utils/");
const config = require("../config.json");

const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));

const TwitchUser = require("../utils/twitch/TwitchUser");

const twitchListeners = grabFiles('./twitch/listeners');

const io = require("@pm2/io");

const joinedChannels = io.metric({
    id: "app/realtime/joinedChannels",
    name: "Joined Channels",
});

joinedChannels.set("Joining...");

class ListenClient {

    /**
     * Represents the type of client
     * @type {"member"|"partner"|"affiliate"}
     */
    type;

    /**
     * Represents the twurple chat client
     * @type {ChatClient}
     */
    client;

    /**
     * Channels that the client is currently listening to
     * @type {string[]}
     */
    channels = [];

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
     * Adds channel to channel list & joins it if the client is initialized
     * @param {string} channel 
     */
    join(channel) {
        channel = channel.replace("#", "").toLowerCase();
        if (this.channels.includes(channel)) return;
        this.channels.push(channel);
        if (this.client)
            this.client.join(channel).catch(err => {
                this.channels = this.channels.filter(x => x !== channel);
                console.error("Error occurred while joining #" + channel + ":");
                console.error(err);
            });
    }
    
    /**
     * Removes channel to channel list & parts from it if the client is initialized
     * @param {string} channel 
     */
    part(channel) {
        channel = channel.replace("#", "").toLowerCase();
        this.channels = this.channels.filter(x => x !== channel);
        if (this.client)
            this.client.part(channel);
    }

    /**
     * Internal function to initialize the listeners to this client
     */
    initialize() {
        for (const file of twitchListeners) {
            const listener = require(`./listeners/${file}`);

            if (this.listenerWrappers.hasOwnProperty(listener.eventName)) {
                if (!this.listeners.hasOwnProperty(listener.eventName)) this.listeners[listener.eventName] = [];

                this.listeners[listener.eventName] = [
                    ...this.listeners[listener.eventName],
                    listener.listener,
                ];
            } else {
                this.client[listener.eventName](listener.listener);
            }
        }

        setInterval(() => {
            for (const [streamer, timestampList] of Object.entries(this.bannedPerMinute)) {
                let now = Date.now();
                this.bannedPerMinute[streamer] = timestampList.filter(ts => now - ts < 60000);
            }
        }, 1000);

        if (this.type === "member") {
            let lastJoinTime = Date.now();
            this.client.onJoin((channel, user) => {
                console.log(`#${channel}: join`)
                if (channel.replace("#","").toLowerCase() === config.twitch.username) {
                    joinedChannels.set("Bot");
                }
                if (lastJoinTime !== null) {
                    lastJoinTime = Date.now();
                }
            });
            const interval = setInterval(() => {
                if (Date.now() - lastJoinTime > 20000) {
                    joinedChannels.set("All");
                    clearInterval(interval);
                    lastJoinTime = null;
                }
            }, 5000);
        }

        this.client.onMessage(this.listenerWrappers.message);
        this.client.onTimeout(this.listenerWrappers.timeout);
        this.client.onBan(this.listenerWrappers.ban);
    }

    /**
     * Creates the client, initializes it, and connects to TMI
     */
    connect() {
        this.client = new ChatClient({
            authProvider: utils.Twitch.authProvider,
            channels: this.channels,
            authIntents: ["tms:chat"],
        });

        this.initialize();

        this.client.onConnect(() => {
            console.log(`ListenClient for ${this.type} connected!`);
        });

        setTimeout(() => {
            this.client.connect();
        }, 1000);
    }

    /**
     * 
     * @param {"member"|"partner"|"affiliate"} type 
     */
    constructor(type) {
        this.type = type;
    }

}

module.exports = ListenClient;