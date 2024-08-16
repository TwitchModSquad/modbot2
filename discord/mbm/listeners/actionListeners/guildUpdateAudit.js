const { GuildAuditLogsEntry, Guild, EmbedBuilder, codeBlock, cleanCodeBlockContent, SystemChannelFlagsBitField } = require("discord.js");

const utils = require("../../../../utils/");

const DEFAULT_TRANSFORM = x => codeBlock(cleanCodeBlockContent(x ? x : "Unset"));

const EXPLICIT_CONTENT = ["No filtering", "Filter users with no roles", "Filter all messages"];
const VERIFICATION = ["None", "Low - Verified Email", "Medium - Account Age > 5 Minutes", "High - Account Age > 10 Minutes", "Highest - Verified Phone"];

const ENUM_TRANSFORM = (x, enumTable) => codeBlock(x < enumTable.length ? enumTable[x] : "Unknown");

const shownChanges = {
    name: {
        title: "Name",
        transform: DEFAULT_TRANSFORM,
    },
    description: {
        title: "Description",
        transform: DEFAULT_TRANSFORM,
    },
    explicit_content_filter: {
        title: "Explicit Content Filter",
        transform: x => ENUM_TRANSFORM(x, EXPLICIT_CONTENT),
    },
    verification_level: {
        title: "Verification Level",
        transform: x => ENUM_TRANSFORM(x, VERIFICATION),
    },
    icon_hash: {
        title: "Icon Hash",
        transform: DEFAULT_TRANSFORM,
    },
    system_channel_id: {
        title: "System Channel Notifications",
        transform: x => x ? `<#${x}>` : "No Channel",
    },
};

const systemFlags = [
    {
        name: "Server setup tips",
        flag: SystemChannelFlagsBitField.Flags.SuppressGuildReminderNotifications,
    },
    {
        name: "Member join notifications",
        flag: SystemChannelFlagsBitField.Flags.SuppressJoinNotifications,
    },
    {
        name: "Member join stickers",
        flag: SystemChannelFlagsBitField.Flags.SuppressJoinNotificationReplies,
    },
    {
        name: "Server boost notifications",
        flag: SystemChannelFlagsBitField.Flags.SuppressPremiumSubscriptions,
    },
    {
        name: "Premium subscription notifications",
        flag: SystemChannelFlagsBitField.Flags.SuppressRoleSubscriptionPurchaseNotifications,
    },
    {
        name: "Premium subscription stickers",
        flag: SystemChannelFlagsBitField.Flags.SuppressRoleSubscriptionPurchaseNotificationReplies,
    },
];

const listener = {
    name: 'actionGuildUpdateAudit',
    eventName: 'guildAuditLogEntryCreate',
    eventType: 'on',
    /**
     * Listens for guild edit audit logs
     * @param {GuildAuditLogsEntry} log 
     * @param {Guild} guild
     */
    async listener (log, guild) {
        if (log.targetType !== "Guild" || log.actionType !== "Update") return;

        const validChanges = log.changes.filter(x => shownChanges.hasOwnProperty(x.key));
        if (validChanges.length === 0 && log.changes.filter(x => x.key === "system_channel_flags").length === 0) return;

        const executor = log.executor ? log.executor : await guild.members.fetch(log.executorId);

        const currentDate = Date.now();
        const embed = new EmbedBuilder()
            .setFooter({
                text: `${guild.name} - The Mod Squad`,
                iconURL: guild.iconURL(),
            })
            .setTitle("Guild Update")
            .setDescription(`The guild was edited${executor ? ` by <@${executor.id}>` : ""} at <t:${Math.floor(currentDate / 1000)}:f>`)
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

        if (validChanges.find(x => x.key === "icon_hash")) {
            embed.setThumbnail(guild.iconURL());
        }

        validChanges.forEach(change => {
            const changeSettings = shownChanges[change.key];
            if (!changeSettings) return;
            
            embed.addFields([
                {
                    name: "\u200B",
                    value: "\u200B",
                    inline: true,
                },
                {
                    name: `Old ${changeSettings.title}`,
                    value: changeSettings.transform(change.old),
                    inline: true,
                },
                {
                    name: `New ${changeSettings.title}`,
                    value: changeSettings.transform(change.new),
                    inline: true,
                },
            ]);
        });

        if (log.changes.find(x => x.key === "system_channel_flags")) {
            let oldFlags = "";
            let newFlags = "";

            const oldFlagBitfield = new SystemChannelFlagsBitField(log.changes.find(x => x.key === "system_channel_flags").old);

            systemFlags.forEach(flag => {
                let oldValue = !oldFlagBitfield.has(flag.flag);
                let newValue = !guild.systemChannelFlags.has(flag.flag);

                if (oldValue === newValue) return;

                oldFlags += `\n${flag.name}: ${oldValue}`;
                newFlags += `\n${flag.name}: ${newValue}`;
            });

            embed.addFields([
                {
                    name: `Old System Flags`,
                    value: codeBlock(cleanCodeBlockContent(oldFlags)),
                    inline: false,
                },
                {
                    name: `New System Flags`,
                    value: codeBlock(cleanCodeBlockContent(newFlags)),
                    inline: false,
                },
            ]);
        }

        utils.Discord.guildManager.emit(
            guild.id,
            "guildEdit",
            {embeds: [embed]}
        );
    }
};

module.exports = listener;
