const { EmbedBuilder, GuildMember } = require("discord.js");

const utils = require("../../../../utils");

const listener = {
    name: 'actionMemberAdd',
    eventName: 'guildMemberAdd',
    eventType: 'on',
    /**
     * Listens for new members
     * @param {GuildMember} member 
     */
    async listener (member) {
        const embed = new EmbedBuilder()
            .setFooter({
                text: `${member.guild.name} - The Mod Squad`,
                iconURL: member.guild.iconURL(),
            })
            .setTitle("New Member")
            .setColor(0x772ce8)
            .setTimestamp(member.joinedTimestamp)
            .setDescription(`<@${member.id}> joined the guild at <t:${Math.floor(member.joinedTimestamp / 1000)}:f>!`)
            .addFields({
                name: "Join Date",
                value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:f>`,
            })
            .setThumbnail(member.displayAvatarURL())
            .setAuthor({
                iconURL: member.displayAvatarURL(),
                name: member.displayName,
            });

        utils.Discord.guildManager.emit(
            member.guild.id,
            "memberAdd",
            {embeds:[embed]}
        );
    }
};

module.exports = listener;
