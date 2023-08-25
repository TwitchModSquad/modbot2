const tmi = require("tmi.js");

const utils = require("../../utils/");
const ListenClient = require("../ListenClient");

const COOLDOWN_LENGTH = 15000;

let cooldown = null;
const command = {
    name: "tmsstats",
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
                `Listening to ${utils.comma(totalActiveChannels)} channels`, false);

        cooldown = Date.now();
    }
}

module.exports = command;
