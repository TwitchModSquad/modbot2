const { GuildAuditLogsEntry, Guild, EmbedBuilder, codeBlock, cleanCodeBlockContent, GuildMember } = require("discord.js");

const utils = require("../../../../utils");

const listener = {
    name: 'actionMemberEditName',
    eventName: 'guildAuditLogEntryCreate',
    eventType: 'on',
    /**
     * Listens for deleted messages
     * @param {GuildAuditLogsEntry} log 
     * @param {Guild} guild
     */
    async listener (log, guild) {
        if (log.targetType !== "User" || log.actionType !== "Update") return;

        let change = log.changes.find(x => x.key === "nick");
        if (!change) return;

        const embed = new EmbedBuilder()
            .setFooter({
                text: `${guild.name} - The Mod Squad`,
                iconURL: guild.iconURL(),
            })
            .setTitle("Member Nickname Updated")
            .setColor(0x772ce8)
            .setTimestamp(Date.now())
            .setDescription(`The nickname of <@${log.targetId}> was updated by ${log.executorId === log.targetId ? "themselves" : `<@${log.executorId}>`} at <t:${Math.floor(Date.now() / 1000)}:f>`)
            .setAuthor({
                name: log.target.globalName,
                iconURL: log.target.avatarURL(),
            });

        embed.addFields([
            {
                name: "Executor",
                value: `<@${log.executorId}>`,
                inline: true,
            },
            {
                name: "Reason",
                value: codeBlock(cleanCodeBlockContent(log.reason ? log.reason : "No reason")),
                inline: true,
            },
            {
                name: "\u200B",
                value: "\u200B",
                inline: true,
            },
            {
                name: "Old Nickname",
                value: codeBlock(cleanCodeBlockContent(change.old ? change.old : "No nickname")),
                inline: true,
            },
            {
                name: "New Nickname",
                value: codeBlock(cleanCodeBlockContent(change.new ? change.new : "No nickname")),
                inline: true,
            },
        ]);

        utils.Discord.guildManager.emit(
            guild.id,
            "memberEdit",
            {embeds: [embed]},
            "memberEditName"
        );
    }
};

module.exports = listener;
