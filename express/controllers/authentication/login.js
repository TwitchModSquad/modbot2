const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

router.get("/", async (req, res) => {
    const { session } = req;

    if (!session) {
        res.send("Session has not been initialized. Please reload the page");
        return;
    }

    let twitchUsers = [];
    let discordUsers = [];

    let streamers = [];

    if (req.session.identity) {
        twitchUsers = await req.session.identity.getTwitchUsers();
        discordUsers = await req.session.identity.getDiscordUsers();
    
        streamers = await req.session.identity.getStreamers();
    }

    res.render("panel/pages/authentication/login", {
        twitchURI: utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users user:read:moderated_channels chat:read"),
        discordURI: utils.Authentication.Discord.getURL(),
        identity: req.session.identity,
        twitchUsers: twitchUsers,
        discordUsers: discordUsers,
        streamers: streamers,
        comma: utils.comma,
    });
});

module.exports = router;
