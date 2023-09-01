const utils = require("../../utils/");

const listener = {
    name: "channelActivityChat",
    eventName: "message",
    listener: async (client, streamer, chatter, tags, message, self) => {
        utils.StatsManager.addChat(streamer.display_name);
    }
};

module.exports = listener;