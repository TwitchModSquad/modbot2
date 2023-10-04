const utils = require("../../utils");

const listener = {
    name: "banAnnounce",
    eventName: "ban",
    listener: async (client, streamer, chatter, timebanned, userstate, bpm) => {
        let ban;
        try {
            ban = await utils.Schemas.TwitchBan.create({
                streamer: streamer,
                chatter: chatter,
            });
        } catch(e) {
            console.error(e);
            return;
        }

        if (client.type !== "member") return;
        if (bpm > 5) return;

        try {
            const message = await ban.message(true, true, bpm);
    
            utils.Discord.channels.ban.send(message).then(async message => {
                try {
                    await utils.Schemas.DiscordMessage.create({
                        _id: message.id,
                        channel: message.channel.id,
                        twitchBan: ban._id,
                    });
                } catch(e) {
                    console.error(e);
                }
            }, console.error);
    
            utils.EventManager.fire("banAnnounce", streamer, chatter, message, bpm);
        } catch(err) {
            console.error(err);
        }
    }
};

module.exports = listener;
