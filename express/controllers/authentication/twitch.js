const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");
const config = require("../../../config.json");

const UPDATE_MODDED_LIMIT = 7 * 24 * 60 * 60 * 1000;

router.get("/", async (req, res) => {
    const { query, session } = req;
    const { code } = query;

    if (!session) {
        res.send("Session has not been initialized. Please reload the page");
        return;
    }

    if (code) {
        try {
            const userId = await utils.Twitch.authProvider.addUserForCode(code);
            const twitchUser = await utils.Twitch.getUserById(userId, false, true);
            
            const accessToken = await utils.Twitch.authProvider.getAccessTokenForUser(twitchUser._id);

            if (twitchUser._id === config.twitch.id) {
                if (accessToken.scope.includes("channel:read:subscriptions")) {
                    utils.Twitch.authProvider.addIntentsToUser(twitchUser._id, ["tms:chat"]);
                } else {
                    return res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users user:read:moderated_channels chat:read chat:edit channel:moderate moderator:read:followers channel:read:subscriptions user:write:chat"));
                }
            }

            await utils.Schemas.TwitchToken.findOneAndUpdate({
                user: twitchUser._id,
            }, {
                user: twitchUser._id,
                tokenData: accessToken,
            }, {
                upsert: true,
                new: true,
            });
    
            let discordUsers = [];
    
            if (session.identity) {
                discordUsers = await session.identity.getDiscordUsers();
                if (twitchUser?.identity?._id !== session?.identity?._id) {
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
    
            if (!twitchUser.updated_modded_channels || Date.now() - twitchUser.updated_modded_channels >= UPDATE_MODDED_LIMIT) {
                try {
                    const oldStreamers = (await twitchUser.getStreamers(false)).map(x => x.streamer);
                    const newStreamers = (await twitchUser.fetchModdedChannels()).map(x => x.streamer);
                    let removedStreamers = [];
                    let addedStreamers = [];
                    let existingStreamers = [];
                    for (let i = 0; i < newStreamers.length; i++) {
                        const streamer = newStreamers[i];
                        await streamer.fetchFollowers();
                        if (oldStreamers.find(x => x._id === streamer._id)) {
                            existingStreamers.push(streamer);
                        } else {
                            addedStreamers.push(streamer);
                        }
                    }
                    oldStreamers.forEach(streamer => {
                        if (!newStreamers.find(x => x._id === streamer._id)) {
                            removedStreamers.push(streamer);
                        }
                    });
                    session.identity.authenticated = Boolean(newStreamers.find(x => x.follower_count >= 5000 || x.affiliation === "partner"));
                    await session.identity.save();
                    twitchUser.updated_modded_channels = Date.now();
                    await twitchUser.save();
                    if (removedStreamers.length + addedStreamers.length > 0) {
                        return res.render("panel/pages/authentication/updatedStreamers", {
                            identity: session.identity,
                            twitchUsers: await session.identity.getTwitchUsers(),
                            discordUsers,
                            removedStreamers,
                            addedStreamers,
                            existingStreamers,
                            comma: utils.comma,
                        });
                    }
                } catch(err) {
                    console.error(err);
                }
            }
    
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
        } catch(err) {
            console.error("Error while logging in:");
            console.error(err);
            res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users user:read:moderated_channels chat:read"));
        }
    } else {
        res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users user:read:moderated_channels chat:read"));
    }
});

router.get("/bot", (req, res) => {
    res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users user:read:moderated_channels chat:read chat:edit channel:moderate moderator:read:followers channel:read:subscriptions user:write:chat"));
});

module.exports = router;
