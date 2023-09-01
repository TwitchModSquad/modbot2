const utils = require("../../utils/");

const listener = {
    name: "channelActivityBan",
    eventName: "ban",
    listener: async (client, streamer, chatter, timebanned, userstate, bpm) => {
        utils.StatsManager.addBan(streamer.display_name);
    }
};

module.exports = listener;
