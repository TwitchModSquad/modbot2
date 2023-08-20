const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

const listenClients = require("../../../twitch/");

const chatHistory = require("./chatHistory");
const live = require("./live");
const status = require("./status");
const user = require("./user");

router.get("/", async (req, res) => {
    const twitchUsers = await req.session.identity.getTwitchUsers();
    const discordUsers = await req.session.identity.getDiscordUsers();

    const streamers = await req.session.identity.getStreamers();

    const memberChannels = listenClients.member.channels.length;
    const partnerChannels = listenClients.partner.channels.length;
    const affiliateChannels = listenClients.affiliate.channels.length;
    const totalChannels = memberChannels + partnerChannels + affiliateChannels;
    
    const cachedTwitchUsers = utils.comma(Object.keys(utils.Twitch.userCache.objectStore).length);
    const cachedDiscordUsers = utils.comma(Object.keys(utils.Discord.userCache.objectStore).length);

    res.render("panel/pages/index", {
        twitchUsers: twitchUsers,
        discordUsers: discordUsers,
        streamers: streamers,
        comma: utils.comma,
        stats: [
            ["Uptime", utils.formatElapsed(Math.floor((Date.now() - global.startTime) / 1000))],
            ["Member Channels", memberChannels],
            ["Partner Channels", partnerChannels],
            ["Affiliate Channels", affiliateChannels],
            ["Total Channels", totalChannels],
            ["Cached Twitch Users", cachedTwitchUsers],
            ["Cached Discord Users", cachedDiscordUsers],
        ]
    });
});

router.use("/chat-history", chatHistory);
router.use("/live", live);
router.use("/status", status);
router.use("/user", user);

module.exports = router;
