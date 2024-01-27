const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
    const identity = {
        id: req.session.identity._id,
        authenticated: req.session.identity.authenticated,
        twitchUsers: (await req.session.identity.getTwitchUsers()).map(x => x.public()),
        discordUsers: (await req.session.identity.getDiscordUsers()).map(x => x.public()),
    };
    res.json({ok: true, identity});
});

module.exports = router;
