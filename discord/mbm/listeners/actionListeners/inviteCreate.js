const { EmbedBuilder, codeBlock, cleanCodeBlockContent, Invite } = require("discord.js");

const utils = require("../../../../utils/");
const config = require("../../../../config.json");

const listener = {
    name: 'actionInviteCreate',
    eventName: 'inviteCreate',
    eventType: 'on',
    /**
     * Listens for invite creations
     * @param {Invite} invite 
     */
    async listener (invite) {
        const embed = new EmbedBuilder()
            .setFooter({
                text: `${invite.guild.name} - The Mod Squad`,
                iconURL: invite.guild.iconURL(),
            })
            .setTitle("Invite Created")
            .setColor(0x772ce8)
            .setAuthor({
                name: invite.inviter.displayName,
                iconURL: invite.inviter.displayAvatarURL()
            })
            .setTimestamp(Date.now())
            .setDescription(`An invite was created by <@${invite.inviter.id}> at <t:${Math.floor(Date.now() / 1000)}:f> for <#${invite.channelId}>`)
            .addFields([
                {
                    name: "Invite URL",
                    value: codeBlock(cleanCodeBlockContent(invite.url)),
                    inline: true,
                },
                {
                    name: "Expires",
                    value: invite.expiresAt ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : "```Never Expires```",
                    inline: true,
                }
            ]);

        utils.Discord.guildManager.emit(invite.guild.id, "inviteCreate", {embeds: [embed]});
    }
};

module.exports = listener;
