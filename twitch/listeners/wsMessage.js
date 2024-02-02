const tmi = require("tmi.js");

const listener = {
    name: "wsMessage",
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
        global.broadcast("chat", streamer._id, {
            id: tags.id,
            chatter: chatter.public(),
            badges: tags["badges-raw"],
            message: message,
        });
    }
};

module.exports = listener;