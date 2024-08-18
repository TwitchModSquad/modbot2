const { EmbedBuilder } = require("discord.js");

const utils = require("../utils");

const listener = {
    event: "member_live_offline",
    /**
     * @param {*} livestream
     * @param {Message[]} messages
     */
    func: (livestream, messages) => {
        const embed = new EmbedBuilder()
                .setAuthor({name: `⚫ ${livestream.user.display_name} is now offline!`})
                .setTitle("Offline")
                .setURL(`https://twitch.tv/${livestream.user.login}`)
                .setFooter({text: `${livestream.user.display_name} : Offline ⚫`, iconURL: livestream.user.profile_image_url})
                .setTimestamp(Date.now());

        messages.forEach(message => {
            message.edit({embeds: [embed]}).catch(console.error);
        });

        utils.Discord.guildManager.emitLivestream(user.login, {embeds: [embed], components: []}, livestream);
    }
}

module.exports = listener;
