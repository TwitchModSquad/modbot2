const utils = require("../../utils/");

const CAPS_REGEX = /[A-Z]/g;

const listener = {
    name: "messageLog",
    eventName: "message",
    listener: async (client, streamer, chatter, tags, message, self) => {
        try {
            let messageWithoutEmotes = message;
            let percentEmotes = 0;
            let percentCaps = 0;

            if (tags?.["emotes-raw"]) {
                const emotes = tags["emotes-raw"].split("/");
                for (let i = 0; i < emotes.length; i++) {
                    const emote = emotes[i].split(":");
                    const locations = emote[1].split(",");
                    const [loc1, loc2] = locations[0].split("-");
                    try {
                        messageWithoutEmotes = messageWithoutEmotes.replace(RegExp(message.substring(Number(loc1), Number(loc2)+1), "g"), "");
                    } catch(e) {}
                }
                messageWithoutEmotes = messageWithoutEmotes.trim();
                percentEmotes = 1 - (messageWithoutEmotes.length / message.length);
            }
            let messageWithoutCaps = messageWithoutEmotes.replace(CAPS_REGEX, "");
            if (messageWithoutEmotes.length > 0)
                percentCaps = 1 - (messageWithoutCaps.length / messageWithoutEmotes.length);

            await utils.Schemas.TwitchChat.create({
                _id: tags["id"],
                streamer: streamer,
                chatter: chatter,
                color: tags["color"],
                badges: tags["badges-raw"],
                emotes: tags["emotes-raw"],
                message: message,
                percent: {
                    caps: percentCaps,
                    emotes: percentEmotes,
                },
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