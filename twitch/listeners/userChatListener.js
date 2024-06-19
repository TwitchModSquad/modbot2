const utils = require("../../utils/");
const ListenClient = require('../ListenClient');
const { ChatMessage } = require('@twurple/chat');

const listener = {
    name: "userChatListener",
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
        utils.Schemas.TwitchUserChat.findOneAndUpdate({
            streamer,
            chatter,
        }, {
            streamer,
            chatter,
            $inc: {
                messages: 1,
            },
            last_message: Date.now(),
        }, {
            upsert: true,
            new: true,
        }).catch(console.error);
    }
};

module.exports = listener;
