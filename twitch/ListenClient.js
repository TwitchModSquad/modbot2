const tmi = require('tmi.js');
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
     * Represents the TMI client
     * @type {tmi.Client}
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
        message: async (channel, tags, message, self) => {
            try {
                if (tags.hasOwnProperty("message-type") && tags["message-type"] === "whisper") return;
                if (!tags.hasOwnProperty("room-id") || !tags.hasOwnProperty("user-id")) return;
                
                let streamer = await utils.Twitch.getUserById(tags["room-id"], false, true);
                let chatter = await utils.Twitch.getUserById(tags["user-id"], false, true);
        
                this.listeners.message.forEach(func => {
                    try {
                        func(this, streamer, chatter, tags, message, self);
                    } catch (e) {
                        console.error(e);
                    }
                });
            } catch (e) {
                console.error(e);
            }
        },
        timeout: async (channel, username, reason, duration, userstate) => {
            try {
                let streamer = await utils.Twitch.getUserById(userstate["room-id"], false, true);
                let chatter = await utils.Twitch.getUserById(userstate["target-user-id"], false, true);
        
                this.listeners.timeout.forEach(func => {
                    try {
                        func(this, streamer, chatter, duration, userstate["tmi-sent-ts"], userstate);
                    } catch (e) {
                        console.error(e);
                    }
                });
            } catch (e) {
                console.error(e);
            }
        },
        ban: async (channel, username, reason, userstate) => {
            try {
                let streamer = await utils.Twitch.getUserById(userstate["room-id"], false, true);
                let chatter = await utils.Twitch.getUserById(userstate["target-user-id"], false, true);

                if (!this.bannedPerMinute.hasOwnProperty(streamer.id)) this.bannedPerMinute[streamer.id] = [];
                this.bannedPerMinute[streamer.id] = [
                    ...this.bannedPerMinute[streamer.id],
                    Date.now(),
                ]
        
                this.listeners.ban.forEach(func => {
                    try {
                        func(this, streamer, chatter, userstate["tmi-sent-ts"], userstate, this.bannedPerMinute[streamer.id].length);
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
            this.client.part(channel).catch(err => {
                if (err !== "No response from Twitch.") console.error(err);
            });
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
                this.client.on(listener.eventName, listener.listener);
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
            this.client.on("join", (channel, username, self) => {
                if (self && channel.replace("#","").toLowerCase() === config.twitch.username) {
                    joinedChannels.set("Bot");
                }
                if (self && lastJoinTime !== null) {
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

        this.client.on("message", this.listenerWrappers.message);
        this.client.on("timeout", this.listenerWrappers.timeout);
        this.client.on("ban", this.listenerWrappers.ban);
    }

    /**
     * Creates the client, initializes it, and connects to TMI
     */
    connect(username = config.twitch.username, password = config.twitch.oauth) {
        this.client = new tmi.Client({
            options: {
                debug: config.development,
                joinInterval: this.type === "member" ? 5000 : (this.type === "partner" ? 10000 : 15000),
                skipMembership: true,
            },
            connection: { reconnect: true },
            channels: this.channels,
            identity: {
                username: username,
                password: password,
            },
        });

        this.initialize();

        this.client.connect().catch(console.error);
    }

    /**
     * Returns if the bot is a moderator in a channel
     * @param {TwitchUser} streamer 
     * @return {boolean|null}
     */
    isMod(streamer) {
        const botState = this.client.userstate["#" + streamer.login];
        if (botState !== undefined) {
            return botState.mod;
        } else {
            return null;
        }
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