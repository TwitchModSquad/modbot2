const { ClearChat } = require("@twurple/chat");
const utils = require("../../utils/");
const ListenClient = require("../ListenClient");

const listener = {
    name: "channelActivityTimeout",
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
        utils.StatsManager.addTimeout(streamer.display_name);
    }
};

module.exports = listener;
