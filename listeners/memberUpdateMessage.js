const { Message } = require("discord.js");
const { HelixStream } = require("twitch");
const { EmbedBuilder } = require("discord.js");

const listener = {
    event: "member_live_update",
    /**
     * @param {*} user 
     * @param {HelixStream} stream 
     * @param {*} activity
     * @param {Message} message
     */
    func: (user, stream, activity, message) => {
        const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setAuthor({name: `🔴 ${user.display_name} is now live!`})
                .setTitle(stream.title)
                .setThumbnail(activity.game.boxArtUrl.replace("{width}","64").replace("{height}", "64"))
                .setImage(stream.getThumbnailUrl(256, 144) + "?nocache=" + Date.now())
                .setURL(`https://twitch.tv/${user.login}`)
                .addFields({
                    name: "Game",
                    value: activity.game.name,
                    inline: true,
                }, {
                    name: "Viewers",
                    value: String(stream.viewers),
                    inline: true,
                })
                .setFooter({text: `${user.display_name} : Live 🔴`, iconURL: user.profile_image_url})
                .setTimestamp(stream.startDate);

        message.edit({embeds: [embed]}).catch(console.error);
    }
}

module.exports = listener;
