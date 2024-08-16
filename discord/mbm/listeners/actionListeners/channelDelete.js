const { GuildAuditLogsEntry, Guild, EmbedBuilder, codeBlock, cleanCodeBlockContent, SystemChannelFlagsBitField } = require("discord.js");

const utils = require("../../../../utils/");

const DEFAULT_TRANSFORM = x => codeBlock(cleanCodeBlockContent(x ? x : "Unset"));

const CHANNEL_TYPE = [
    "Text Channel",
    "DM",
    "Voice Channel",
    "Group DM",
    "Category",
    "Announcement Channel",
    "Unknown", "Unknown", "Unknown", "Unknown",
    "Announcement Thread",
    "Public Thread",
    "Private Thread",
    "Stage Voice",
    "Directory",
    "Forum Channel",
    "Media Channel",
];

const ENUM_TRANSFORM = (x, enumTable) => codeBlock(x < enumTable.length ? enumTable[x] : "Unknown");

const listener = {
    name: 'actionChannelDeleteAudit',
    eventName: 'guildAuditLogEntryCreate',
    eventType: 'on',
    /**
     * Listens for guild edit audit logs
     * @param {GuildAuditLogsEntry} log 
     * @param {Guild} guild
     */
    async listener (log, guild) {
        if (log.targetType !== "Channel" || log.actionType !== "Delete") return;

        const executor = log.executor ? log.executor : await guild.members.fetch(log.executorId);

        const currentDate = Date.now();
        const embed = new EmbedBuilder()
            .setFooter({
                text: `${guild.name} - The Mod Squad`,
                iconURL: guild.iconURL(),
            })
            .setTitle("Channel Delete")
            .setDescription(`A channel #${log.target.name} was deleted${executor ? ` by <@${executor.id}>` : ""} at <t:${Math.floor(currentDate / 1000)}:f>`)
            .setColor(0x772ce8)
            .setTimestamp(currentDate)
            .addFields({
                name: "Reason",
                value: codeBlock(cleanCodeBlockContent(log.reason ? log.reason : "No reason")),
                inline: true,
            });
        
        if (executor) {
            embed
                .setAuthor({
                    iconURL: executor.displayAvatarURL(),
                    name: executor.displayName,
                })
                .addFields(
                    {
                        name: "Executor",
                        value: `<@${executor.id}>`,
                        inline: true,
                    },
                );
        }

        embed.addFields([
            {
                name: "Channel Name",
                value: DEFAULT_TRANSFORM(log.target.name),
                inline: true,
            },
            {
                name: "Channel Type",
                value: ENUM_TRANSFORM(log.target.type, CHANNEL_TYPE),
                inline: true,
            },
        ]);

        utils.Discord.guildManager.emit(
            guild.id,
            "channelDelete",
            {embeds: [embed]}
        );
    }
};

module.exports = listener;
