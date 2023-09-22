const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const router = express.Router();

const utils = require("../../../utils/");

const listenClients = require("../../../twitch/");

const FRIENDLY_SCOPES = {
    "moderator:manage:banned_users": "Manage Banned Users",
    "user:read:email": "Identify",

    "guilds.join": "Join Guilds",
    "identify": "Identify",
}

router.get("/streamers", async (req, res) => {
    let streamers = (await req.session.identity.getStreamers()).map(x => x.streamer);
    const editNotAllowed = [];
    for (let i = 0; i < streamers.length; i++) {
        const streamer = streamers[i];
        if (streamer?.identity) {
            const identity = await utils.Schemas.Identity.findById(streamer.identity);
            if (identity?.authenticated) {
                editNotAllowed.push(streamer._id);
            }
        }
    }
    streamers = [
        ...await req.session.identity.getTwitchUsers(),
        ...streamers,
    ]
    res.render("panel/pages/manage/streamers", {streamers: streamers, editNotAllowed: editNotAllowed, comma: utils.comma});
});

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

router.get("/streamers/:streamer/delete", async (req, res) => {
    try {
        const twitchUsers = await req.session.identity.getTwitchUsers();

        await utils.Schemas.TwitchRole.deleteMany({
            streamer: req.params.streamer,
            moderator: {
                $in: twitchUsers.map(x => x._id),
            },
        });
        
        res.redirect("/panel/manage/streamers");
    } catch(err) {
        console.error(err);
        res.send("An error occurred!");
    }
});

router.use(bodyParser.urlencoded({extended: true}));

router.post("/streamers", async (req, res) => {
    let streamers = (await req.session.identity.getStreamers()).map(x => x.streamer);
    const editNotAllowed = [];
    for (let i = 0; i < streamers.length; i++) {
        const streamer = streamers[i];
        if (streamer?.identity) {
            const identity = await utils.Schemas.Identity.findById(streamer.identity);
            if (identity?.authenticated) {
                editNotAllowed.push(streamer._id);
            }
        }
    }
    streamers = [
        ...await req.session.identity.getTwitchUsers(),
        ...streamers,
    ];
    streamers = streamers.filter(x => !editNotAllowed.includes(x._id));

    for (let i = 0; i < req.body.streamers.length; i++) {
        try {
            const streamer = await utils.Twitch.getUserById(req.body.streamers[i]);
            if (streamers.find(x => x._id === streamer._id)) {
                let newValue = req.body["active-" + streamer._id] ? true : false;
                if (newValue !== streamer.chat_listen) {
                    if (newValue) {
                        listenClients.member.join(streamer.login);
                        listenClients.partner.part(streamer.login);
                        listenClients.affiliate.part(streamer.login);
                    } else {
                        listenClients.member.part(streamer.login);
                    }

                    streamer.chat_listen = newValue;
                    await streamer.save();
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    res.redirect("/panel/manage/streamers");
});

module.exports = router;
