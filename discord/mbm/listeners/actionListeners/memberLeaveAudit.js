const { GuildAuditLogsEntry, Guild, EmbedBuilder, codeBlock, cleanCodeBlockContent, GuildMember, GuildBan, User } = require("discord.js");

const utils = require("../../../../utils/");

const LOG_WAIT_TIMEOUT = 2500; // 2.5 seconds
const LOG_CHECK_INTERVAL = 50; // check every 50 ms

const SEC_TO_MS = 1000;
const MIN_TO_MS = SEC_TO_MS * 60;
const HOR_TO_MS = MIN_TO_MS * 60;
const DAY_TO_MS = HOR_TO_MS * 24;
const MON_TO_MS = DAY_TO_MS * 30; // for simplicity, we assume 1 month = 30 days.
const YR_TO_MS = MON_TO_MS * 12; // for simplicity, we assume 1 year = 12 months = 360 days

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Transforms duration in MS to a relative time (ex: 1 month 3 days)
 * @param {number} ms 
 * @returns {string}
 */
const relativeTime = ms => {
    let msLeft = ms;
    let result = "";

    for (let i = 0; i < 2; i++) {
        let value = null;
        if (msLeft >= YR_TO_MS) {
            value = Math.floor(msLeft / YR_TO_MS);
            result += ` ${value} year${value === 1 ? "" : "s"}`;
            msLeft = msLeft % YR_TO_MS;
        } else if (msLeft >= MON_TO_MS) {
            value = Math.floor(msLeft / MON_TO_MS);
            result += ` ${value} month${value === 1 ? "" : "s"}`;
            msLeft = msLeft % MON_TO_MS;
        } else if (msLeft >= DAY_TO_MS) {
            value = Math.floor(msLeft / DAY_TO_MS);
            result += ` ${value} day${value === 1 ? "" : "s"}`;
            msLeft = msLeft % DAY_TO_MS;
        } else if (msLeft >= HOR_TO_MS) {
            value = Math.floor(msLeft / HOR_TO_MS);
            result += ` ${value} hour${value === 1 ? "" : "s"}`;
            msLeft = msLeft % HOR_TO_MS;
        } else if (msLeft >= MIN_TO_MS) {
            value = Math.floor(msLeft / MIN_TO_MS);
            result += ` ${value} minute${value === 1 ? "" : "s"}`;
            msLeft = msLeft % MIN_TO_MS;
        } else if (msLeft >= SEC_TO_MS) {
            value = Math.floor(msLeft / SEC_TO_MS);
            result += ` ${value} second${value === 1 ? "" : "s"}`;
            msLeft = msLeft % SEC_TO_MS;
        }
    }

    return result.trim();
}

const listener = {
    name: 'actionMemberLeaveAudit',
    eventName: 'guildAuditLogEntryCreate',
    eventType: 'on',
    /**
     * Stores tracked logs
     * @type {GuildAuditLogsEntry[]}
     */
    logStore: [],
    /**
     * Stores tracked bans
     * @type {GuildBan[]}
     */
    banStore: [],
    /**
     * Logs a guild ban
     * @param {GuildBan} ban 
     */
    logMemberBan(ban) {
        listener.banStore.push(ban);
    },
    /**
     * Logs a guildMemberRemove event from ./memberLeave and ./memberBan
     * @param {Guild} guild 
     * @param {User} user
     * @param {GuildMember?} member
     */
    async logMemberLeave(guild, user, member = null) {
        const currentDate = Date.now();
        const embed = new EmbedBuilder()
            .setFooter({
                text: `${guild.name} - The Mod Squad`,
                iconURL: guild.iconURL(),
            })
            .setTitle("Member Left")
            .setColor(0x772ce8)
            .setTimestamp(currentDate)
            .setAuthor({
                name: user.displayName,
                iconURL: user.displayAvatarURL(),
            });
        
        let foundLog = null;
        let foundBan = null;
        for (let i = 0; i < LOG_WAIT_TIMEOUT / LOG_CHECK_INTERVAL; i++) {
            foundLog = listener.logStore.find(
                    x => x.targetId === user.id
                )
            foundBan = listener.banStore.find(
                    x => x.user.id === user.id
                );
            
            if (foundLog && foundBan) break;

            await sleep(LOG_CHECK_INTERVAL);
        }

        if (foundLog) {
            embed
                .setTitle("Member Kicked")
                .addFields([
                    {
                        name: "Executor",
                        value: `<@${foundLog.executorId}>`,
                        inline: true,
                    },
                    {
                        name: "Reason",
                        value: codeBlock(cleanCodeBlockContent(foundLog.reason ? foundLog.reason : "No reason")),
                        inline: true,
                    }
                ]);
        }

        if (foundBan) {
            embed.setTitle("Member Banned");
        }

        embed.setDescription(`Member <@${user.id}> (${user.displayName}) ${foundLog ? `${foundBan ? "was banned by" : "was kicked by"} <@${foundLog.executorId}>` : "left"} at <t:${Math.floor(currentDate / 1000)}:f>`);

        if (member) {
            if (foundLog) {
                embed.addFields(
                    {
                        name: "\u200B",
                        value: "\u200B",
                        inline: true,
                    }
                );
            }
            embed.addFields([
                {
                    name: "Member Since",
                    value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:f>`,
                    inline: true,
                },
                {
                    name: "Membership Length",
                    value: `\`${relativeTime(currentDate - member.joinedTimestamp)}\``,
                    inline: true,
                },
            ])
        }

        utils.Discord.guildManager.emit(
            guild.id,
            "memberRemove",
            {embeds: [embed]},
            foundLog ? "memberRemoveKick" : "memberRemoveLeave"
        );
    },
    /**
     * Listens for member leave audit messages
     * @param {GuildAuditLogsEntry} log 
     * @param {Guild} guild
     */
    async listener (log, guild) {
        if (log.targetType !== "User" || log.actionType !== "Delete") return;

        listener.logStore.push(log);
    }
};

module.exports = listener;
