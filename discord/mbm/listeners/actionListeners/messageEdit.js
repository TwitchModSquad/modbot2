const { Message, EmbedBuilder, codeBlock, cleanCodeBlockContent } = require("discord.js");

const utils = require("../../../../utils/");
const config = require("../../../../config.json");

const BOTS_ARRAY = [
    config.discord.modbot.id,
    config.discord.mbm.id,
]

const listener = {
    name: 'actionEditMessage',
    eventName: 'messageUpdate',
    eventType: 'on',
    /**
     * Listens for edited messages
     * @param {Message} oldMessage 
     * @param {Message} newMessage 
     */
    async listener (oldMessage, newMessage) {
        if (BOTS_ARRAY.includes(oldMessage.author.id)) return;
        if (!oldMessage.inGuild()) return;

        if (oldMessage.content.length === 0 ||
            newMessage.content.length === 0) {
            return;
        }
        
        const embed = new EmbedBuilder()
            .setFooter({
                text: `${oldMessage.guild.name} - The Mod Squad`,
                iconURL: oldMessage.guild.iconURL(),
            })
            .setTitle("Message Edit")
            .setColor(0x772ce8)
            .setTimestamp(Date.now())
            .setAuthor({
                name: oldMessage.author.displayName,
                iconURL: oldMessage.author.displayAvatarURL()
            })
            .setDescription(`A message was edited by <@${oldMessage.author.id}> at <t:${Math.floor(Date.now() / 1000)}:f> in <#${oldMessage.channelId}>`)
            .addFields([
                {
                    name: "Old Content",
                    value: oldMessage.content,
                    inline: false,
                },
                {
                    name: "New Content",
                    value: newMessage.content,
                    inline: false,
                },
            ]);

        utils.Discord.guildManager.emit(oldMessage.guildId, "messageEdit", {embeds: [embed]});
    }
};

module.exports = listener;
