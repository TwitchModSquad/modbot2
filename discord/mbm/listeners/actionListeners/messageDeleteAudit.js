const { GuildAuditLogsEntry, Guild, EmbedBuilder, codeBlock, cleanCodeBlockContent, Message } = require("discord.js");

const utils = require("../../../../utils/");

const LOG_WAIT_TIMEOUT = 2500; // 2.5 seconds
const LOG_CHECK_INTERVAL = 50; // check every 50 ms

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const listener = {
    name: 'actionMessageDeleteAudit',
    eventName: 'guildAuditLogEntryCreate',
    eventType: 'on',
    /**
     * Stores tracked logs
     * @type {GuildAuditLogsEntry[]}
     */
    logStore: [],
    /**
     * Logs a messageDelete event from ./messageDelete
     * @param {Message} message 
     */
    async logMessageDelete(message) {
        const currentDate = Date.now();
        const embed = new EmbedBuilder()
            .setFooter({
                text: `${message.guild.name} - The Mod Squad`,
                iconURL: message.guild.iconURL(),
            })
            .setTitle("Message Delete")
            .setColor(0x772ce8)
            .setTimestamp(currentDate)
            .setAuthor({
                name: message.author.displayName,
                iconURL: message.author.displayAvatarURL()
            });
        
        let foundLog = null;
        for (let i = 0; i < LOG_WAIT_TIMEOUT / LOG_CHECK_INTERVAL; i++) {
            foundLog = listener.logStore.find(
                    x => x.targetId === message.author.id &&
                    x.extra?.channel?.id === message.channel.id
                )
            
            if (foundLog) {
                embed.addFields([
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
                ])
                break;
            }
            await sleep(LOG_CHECK_INTERVAL);
        }

        embed
            .setDescription(`A message from <@${message.author.id}> was deleted by ${foundLog ? `<@${foundLog.executorId}>` : "the author"} at <t:${Math.floor(currentDate / 1000)}:f> in <#${message.channelId}>`)
            .addFields([
                {
                    name: "Message Content",
                    value: message.content,
                    inline: false,
                },
            ]);

        utils.Discord.guildManager.emit(
            message.guildId,
            "messageDelete",
            {embeds: [embed]},
            foundLog ? "messageDeleteModerator" : "messageDeleteDelete"
        );
    },
    /**
     * Listens for deleted messages
     * @param {GuildAuditLogsEntry} log 
     * @param {Guild} guild
     */
    async listener (log, guild) {
        if (log.targetType !== "Message" || log.actionType !== "Delete") return;

        listener.logStore.push(log);
    }
};

module.exports = listener;
