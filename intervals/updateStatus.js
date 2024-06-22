const utils = require("../utils/");

const twitchClient = require("../twitch/");

const io = require("@pm2/io");

const memberChannels = io.metric({
    id: "app/realtime/memberChannels",
    name: "Member Channels",
});

const cachedTwitch = io.metric({
    id: "app/realtime/cached/twitch",
    name: "Cached Twitch Users",
});
const cachedDiscord = io.metric({
    id: "app/realtime/cached/discord",
    name: "Cached Discord Users",
});

const interval = {
    interval: 15000,
    onStartup: true,
    run: async () => {
        memberChannels.set(twitchClient.totalChannels());

        cachedTwitch.set(Object.keys(utils.Twitch.userCache.objectStore).length);
        cachedDiscord.set(Object.keys(utils.Discord.userCache.objectStore).length);
    },
};

module.exports = interval;
