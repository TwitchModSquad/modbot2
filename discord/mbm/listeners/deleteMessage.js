const { Message } = require("discord.js");

const utils = require("../../../utils/");

const listener = {
    name: 'deleteMessage',
    eventName: 'messageDelete',
    eventType: 'on',
    /**
     * Listens for deleted messages and deletes from the database
     * @param {Message} message 
     */
    async listener (message) {
        if (!message.inGuild()) return;

        console.log(`Deleting stored messages with ID ${message.id}`);
        utils.Schemas.DiscordMessage.findByIdAndDelete(message.id).catch(console.error);
        utils.Schemas.ArchiveMessage.deleteMany({id: message.id}).catch(console.error);
    }
};

module.exports = listener;
