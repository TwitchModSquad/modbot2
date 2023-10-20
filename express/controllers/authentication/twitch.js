const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

router.get("/", async (req, res) => {
    const { query, session } = req;
    const { code } = query;

    if (!session) {
        res.send("Session has not been initialized. Please reload the page");
        return;
    }

    if (code) {
        const oauthData = await utils.Authentication.Twitch.getToken(code);

        if (oauthData.hasOwnProperty("status") && oauthData.status === 400) {
            res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users"));
            return;
        }

        let user;
        try {
            user = await utils.Authentication.Twitch.getUser(oauthData.access_token);
        } catch(err) {
            console.error(err);
            res.send("Unable to retrieve user from access token! Try again!");
            return;
        }

        utils.Twitch.getUserById(user.id, true, true).then(async twitchUser => {
            await utils.Schemas.TwitchToken.findOneAndUpdate({
                user: twitchUser,
                scope: oauthData.scope.join(" "),
            }, {
                user: twitchUser,
                refresh_token: oauthData.refresh_token,
                scope: oauthData.scope.join(" "),
                created_at: Date.now(),
                last_used: Date.now(),
            }, {
                upsert: true,
                new: true,
            });

            let discordUsers = [];

            if (session.identity) {
                discordUsers = await session.identity.getDiscordUsers();
                if (twitchUser.identity._id !== session.identity._id) {
                    await utils.consolidateIdentites([
                        ...await session.identity.getTwitchUsers(),
                        twitchUser,
                    ], [
                        ...discordUsers,
                    ]);
                }
            } else {
                const identity = await twitchUser.createIdentity();
                session.identity = identity;
                discordUsers = await session.identity.getDiscordUsers();
                await session.save();
            }

            if (discordUsers.length === 0) {
                res.redirect(utils.Authentication.Discord.getURL());
            } else {
                if (session.identity.authenticated) {
                    res.redirect("/auth/login");
                } else {
                    res.redirect("/auth/verify");
                }
            }
        }, err => {
            console.error(err);
            res.send("Unable to retrieve user!");
        });
    } else {
        res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users"));
    }
});

module.exports = router;
