const utils = require("../../utils");

const listener = {
    name: "timeoutLog",
    eventName: "timeout",
    listener: async (client, streamer, chatter, duration, timeto, userstate) => {
        try {
            const timeout = await utils.Schemas.TwitchTimeout.create({
                streamer: streamer,
                chatter: chatter,
                duration: duration,
                time_end: Date.now() + (duration * 1000),
            });
        } catch(e) {
            console.error(e);
        }
    }
};

module.exports = listener;
