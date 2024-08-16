const { GuildChannel } = require("discord.js");

const utils = require("../../../../utils/");

const listener = {
    name: 'removeActionChannel',
    eventName: 'channelDelete',
    eventType: 'on',
    /**
     * Listens for deleted messages
     * @param {GuildChannel} channel 
     */
    async listener (channel) {
        if (!channel.guildId) return;
        
        utils.Discord.guildManager.deleteChannel(channel.id, channel.guildId).catch(console.error);
    }
};

module.exports = listener;
