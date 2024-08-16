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

const validChanges = [
    {
        name: "name",
        title: "Name",
        transform: DEFAULT_TRANSFORM,
    },
    {
        name: "type",
        title: "Type",
        transform: x => ENUM_TRANSFORM(x, CHANNEL_TYPE),
    },
    {
        name: "NSFW",
        title: "Not Safe For Work",
        transform: DEFAULT_TRANSFORM,
    },
    {
        name: "user_limit",
        title: "User Limit",
        transform: x => DEFAULT_TRANSFORM(`${x} User${x === 1 ? "" : "s"}`),
    },
    {
        name: "rate_limit_per_user",
        title: "Rate Limit",
        transform: x => DEFAULT_TRANSFORM(`${x} Second${x === 1 ? "" : "s"}`),
    },
    {
        name: "bitrate",
        title: "Voice Bitrate",
        transform: x => DEFAULT_TRANSFORM(`${Math.floor(x / 1000)} Kbps`),
    },
    {
        name: "rtc_region",
        title: "Voice Region Override",
        transform: DEFAULT_TRANSFORM,
    },
];

const listener = {
    name: 'actionChannelCreateAudit',
    eventName: 'guildAuditLogEntryCreate',
    eventType: 'on',
    /**
     * Listens for guild edit audit logs
     * @param {GuildAuditLogsEntry} log 
     * @param {Guild} guild
     */
    async listener (log, guild) {
        if (log.targetType !== "Channel" || log.actionType !== "Create") return;

        const executor = log.executor ? log.executor : await guild.members.fetch(log.executorId);

        const currentDate = Date.now();
        const embed = new EmbedBuilder()
            .setFooter({
                text: `${guild.name} - The Mod Squad`,
                iconURL: guild.iconURL(),
            })
            .setTitle("Channel Create")
            .setDescription(`A new channel <#${log.targetId}> was created${executor ? ` by <@${executor.id}>` : ""} at <t:${Math.floor(currentDate / 1000)}:f>`)
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
                name: "Link",
                value: `<#${log.targetId}>`,
                inline: true,
            }
        ]);

        validChanges.forEach(validChange => {
            const change = log.changes.find(x => x.key === validChange.name);
            if (!change) return;

            embed.addFields({
                name: validChange.title,
                value: validChange.transform(change.new),
                inline: true,
            });
        });

        utils.Discord.guildManager.emit(
            guild.id,
            "channelCreate",
            {embeds: [embed]}
        );
    }
};

module.exports = listener;
