const utils = require("../../utils/");

const listener = {
    name: "messageLog",
    eventName: "message",
    listener: async (client, streamer, chatter, tags, message, self) => {
        try {
            await utils.Schemas.TwitchChat.create({
                _id: tags["id"],
                streamer: streamer,
                chatter: chatter,
                color: tags["color"],
                badges: tags["badges-raw"],
                emotes: tags["emotes-raw"],
                message: message,
            });

            if (tags?.mod) {
                await utils.Schemas.TwitchRole.findOneAndUpdate({
                    streamer: streamer,
                    moderator: chatter,
                }, {
                    streamer: streamer,
                    moderator: chatter,
                    time_end: null,
                    source: "tmi",
                }, {
                    upsert: true,
                    new: true,
                });
            }
        } catch(e) {
            console.error(e);
        }
    }
};

module.exports = listener;