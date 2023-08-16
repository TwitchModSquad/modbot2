const utils = require("../utils/");

const listenClients = require("../twitch/");

const interval = {
    interval: 15000,
    onStartup: false,
    run: async () => {
        console.log(
            `Member Channels: ${utils.comma(listenClients.member.channels.length)}\n` +
            `Partner Channels: ${utils.comma(listenClients.partner.channels.length)}\n` +
            `Affiliate Channels: ${utils.comma(listenClients.affiliate.channels.length)}\n` +
            "-------------------------\n" +
            `Cached Twitch  Users: ${utils.comma(Object.keys(utils.Twitch.userCache.objectStore).length)}\n` +
            `Cached Discord Users: ${utils.comma(Object.keys(utils.Discord.userCache.objectStore).length)}\n` +
            "-------------------------"
            );
    },
};

module.exports = interval;
