const { ChatMessage } = require("@twurple/chat");
const utils = require("../../utils/");
const ListenClient = require("../ListenClient");

const listener = {
    name: "channelActivityChat",
    eventName: "message",
    /**
     * 
     * @param {ListenClient} client 
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {ChatMessage} msg 
     * @param {string} message 
     * @param {boolean} self 
     */
    listener: async (client, streamer, chatter, msg, message, self) => {
        utils.StatsManager.addChat(streamer.display_name);
    }
};

module.exports = listener;