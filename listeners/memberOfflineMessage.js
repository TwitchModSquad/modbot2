const { EmbedBuilder } = require("discord.js");

const listener = {
    event: "member_live_offline",
    /**
     * @param {*} livestream
     * @param {Message} message
     */
    func: (livestream, message) => {
        const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setAuthor({name: `⚫ ${livestream.user.display_name} is now offline!`})
                .setTitle("Offline")
                .setURL(`https://twitch.tv/${livestream.user.login}`)
                .setFooter({text: `${livestream.user.display_name} : Offline ⚫`, iconURL: livestream.user.profile_image_url})
                .setTimestamp(Date.now());

        message.edit({embeds: [embed]}).catch(console.error);
    }
}

module.exports = listener;
