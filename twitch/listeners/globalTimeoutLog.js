const utils = require("../../utils");

const listener = {
    name: "globalTimeoutLog",
    eventName: "timeout",
    listener: async (client, streamer, chatter, duration, timeto, userstate) => {
        utils.Discord.addTimeout(`${utils.parseDate(Date.now())} [#${streamer.login}] ${chatter.display_name} timed out for ${duration} second${duration === 1 ? "" : "s"}`);
    }
};

module.exports = listener;
