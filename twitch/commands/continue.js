const { ChatMessage } = require("@twurple/chat");
const ListenClient = require("../ListenClient");
const utils = require("../../utils/");

const command = {
    name: "continue",
    /**
     * Listener for a message
     * @param {ListenClient} client 
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {string[]} args
     * @param {ChatMessage} msg 
     * @param {string} message
     * @param {function} reply
     */
    execute: async (client, streamer, chatter, args, msg, message, reply) => {
        reply(`!continue`, false);
    }
}

module.exports = command;
