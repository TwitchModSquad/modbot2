const { ClearChat } = require("@twurple/chat");
const utils = require("../../utils/");
const ListenClient = require("../ListenClient");

const listener = {
    name: "timeoutLog",
    eventName: "timeout",
    /**
     * 
     * @param {ListenClient} client 
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {number} duration 
     * @param {Date} timeto 
     * @param {ClearChat} msg 
     */
    listener: async (client, streamer, chatter, duration, timeto, msg) => {
        try {
            const timeout = await utils.Schemas.TwitchTimeout.create({
                streamer: streamer,
                chatter: chatter,
                duration: duration,
                time_end: Date.now() + (duration * 1000),
            });
        } catch(e) {
            console.error(e);
        }
    }
};

module.exports = listener;
