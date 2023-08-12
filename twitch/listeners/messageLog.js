const utils = require("../../utils/");

const listener = {
    name: "messageLog",
    eventName: "message",
    listener: async (client, streamer, chatter, tags, message, self) => {
        try {
            const chatMessage = await utils.Schemas.TwitchChat.create({
                _id: tags["id"],
                streamer: streamer,
                chatter: chatter,
                color: tags["color"],
                badges: tags["badges-raw"],
                emotes: tags["emotes-raw"],
                message: message,
            });
        } catch(e) {
            console.error(e);
        }
    }
};

module.exports = listener;