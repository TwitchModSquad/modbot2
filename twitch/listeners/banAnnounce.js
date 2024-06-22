const { ClearChat } = require("@twurple/chat");
const utils = require("../../utils");
const ListenClient = require("../ListenClient");

const listener = {
    name: "banAnnounce",
    eventName: "ban",
    /**
     * 
     * @param {ListenClient} client 
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {Date} timebanned 
     * @param {ClearChat} msg 
     * @param {number} bpm 
     * @returns 
     */
    listener: async (client, streamer, chatter, timebanned, msg, bpm) => {
        let ban;
        try {
            ban = await utils.Schemas.TwitchBan.create({
                streamer: streamer,
                chatter: chatter,
                time_start: timebanned,
            });
        } catch(e) {
            console.error(e);
            return;
        }

        // We don't announce bans from channels with more than 5 bans per minute
        if (bpm > 5) return;

        try {
            const message = await ban.message(true, true, bpm);

            const logMessage = async message => {
                try {
                    await utils.Schemas.DiscordMessage.create({
                        _id: message.id,
                        guild: message.guild.id,
                        channel: message.channel.id,
                        twitchBan: ban._id,
                    });
                } catch(e) {
                    console.error(e);
                }
            }
    
            utils.Discord.channels.ban.tms.send(message).then(logMessage, console.error);
            utils.Discord.channels.ban.tlms.send(message).then(logMessage, console.error);

            console.log(`#${streamer.login}: ${chatter.login} was banned`)
    
            utils.EventManager.fire("banAnnounce", streamer, chatter, message, bpm);
        } catch(err) {
            console.error(err);
        }
    }
};

module.exports = listener;
