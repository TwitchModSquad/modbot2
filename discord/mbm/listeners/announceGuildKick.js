const { AuditLogEvent, GuildMember } = require("discord.js");

const utils = require("../../../utils/");

const waitFor = ms => new Promise((resolve, reject) => setTimeout(resolve, ms));

const listener = {
    name: 'announceGuildKick',
    eventName: 'guildMemberRemove',
    eventType: 'on',
    /**
     * Listens for player leaves to detect if they were kicked.
     * @param {GuildMember} member 
     */
    async listener (member) {
        const discordUser = await utils.Discord.getUserById(member.id, false, true);

        let auditLog = null;
        let reason = null;
        let executor = null;
        try {
            await waitFor(500);
            const auditLogs = await member.guild.fetchAuditLogs({type: AuditLogEvent.MemberKick});
            auditLogs.entries.each(entry => {
                if (auditLog) return;

                if (entry.targetId === member.id && new Date().getTime() < entry.createdAt.getTime() + 20_000) {
                    auditLog = entry;
                }
            });

            if (auditLog) {
                reason = auditLog.reason;
                executor = await utils.Discord.getUserById(auditLog.executorId, false, true);
            }
        } catch(err) {
            console.error("Failed to retrieve audit log: " + err);
        }

        if (!auditLog) {
            console.log(`${member.user.username} left guild ${member.guild.name}`);
            return;
        }
        console.log(`${member.user.username} was kicked from guild ${member.guild.name}`)

        const discordKick = await utils.Schemas.DiscordKick.create({
            guild: member.guild.id,
            user: discordUser,
            reason,
            executor,
        });

        const logMessage = async message => {
            try {
                await utils.Schemas.DiscordMessage.create({
                    _id: message.id,
                    guild: message.guild.id,
                    channel: message.channel.id,
                    discordKick,
                })
            } catch(err) {
                console.error(err);
            }
        }

        const message = await discordKick.message();

        utils.Discord.channels.ban.tms.send(message).then(logMessage, console.error);
        utils.Discord.channels.ban.tlms.send(message).then(logMessage, console.error);
    }
};

module.exports = listener;
