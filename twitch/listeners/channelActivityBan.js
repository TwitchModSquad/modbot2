const { ClearChat } = require("@twurple/chat");
const utils = require("../../utils");
const ListenClient = require("../ListenClient");

const listener = {
    name: "channelActivityBan",
    eventName: "ban",
    /**
     * @param {ListenClient} client 
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {Date} timebanned 
     * @param {ClearChat} msg 
     * @param {number} bpm 
     * @returns 
     */
    listener: async (client, streamer, chatter, timebanned, msg, bpm) => {
        utils.StatsManager.addBan(streamer.display_name);
    }
};

module.exports = listener;
