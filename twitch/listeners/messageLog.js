const utils = require("../../utils/");
const ListenClient = require('../ListenClient');
const { ChatMessage } = require('@twurple/chat');

const CAPS_REGEX = /[A-Z]/g;

const listener = {
    name: "messageLog",
    eventName: "message",
    /**
     * Listener for a message
     * @param {ListenClient} client 
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {ChatMessage} msg 
     * @param {string} message 
     * @param {boolean} self
     */
    listener: async (client, streamer, chatter, msg, message, self) => {
        try {
            let messageWithoutEmotes = message;
            let percentEmotes = 0;
            let percentCaps = 0;

            let emotes = "";
            let badges = "";
            
            for (let [emote, positions] of msg.emoteOffsets) {
                positions.forEach(position => {
                    const [loc1, loc2] = position.split("-");
                    if (emotes.length > 0) emotes += "/";
                    emotes += `${emote}:${position}`;
                    try {
                        messageWithoutEmotes = messageWithoutEmotes.replace(RegExp(message.substring(Number(loc1), Number(loc2)+1), "g"), "");
                    } catch(e) {}
                });
            }

            for (let [badge, num] of msg.userInfo.badges) {
                if (badges.length > 0) badges += ",";
                badges += `${badge}/${num}`;
            }

            messageWithoutEmotes = messageWithoutEmotes.trim();
            percentEmotes = 1 - (messageWithoutEmotes.length / message.length);
            
            let messageWithoutCaps = messageWithoutEmotes.replace(CAPS_REGEX, "");
            if (messageWithoutEmotes.length > 0)
                percentCaps = 1 - (messageWithoutCaps.length / messageWithoutEmotes.length);

            await utils.Schemas.TwitchChat.create({
                _id: msg.id,
                streamer: streamer,
                chatter: chatter,
                color: msg.userInfo.color,
                badges,
                emotes,
                message: message,
                percent: {
                    caps: percentCaps,
                    emotes: percentEmotes,
                },
            });

            if (msg.userInfo.isMod) {
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