const { Message } = require("discord.js");

const utils = require("../../../utils/");

const listener = {
    name: 'deleteMessage',
    eventName: 'messageDelete',
    eventType: 'on',
    /**
     * Listens for deleted messages and revokes points
     * @param {Message} message 
     */
    async listener (message) {
        if (!message.inGuild()) return;
        
        const dbMsg = await utils.Schemas.DiscordMessage.findById(message.id);
        if (dbMsg) {
            setTimeout(async () => {
                await dbMsg.deleteOne();
            }, 5000);
        }
    }
};

module.exports = listener;
