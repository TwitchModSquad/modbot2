const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

const listenClients = require("../../../twitch/");

const live = require("./live");
const status = require("./status");

router.use(async (req, res, next) => {
    const {cookies} = req;

    const redirect = () => {
        res.redirect("/auth/login");
    }

    if (cookies?.session) {
        const session = await utils.Schemas.Session.findById(cookies.session)
                .populate("identity");
        if (session && session.identity.authenticated) {
            req.session = session;
            next();
        } else {
            redirect();
        }
    } else {
        redirect();
    }
});

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

router.use("/live", live);
router.use("/status", status);

module.exports = router;
