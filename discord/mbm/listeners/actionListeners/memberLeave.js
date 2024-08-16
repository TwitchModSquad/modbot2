const { GuildMember } = require("discord.js");

const {logMemberLeave} = require("./memberLeaveAudit");

const listener = {
    name: 'actionMemberRemove',
    eventName: 'guildMemberRemove',
    eventType: 'on',
    /**
     * Listens for deleted messages
     * @param {GuildMember} member 
     */
    async listener (member) {
        if (member.user.bot) return;
        logMemberLeave(member.guild, member.user, member);
    }
};

module.exports = listener;
