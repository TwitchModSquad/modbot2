const { ChatClient } = require("@twurple/chat");

const utils = require("../utils");

const delay = ms => new Promise(resolve => setInterval(resolve, ms));

class ListenShard {

    /**
     * The user that handles the shard
     * @type {{_id:string,login:string}?}
     */
    user;

    /**
     * The type of shard
     * @type {"default","tms","user"}
     */
    type;

    /**
     * The scope of the ChatClient
     * @type {string}
     */
    scope;

    /**
     * The client that handles the shard
     * @type {ChatClient}
     */
    client;

    /**
     * Joins a channel with this shard. Shorthand for ListenShard.client.join()
     * @param {string} channel
     * @returns {Promise<void>}
     */
    join(channel) {
        return new Promise(async (resolve, reject) => {
            while (!this.client.isConnected) {
                await delay(1000);
            }
            this.client.join(channel).then(resolve, reject);
        })
    }

    /**
     * Parts from the specified channel
     * @param {string} channel 
     * @returns {void}
     */
    part(channel) {
        return this.client.part(channel);
    }

    /**
     * Returns the total channels in this ListenShard
     * @returns {number}
     */
    totalChannels() {
        return this.client.currentChannels.length;
    }

    /**
     * Constructor for a ListenShard
     * @param {{_id:string,login:string}?} user 
     * @param {"default"|"tms"|"user"} type 
     * @param {string} scope
     */
    constructor(user, type, scope) {
        this.user = user;
        this.type = type;
        this.scope = scope;

        this.client = new ChatClient({
            authProvider: utils.Twitch.authProvider,
            authIntents: [scope],
        });
    }

}

module.exports = ListenShard;
