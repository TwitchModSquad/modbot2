const { Message } = require("discord.js");

const {logMessageDelete} = require("./messageDeleteAudit");

const listener = {
    name: 'actionMessageDelete',
    eventName: 'messageDelete',
    eventType: 'on',
    /**
     * Listens for deleted messages
     * @param {Message} message 
     */
    async listener (message) {
        if (!message.inGuild()) return;
        if (message.author.bot) return;

        if (message.content.length === 0) {
            return;
        }
        
        logMessageDelete(message);
    }
};

module.exports = listener;
