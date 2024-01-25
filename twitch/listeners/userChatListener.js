const tmi = require("tmi.js");

const utils = require("../../utils/");

const listener = {
    name: "userChatListener",
    eventName: "message",
    /**
     * 
     * @param {tmi.Client} client 
     * @param {*} streamer 
     * @param {*} chatter 
     * @param {tmi.ChatUserstate} tags 
     * @param {string} message 
     * @param {*} self 
     * @returns 
     */
    listener: async (client, streamer, chatter, tags, message, self) => {
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
