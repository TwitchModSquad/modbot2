const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

router.use(async (req, res, next) => {
    if (!req?.session?.identity) {
        res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users"));
        return;
    }

    const twitchUsers = await req.session.identity.getTwitchUsers();
    const discordUsers = await req.session.identity.getDiscordUsers();

    if (twitchUsers.length === 0) {
        res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users"));
        return;
    }
    if (discordUsers.length === 0) {
        res.redirect(utils.Authentication.Discord.getURL());
        return;
    }

    const streamerRoles = await req.session.identity.getStreamers();

    req.twitchUsers = twitchUsers;
    req.discordUsers = discordUsers;
    req.streamerRoles = streamerRoles;
    next();
});

router.get("/", async (req, res) => {
    res.render("panel/pages/authentication/verify", {
        identity: req.session.identity,
        twitchUsers: req.twitchUsers,
        discordUsers: req.discordUsers,
        streamerRoles: req.streamerRoles,
    });
});

router.get("/:streamer", async (req, res) => {
    try {
        const twitchUsers = await req.session.identity.getTwitchUsers();
        const userIds = twitchUsers.map(x => x._id);
        const streamer = await utils.Twitch.getUserByName(req.params.streamer, true);
        const mods = await streamer.fetchMods();
        if (mods.find(x => userIds.includes(x.moderator._id))) {
            res.json({ok: true, streamer: streamer.public()});
        } else {
            res.json({ok: false, error: `User(s) ${twitchUsers.map(x => x.display_name).join(", ")} is not an active moderator in the channel ${streamer.display_name}!`});
        }
    } catch(e) {
        res.json({ok: false, error: e});
    }
});

module.exports = router;
