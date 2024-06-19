const { ChatMessage } = require("@twurple/chat");
const ListenClient = require("../ListenClient");
const utils = require("../../utils/");

const command = {
    name: "blacklist",
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
        chatter.chat_listen = chatter.chat_listen && chatter.blacklisted;
        chatter.blacklisted = !chatter.blacklisted;
        await chatter.save();
        if (chatter.blacklisted) {
            global.client.listen.member.part(chatter.login);
            global.client.listen.partner.part(chatter.login);
            global.client.listen.affiliate.part(chatter.login);
            reply(`TMS will no longer join your channel`).catch(console.error);
        } else {
            reply(`TMS ${chatter.chat_listen ? "will" : "may"} now join your channel`).catch(console.error);
        }
    }
}

module.exports = command;
