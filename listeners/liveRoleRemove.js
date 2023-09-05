const { Message } = require("discord.js");

const utils = require("../utils/");
const config = require("../config.json");

const listener = {
    event: "member_live_offline",
    /**
     * @param {*} livestream
     * @param {Message} message
     */
    func: async (livestream, message) => {
        const retrievedUser = await utils.Twitch.getUserById(livestream.user._id);
        if (retrievedUser?.identity) {
            const discordUsers = await retrievedUser.identity.getDiscordUsers();
            for (let i = 0; i < discordUsers.length; i++) {
                const user = discordUsers[i];
                utils.Discord.guilds.tms.members.fetch(user._id).then(member => {
                    member.roles.remove(config.discord.tms.roles.live).catch(console.error);
                }, () => {});
                utils.Discord.guilds.tlms.members.fetch(user._id).then(member => {
                    member.roles.remove(config.discord.tlms.roles.live).catch(console.error);
                }, () => {});
            }
        }
    }
}

module.exports = listener;
