const tmi = require("tmi.js");

const ListenClient = require("../ListenClient");

const command = {
    name: "join",
    /**
     * Listener for a message
     * @param {ListenClient} client 
     * @param {any} streamer 
     * @param {any} chatter 
     * @param {tmi.ChatUserstate} tags 
     * @param {string} message 
     * @param {function} reply
     */
    execute: async (client, streamer, chatter, args, tags, message, reply) => {
        reply(`join TMS here: https://tms.to/join`);
    }
}

module.exports = command;
