const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const utils = require("../../../utils/");

const FRIENDLY_SCOPES = {
    "moderator:manage:banned_users": "Manage Banned Users",
    "user:read:email": "Identify",

    "guilds.join": "Join Guilds",
    "identify": "Identify",
}

const titleCase = str => {
    str = str.toLowerCase().split(' ');
    for (var i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
    }
    return str.join(' ');
}

const friendly = token => {
    token.friendlyScopes = "";
    token.scope.split(" ").forEach(scope => {
        if (token.friendlyScopes !== "")
            token.friendlyScopes += ", ";
        if (FRIENDLY_SCOPES.hasOwnProperty(scope)) {
            token.friendlyScopes += FRIENDLY_SCOPES[scope];
        } else {
            token.friendlyScopes += titleCase(scope.replace(":", " ").replace("_", " "))
        }
    });
}

router.get("/tokens", async (req, res) => {
    const twitchUsers = await req.session.identity.getTwitchUsers();
    const discordUsers = await req.session.identity.getDiscordUsers();

    let twitchTokens = [];
    for (let i = 0; i < twitchUsers.length; i++) {
        const user = twitchUsers[i];
        twitchTokens = [
            ...twitchTokens,
            ...await user.getTokens(),
        ]
    }

    let discordTokens = [];
    for (let i = 0; i < discordUsers.length; i++) {
        const user = discordUsers[i];
        discordTokens = [
            ...discordTokens,
            ...await user.getTokens(),
        ]
    }

    twitchTokens.forEach(friendly);
    discordTokens.forEach(friendly);

    res.render("panel/pages/manage/tokens", {
        twitchTokens: twitchTokens,
        discordTokens: discordTokens,
        parseDate: x => utils.parseDate(x),
    });
});

router.get("/tokens/:token/delete", async (req, res) => {
    try {
        const twitchUsers = await req.session.identity.getTwitchUsers();
        const discordUsers = await req.session.identity.getDiscordUsers();

        const twitchToken = await utils.Schemas.TwitchToken.findById(new mongoose.Types.ObjectId(req.params.token));
        if (twitchToken && twitchUsers.find(x => x._id === twitchToken.user)) {
            await twitchToken.deleteOne();
        }
        const discordToken = await utils.Schemas.DiscordToken.findById(new mongoose.Types.ObjectId(req.params.token));
        if (discordToken && discordUsers.find(x => x._id === discordToken.user)) {
            await discordToken.deleteOne();
        }
    }catch(e) {console.error(e)}
    res.redirect("/panel/manage/tokens");
});

module.exports = router;
