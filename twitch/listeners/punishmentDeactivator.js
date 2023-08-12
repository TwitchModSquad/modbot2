const utils = require("../../utils");

const punishmentStore = require("../PunishmentStore");

const listener = {
    name: "punishmentDeactivator",
    eventName: "message",
    listener: async (client, streamer, chatter, timebanned, userstate, bpm) => {
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
