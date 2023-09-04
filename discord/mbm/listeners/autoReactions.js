const { Message, MessageType } = require("discord.js");

const config = require("../../../config.json");

const listener = {
    name: 'autoReactions',
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

        if (message.type === MessageType.UserJoin) {
            message.react('👋').catch(console.error);
        } else if (message.type === MessageType.GuildBoost) {
            message.react('🎉').catch(console.error);
        }
    }
};

module.exports = listener;
