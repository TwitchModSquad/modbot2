const { ThreadChannel } = require("discord.js");

const utils = require("../../../utils/");

const listener = {
    name: 'deleteThread',
    eventName: 'threadDelete',
    eventType: 'on',
    /**
     * Listens for deleted threads and removes them from ArchiveMessage/DiscordMessage
     * @param {ThreadChannel} channel
     */
    async listener (channel) {
        console.log(`Deleting all stored messages with channel ID ${channel.id} due to deletion of thread ${channel.name}`);
        // Also delete messages with channel ID for archive messages.
        utils.Schemas.ArchiveMessage.deleteMany({$or: [{channel: channel.id}, {message: channel.id}]}).catch(console.error);
        utils.Schemas.DiscordMessage.deleteMany({channel: channel.id}).catch(console.error);
    }
};

module.exports = listener;
