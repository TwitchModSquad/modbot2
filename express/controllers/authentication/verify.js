const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();

const utils = require("../../../utils/");

const listenClients = require("../../../twitch/");

router.use(async (req, res, next) => {
    if (!req?.session?.identity) {
        res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users user:read:moderated_channels"));
        return;
    }

    const twitchUsers = await req.session.identity.getTwitchUsers();
    const discordUsers = await req.session.identity.getDiscordUsers();

    if (twitchUsers.length === 0) {
        res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users user:read:moderated_channels"));
        return;
    }
    if (discordUsers.length === 0) {
        res.redirect(utils.Authentication.Discord.getURL());
        return;
    }

    for (let i = 0; i < twitchUsers.length; i++) {
        if (!twitchUsers[i].follower_count) {
            await twitchUsers[i].fetchFollowers();
            await twitchUsers[i].save();
        }
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
        error: req?.query?.error ? req.query.error : null,
        comma: utils.comma,
    });
});

router.get("/:streamer", async (req, res) => {
    try {
        const twitchUsers = await req.session.identity.getTwitchUsers();
        const userIds = twitchUsers.map(x => x._id);
        const streamer = await utils.Twitch.getUserByName(req.params.streamer, true);
        await streamer.fetchFollowers();
        await streamer.save();
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

router.use(bodyParser.urlencoded({extended: true}));

router.post("/", async (req, res) => {
    const error = msg => {
        res.redirect(`/auth/verify?error=${encodeURIComponent(msg)}`);
    }

    if (req?.body?.users && typeof(req.body.users) === "object") {
        const twitchUsers = await req.session.identity.getTwitchUsers();
        let streamers = [];
        for (let i = 0; i < twitchUsers.length; i++) {
            streamers = [
                ...streamers,
                ...await twitchUsers[i].getStreamers(),
            ]
        }

        let warnings = "";

        let authenticated = false;
        if (twitchUsers.find(x => x.broadcaster_type === "partner" || x?.follower_count >= 5000)) {
            authenticated = true;
        } else if (streamers.find(x => x.streamer.broadcaster_type === "partner" || x?.streamer.follower_count >= 5000))
            authenticated = true;

        for (let i = 0; i < req.body.users.length; i++) {
            try {
                const user = await utils.Twitch.getUserById(req.body.users[i]);
                if (twitchUsers.find(x => x._id === user._id) || streamers.find(x => x.streamer._id === user._id)) {
                    let canChange = true;
                    if (!twitchUsers.find(x => x._id === user._id)) {
                        const otherMods = await user.getMods();
                        for (let m = 0; m < otherMods.length; m++) {
                            const modUser = otherMods[m];
                            if (modUser.identity) {
                                const identity = await utils.Schemas.Identity.findById(modUser.identity);
                                if (identity && identity.authenticated) {
                                    canChange = false;
                                    continue;
                                }
                            }
                        }
                    }
                    if (!canChange) {
                        if (warnings !== "") warnings += "\n";
                        warnings += `User ${user.display_name} could not be monitored using TMS as they already have authenticated mods.`;
                        continue;
                    }
                    let listen = req.body.hasOwnProperty(`listen-${user._id}`) && (req.body[`listen-${user._id}`] === "on" || req.body[`listen-${user._id}`] === "true");
                    if (listen) {
                        listenClients.member.join(user.login);
                        listenClients.partner.part(user.login);
                        listenClients.affiliate.part(user.login);
                    } else {
                        listenClients.member.part(user.login);
                    }
                    user.chat_listen = listen;
                    try {
                        await user.save();
                    } catch(e) {
                        console.error(e);
                    }
                } else {
                    return error(`User ${user.display_name} is not listed as a moderator for ${twitchUsers.map(x => x.display_name).join(", ")}`);
                }
            } catch(e) {
                console.error(e);
                return error(`Unable to retrieve user with ID ${req.body.users[i]}!`);
            }
        }

        if (authenticated) {
            req.session.identity.authenticated = true;
            await req.session.identity.save();
        }

        const discordUsers = await req.session.identity.getDiscordUsers();
        if (discordUsers.length === 0) {
            res.redirect(utils.Authentication.Discord.getURL());
        } else {
            const joinedGuilds = await discordUsers[0].getJoinedGuilds();
            if (joinedGuilds.inAny) {
                res.redirect("/auth/login");
            } else {
                res.redirect("/auth/join");
            }
        }
    } else {
        error("Expected parameter 'users' of type Object!");
    }
});

module.exports = router;
