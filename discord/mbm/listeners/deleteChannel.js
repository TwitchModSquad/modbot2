const { GuildChannel } = require("discord.js");

const utils = require("../../../utils/");

const listener = {
    name: 'deleteChannel',
    eventName: 'channelDelete',
    eventType: 'on',
    /**
     * Listens for deleted guilds and removes them from ArchiveMessage/DiscordMessage
     * @param {GuildChannel} channel
     */
    async listener (channel) {
        console.log(`Deleting all stored messages with channel ID ${channel.id} due to deletion of #${channel.name}`);
        utils.Schemas.ArchiveMessage.deleteMany({channel: channel.id}).catch(console.error);
        utils.Schemas.DiscordMessage.deleteMany({channel: channel.id}).catch(console.error);
    }
};

module.exports = listener;
