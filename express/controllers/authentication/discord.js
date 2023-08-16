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
        const oauthData = await utils.Authentication.Discord.getToken(code);
        const user = await utils.Authentication.Discord.getUser(oauthData.access_token, oauthData.token_type);

        if (user.hasOwnProperty("message") && user.message === "401: Unauthorized") {
            res.redirect(utils.Authentication.Discord.getURL());
            return;
        }

        utils.Discord.getUserById(user.id, true, true).then(async discordUser => {
            await utils.Schemas.DiscordToken.findOneAndUpdate({
                user: discordUser,
                scope: oauthData.scope,
            }, {
                user: discordUser,
                refresh_token: oauthData.refresh_token,
                scope: oauthData.scope,
                created_at: Date.now(),
                last_used: Date.now(),
            }, {
                upsert: true,
                new: true,
            });

            let twitchUsers = [];

            if (session.identity) {
                twitchUsers = await session.identity.getTwitchUsers();
                await utils.consolidateIdentites([
                    ...twitchUsers,
                ], [
                    ...await session.identity.getDiscordUsers(),
                    discordUser,
                ]);
            } else {
                const identity = await discordUser.createIdentity();
                session.identity = identity;
                await session.save();
            }

            if (twitchUsers.length === 0) {
                res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users"));
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
        res.redirect(utils.Authentication.Discord.getURL());
    }
});

module.exports = router;
