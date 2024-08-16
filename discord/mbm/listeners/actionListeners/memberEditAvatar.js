const { EmbedBuilder, GuildMember } = require("discord.js");

const utils = require("../../../../utils");

const listener = {
    name: 'actionMemberEditAvatar',
    eventName: 'guildMemberUpdate',
    eventType: 'on',
    /**
     * Listens for deleted messages
     * @param {GuildMember} oldMember 
     * @param {GuildMember} newMember 
     */
    async listener (oldMember, newMember) {
        if (oldMember.displayAvatarURL() === newMember.displayAvatarURL()) return;

        const embed = new EmbedBuilder()
            .setFooter({
                text: `${oldMember.guild.name} - The Mod Squad`,
                iconURL: oldMember.guild.iconURL(),
            })
            .setTitle("Member Avatar Updated")
            .setColor(0x772ce8)
            .setTimestamp(Date.now())
            .setDescription(`The avatar of <@${newMember.id}> was updated at <t:${Math.floor(Date.now() / 1000)}:f>`)
            .setImage(newMember.displayAvatarURL())
            .setAuthor({
                name: newMember.displayName,
                iconURL: newMember.displayAvatarURL(),
            });

        utils.Discord.guildManager.emit(
            newMember.guild.id,
            "memberEdit",
            {embeds: [embed]},
            "memberEditAvatar"
        );
    }
};

module.exports = listener;
