const utils = require("../../utils");

const listener = {
    name: "globalBanLog",
    eventName: "ban",
    listener: async (client, streamer, chatter, timebanned, userstate, bpm) => {
        utils.Discord.addBan(`${utils.parseDate(Date.now())} [#${streamer.login}] ${chatter.display_name} was banned`);
    }
};

module.exports = listener;
