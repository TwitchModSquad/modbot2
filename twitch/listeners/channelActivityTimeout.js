const utils = require("../../utils/");

const listener = {
    name: "channelActivityTimeout",
    eventName: "timeout",
    listener: async (client, streamer, chatter, timebanned, userstate, bpm) => {
        utils.StatsManager.addTimeout(streamer.display_name);
    }
};

module.exports = listener;
