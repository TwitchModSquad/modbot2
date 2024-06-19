const { ChatMessage } = require("@twurple/chat");
const ListenClient = require("../ListenClient");
const utils = require("../../utils/");

const COOLDOWN_LENGTH = 15000;

let cooldown = null;
const command = {
    name: "tmsstats",
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
        if (cooldown && Date.now() - cooldown < COOLDOWN_LENGTH) return;

        const twitchUsers = await utils.Schemas.TwitchUser.estimatedDocumentCount();
        const twitchChats = await utils.Schemas.TwitchChat.estimatedDocumentCount();
        const twitchTOs = await utils.Schemas.TwitchTimeout.estimatedDocumentCount();
        const twitchBans = await utils.Schemas.TwitchBan.estimatedDocumentCount();

        const discordUsers = await utils.Schemas.DiscordUser.estimatedDocumentCount();

        const totalActiveChannels =
                global.client.listen.member.client.channels.length +
                global.client.listen.partner.client.channels.length +
                global.client.listen.affiliate.client.channels.length;

        reply(`TMS Stats -> ` +
                `${utils.comma(twitchUsers)} Twitch Users | ` +
                `${utils.comma(twitchChats)} Twitch Chats | ` +
                `${utils.comma(twitchTOs)} Twitch T/Os | ` +
                `${utils.comma(twitchBans)} Twitch Bans | ` +
                `${utils.comma(discordUsers)} Discord Users | ` +
                `Listening to ${utils.comma(totalActiveChannels)} channels`);

        cooldown = Date.now();
    }
}

module.exports = command;
