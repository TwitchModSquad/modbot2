const { EmbedBuilder } = require("discord.js");
const utils = require("../utils/");

const listener = {
    event: "banAnnounce",
    /**
     * @param {*} streamer
     * @param {*} chatter
     * @param {{embeds:EmbedBuilder[]}} message
     * @param {number} bpm
     * @param {*} ban
     */
    func: (streamer, chatter, message, bpm, ban) => {
        if (typeof(message.embeds) !== "object" || message.embeds.length === 0) return;

        utils.Discord.guildManager.emitTwitchBan(streamer.login, {embeds: message.embeds}, ban).catch(console.error);
    }
}

module.exports = listener;
