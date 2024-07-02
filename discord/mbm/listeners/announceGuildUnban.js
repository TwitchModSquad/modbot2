const { GuildBan } = require("discord.js");

const utils = require("../../../utils/");

const listener = {
    name: 'announceGuildUnban',
    eventName: 'guildBanRemove',
    eventType: 'on',
    /**
     * Listens for unbans to add to the database TODO: Announce unban
     * @param {GuildBan} ban 
     */
    async listener (ban) {
        const discordBans = await utils.Schemas.DiscordBan.find({
            guild: ban.guild.id,
            user: ban.user.id,
            time_end: null,
        });

        for (let i = 0; i < discordBans.length; i++) {
            discordBans[i].time_end = new Date();
            await discordBans[i].save();
        }
    }
};

module.exports = listener;
