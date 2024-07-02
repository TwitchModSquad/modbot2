const { GuildBan, AuditLogEvent } = require("discord.js");

const utils = require("../../../utils/");

const waitFor = ms => new Promise((resolve, reject) => setTimeout(resolve, ms));

const listener = {
    name: 'announceGuildBan',
    eventName: 'guildBanAdd',
    eventType: 'on',
    /**
     * Listens for bans to add to the database and announce in ban channels
     * @param {GuildBan} ban 
     */
    async listener (ban) {
        const discordUser = await utils.Discord.getUserById(ban.user.id, false, true);

        let reason = null;
        let executor = null;
        try {
            await waitFor(500);
            const auditLogs = await ban.guild.fetchAuditLogs({type: AuditLogEvent.MemberBanAdd});
            let auditLog = null;
            auditLogs.entries.each(entry => {
                if (auditLog) return;

                if (entry.targetId === ban.user.id && new Date().getTime() < entry.createdAt.getTime() + 20_000) {
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

        console.log(`${ban.user.username} was banned from guild ${ban.guild.name}`);

        const discordBan = await utils.Schemas.DiscordBan.create({
            guild: ban.guild.id,
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
                    discordBan,
                })
            } catch(err) {
                console.error(err);
            }
        }

        const message = await discordBan.message();

        utils.Discord.channels.ban.tms.send(message).then(logMessage, console.error);
        utils.Discord.channels.ban.tlms.send(message).then(logMessage, console.error);
    }
};

module.exports = listener;
