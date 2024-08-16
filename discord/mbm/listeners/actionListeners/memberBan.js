const { GuildBan } = require("discord.js");

const {logMemberBan, logMemberLeave} = require("./memberLeaveAudit");

const listener = {
    name: 'actionMemberBan',
    eventName: 'guildBanAdd',
    eventType: 'on',
    /**
     * Listens for deleted messages
     * @param {GuildBan} ban 
     */
    async listener (ban) {
        if (ban.user.bot) return;
        logMemberBan(ban);
    }
};

module.exports = listener;
