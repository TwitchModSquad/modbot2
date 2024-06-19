const utils = require("../../utils/");
const ListenClient = require('../ListenClient');
const { ChatMessage } = require('@twurple/chat');

const punishmentStore = require("../PunishmentStore");

const listener = {
    name: "punishmentDeactivator",
    eventName: "message",
    /**
     * Listener for a message
     * @param {ListenClient} client 
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {ChatMessage} msg 
     * @param {string} message 
     * @param {boolean} self
     */
    listener: async (client, streamer, chatter, msg, message, self) => {
        if (punishmentStore.isBanned(streamer._id, chatter._id)) {
            const bans = await utils.Schemas.TwitchBan.find({streamer: streamer._id, chatter: chatter._id, time_end: null});
            bans.forEach(async ban => {
                ban.time_end = Date.now();
                await ban.save();
            });
            punishmentStore.removeBan(streamer._id, chatter._id);
        }
        if (punishmentStore.isTimedOut(streamer._id, chatter._id)) {
            const timeouts = await utils.Schemas.TwitchTimeout.find({streamer: streamer._id, chatter: chatter._id})
                    .where("time_end")
                    .gt(Date.now());
            timeouts.forEach(async timeout => {
                timeout.time_end = Date.now();
                await timeout.save();
            });
            punishmentStore.removeTimeOut(streamer._id, chatter._id);
        }
    }
};

module.exports = listener;
