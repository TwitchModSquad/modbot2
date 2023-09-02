const tmi = require("tmi.js");

const ListenClient = require("../ListenClient");

const command = {
    name: "restart",
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
        reply(`!restart`, false);
    }
}

module.exports = command;
