const utils = require("../../utils/");
const ListenClient = require('../ListenClient');
const { ChatMessage } = require('@twurple/chat');

const listener = {
    name: "wsMessage",
    eventName: "message",
    /**
     * Listener for a message
     * @param {ListenClient} client 
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {ChatMessage} msg 
     * @param {string} message 
     * @param {boolean} self
     */
    listener: async (client, streamer, chatter, msg, message, self) => {
        global.broadcast("chat", streamer._id, {
            id: msg.id,
            chatter: chatter.public(),
            badges: null, // TODO: Fix badges
            message: message,
        });
    }
};

module.exports = listener;