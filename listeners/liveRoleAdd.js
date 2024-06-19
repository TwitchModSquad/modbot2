const { HelixStream } = require("@twurple/api")

const utils = require("../utils/");
const config = require("../config.json");

const listener = {
    event: "member_live",
    /**
     * @param {*} user 
     * @param {HelixStream} stream 
     * @param {*} activity
     */
    func: async (user, stream, activity) => {
        const retrievedUser = await utils.Twitch.getUserById(user._id);
        if (retrievedUser?.identity) {
            const discordUsers = await retrievedUser.identity.getDiscordUsers();
            for (let i = 0; i < discordUsers.length; i++) {
                const user = discordUsers[i];
                utils.Discord.guilds.tms.members.fetch(user._id).then(member => {
                    member.roles.add(config.discord.tms.roles.live).catch(console.error);
                }, () => {});
                utils.Discord.guilds.tlms.members.fetch(user._id).then(member => {
                    member.roles.add(config.discord.tlms.roles.live).catch(console.error);
                }, () => {});
            }
        }
    }
}

module.exports = listener;
