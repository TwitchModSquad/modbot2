const { Message } = require("discord.js");

const config = require("../../../config.json");
const utils = require("../../../utils/");

const listener = {
    name: 'messagePointRevoke',
    eventName: 'messageDelete',
    eventType: 'on',
    /**
     * Listens for deleted messages and revokes points
     * @param {Message} message 
     */
    async listener (message) {
        if (!message.inGuild()) return;
        if (message.guild.id !== config.discord.guilds.modsquad
            && message.guild.id !== config.discord.guilds.little_modsquad
            && message.guild.id !== config.discord.guilds.community_lobbies) return;

        const reward = await utils.Schemas.PointLog.findOne({message: message.id});
        if (!reward || reward.cancelDate !== null) return;

        let identity;
        try {
            const discord = await utils.Discord.getUserById(message.member.id);
            if (!discord?.identity) return;
            identity = discord.identity;
        } catch(err) {
            return;
        }

        identity.points -= reward.amount + (reward.bonus ? reward.bonus : 0);
        identity.points = Math.max(identity.points, 0);
        await identity.save();

        reward.cancelDate = Date.now();
        await reward.save();
    }
};

module.exports = listener;
