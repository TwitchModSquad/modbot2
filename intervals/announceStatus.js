const utils = require("../utils/");

const listenClients = require("../twitch/");

const interval = {
    interval: 15000,
    onStartup: false,
    run: async () => {
        console.log(
            `Member Channels: ${listenClients.member.channels.length}\n` +
            `Partner Channels: ${listenClients.partner.channels.length}\n` +
            `Affiliate Channels: ${listenClients.affiliate.channels.length}\n` +
            "-------------------------\n" +
            `Cached Twitch Users: ${Object.keys(utils.Twitch.userCache.objectStore).length}\n` +
            "-------------------------"
            );
    },
};

module.exports = interval;
