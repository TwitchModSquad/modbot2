const { Message } = require("discord.js");

const config = require("../../../config.json");
const utils = require("../../../utils/");

const listener = {
    name: 'messagePointReward',
    eventName: 'messageCreate',
    eventType: 'on',
    /**
     * Listens for Welcome messages and waves to them
     * @param {Message} message 
     */
    async listener (message) {
        if (!message.inGuild()) return;
        if (message.guild.id !== config.discord.guilds.modsquad
            && message.guild.id !== config.discord.guilds.little_modsquad
            && message.guild.id !== config.discord.guilds.community_lobbies) return;

        let identity;
        try {
            const discord = await utils.Discord.getUserById(message.member.id);
            if (!discord?.identity) return;
            identity = discord.identity;
        } catch(err) {
            return;
        }

        utils.Points.collectMessage(identity, message).catch(console.error);
    }
};

module.exports = listener;
