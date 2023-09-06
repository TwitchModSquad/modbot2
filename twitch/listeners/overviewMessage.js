const tmi = require("tmi.js");

const utils = require("../../utils/");
const config = require("../../config.json");

const listener = {
    name: "overviewMessage",
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
        if (streamer._id !== config.twitch.id) return;

        global.overviewBroadcast("message", {
            id: tags.id,
            chatter: chatter.public(),
            badges: tags["badges-raw"],
            message: message,
        });
    }
};

module.exports = listener;