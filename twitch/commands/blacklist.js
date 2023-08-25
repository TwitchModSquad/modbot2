const tmi = require("tmi.js");

const ListenClient = require("../ListenClient");

const command = {
    name: "blacklist",
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
