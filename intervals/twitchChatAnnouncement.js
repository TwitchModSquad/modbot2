const utils = require("../utils/");
const config = require("../config.json");

const randomItem = items => {
    return items[Math.floor(Math.random()*items.length)];
}

let nextIndex = 0;
const interval = {
    interval: 60000,
    onStartup: true,
    run: async () => {
        if (!utils.StatsManager.getMemberStreams().find(x => x.user.id === config.twitch.id))
            return;

        let message = config.twitch.messages[nextIndex];

        if (message === "random-streamer-shoutout") {
            const streams = utils.StatsManager.getMemberStreams();
            if (streams.length <= 1) return;
            let stream;
            while (!stream || stream.user.id === config.twitch.id) {
                stream = randomItem(streams);
            }
            message = `Visit one of our members - ${stream.user.display_name} playing ${stream.game.name} at twitch.tv/${stream.user.login} !`;
        }

        global.client.listen.member.client.say(config.twitch.username, message).catch(console.error);

        nextIndex++;
        if (nextIndex >= config.twitch.messages.length) nextIndex = 0;
    },
};

module.exports = interval;
