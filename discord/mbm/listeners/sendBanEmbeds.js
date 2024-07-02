const { Message } = require("discord.js");

const config = require("../../../config.json");
const utils = require("../../../utils/");

const BAN_LINK_REGEX = /https?:\/\/discorda?p?p?.com\/channels\/\d+\/\d+\/(\d+)/g;

const listener = {
    name: 'sendBanEmbeds',
    eventName: 'messageCreate',
    eventType: 'on',
    /**
     * Listens for Welcome messages and waves to them
     * @param {Message} message 
     */
    async listener (message) {
        if (!message.inGuild()) return;
        if (message.guild.id !== config.discord.guilds.modsquad) return;
        if (message.member.id === config.discord.mbm.id) return;

        if (message.content.length < 20) return;

        let matches = [...message.content.matchAll(BAN_LINK_REGEX)];

        let urls = [];
        let embeds = [];

        for (let i = 0; i < matches.length; i++) {
            const message = await utils.Schemas.DiscordMessage.findById(matches[i][1])
                .populate(["twitchBan","discordBan","discordKick"]);

            if (message?.twitchBan || message?.discordBan || message?.discordKick) {
                urls.push(matches[i][0]);
            }

            if (message?.twitchBan) {
                embeds.push((await message.twitchBan.message()).embeds[0]);
            } else if (message?.discordBan) {
                embeds.push(await message.discordBan.embed());
            } else if (message?.discordKick) {
                embeds.push(await message.discordKick.embed());
            }

            if (embeds.length > 9) break;
        }

        if (embeds.length > 0) {
            message.reply({content: urls.join(" "), embeds});
        }
    }
};

module.exports = listener;
