const express = require("express");
const router = express.Router();

const config = require("../../../config.json");
const utils = require("../../../utils/");

router.get("/", async (req, res) => {
    const { session } = req;

    if (!session) {
        res.send("Session has not been initialized. Please reload the page");
        return;
    }

    if (!req?.session?.identity) {
        res.redirect(utils.Authentication.Twitch.getURL("user:read:email moderator:manage:banned_users user:read:moderated_channels"));
        return;
    }

    const twitchUsers = await req.session.identity.getTwitchUsers();
    const discordUsers = await req.session.identity.getDiscordUsers();

    const streamers = await req.session.identity.getStreamers();
    
    let joinModSquad = false;
    let joinLittleModSquad = streamers.length > 0;
    let joinCommunityLobbies = true;

    let inTable = {
        modSquad: false,
        littleModSquad: false,
        communityLobbies: false,
    };

    streamers.forEach(role => {
        if (role.streamer.broadcaster_type === "partner" || role.streamer?.follower_count >= 5000)
            joinModSquad = true;
    });

    twitchUsers.forEach(user => {
        if (user.broadcaster_type === "partner" || user?.follower_count >= 5000) {
            joinModSquad = true;
            joinLittleModSquad = true;
        } else if (user.broadcaster_type === "affiliate") {
            joinLittleModSquad = true;
        }
    });

    res.render("panel/pages/authentication/join", {
        twitchUsers: twitchUsers,
        discordUsers: discordUsers,
        streamers: streamers,
        join: {
            modSquad: joinModSquad,
            littleModSquad: joinLittleModSquad,
            communityLobbies: joinCommunityLobbies,
        },
        in: inTable,
        warnings: req?.query?.warnings ? req.query.warnings : null,
    });
});

router.get("/tms", async (req, res) => {
    const twitchUsers = await req.session.identity.getTwitchUsers();
    const discordUsers = await req.session.identity.getDiscordUsers();

    const streamers = await req.session.identity.getStreamers();

    let resolvedRoles = [];

    streamers.forEach(role => {
        if (role.streamer.broadcaster_type === "partner") {
            if (!resolvedRoles.includes(config.discord.tms.roles.moderator.partnered)) {
                resolvedRoles.push(config.discord.tms.roles.moderator.partnered);
            }
        } else if (role.streamer.broadcaster_type === "affiliate" && role.streamer.follower_count >= 5000) {
            if (!resolvedRoles.includes(config.discord.tms.roles.moderator.affiliate)) {
                resolvedRoles.push(config.discord.tms.roles.moderator.affiliate);
            }
        }
    });

    twitchUsers.forEach(user => {
        if (user.broadcaster_type === "partner") {
            if (!resolvedRoles.includes(config.discord.tms.roles.streamer.partnered)) {
                resolvedRoles.push(config.discord.tms.roles.streamer.partnered);
            }
        } else if (user.broadcaster_type === "affiliate" && user?.follower_count >= 5000) {
            if (!resolvedRoles.includes(config.discord.tms.roles.streamer.affiliate)) {
                resolvedRoles.push(config.discord.tms.roles.streamer.affiliate);
            }
        }
    });

    if (resolvedRoles.length > 0) {
        const guild = utils.Discord.guilds.tms;
        for (let i = 0; i < discordUsers.length; i++) {
            const user = discordUsers[i];
            const token = await utils.Schemas.DiscordToken.findOne({user: user._id});
            if (token) {
                try {
                    const newToken = await utils.Authentication.Discord.getAccessToken(token.refresh_token);
                    token.refresh_token = newToken.refresh_token;
                    await token.save();
                    try {
                        await guild.members.add(user._id, {accessToken: newToken.access_token, roles: resolvedRoles});
                    } catch(e) {
                        console.error(e);
                        res.json({ok: false, error: `Unable to add user ${user.displayName}!`});
                        return;
                    }
                } catch(e) {
                    console.error(e);
                    res.json({ok: false, error: `Unable to refresh access token for Discord user ${user.displayName}!`});
                    return;
                }
            } else {
                res.json({ok: false, error: `Unable to find token for Discord user ${user.displayName}!`})
                return;
            }
        }
        res.json({ok: true});
    } else {
        res.json({ok: false, error: "You are unable to join The Mod Squad currently!"});
    }
});

router.get("/tlms", async (req, res) => {
    const twitchUsers = await req.session.identity.getTwitchUsers();
    const discordUsers = await req.session.identity.getDiscordUsers();

    const streamers = await req.session.identity.getStreamers();

    let resolvedRoles = [];

    streamers.forEach(role => {
        if (role.streamer.broadcaster_type === "partner") {
            if (!resolvedRoles.includes(config.discord.tlms.roles.moderator.partnered)) {
                resolvedRoles.push(config.discord.tlms.roles.moderator.partnered);
            }
        } else if (role.streamer.broadcaster_type === "affiliate") {
            if (!resolvedRoles.includes(config.discord.tlms.roles.moderator.affiliate)) {
                resolvedRoles.push(config.discord.tlms.roles.moderator.affiliate);
            }
        }
    });

    twitchUsers.forEach(user => {
        if (user.broadcaster_type === "partner") {
            if (!resolvedRoles.includes(config.discord.tlms.roles.streamer.partnered)) {
                resolvedRoles.push(config.discord.tlms.roles.streamer.partnered);
            }
        } else if (user?.follower_count >= 5000) {
            if (!resolvedRoles.includes(config.discord.tlms.roles.streamer.affiliate)) {
                resolvedRoles.push(config.discord.tlms.roles.streamer.affiliate);
            }
        }
    });

    const guild = utils.Discord.guilds.tlms;
    for (let i = 0; i < discordUsers.length; i++) {
        const user = discordUsers[i];
        const token = await utils.Schemas.DiscordToken.findOne({user: user._id});
        if (token) {
            try {
                const newToken = await utils.Authentication.Discord.getAccessToken(token.refresh_token);
                token.refresh_token = newToken.refresh_token;
                await token.save();
                try {
                    await guild.members.add(user._id, {accessToken: newToken.access_token, roles: resolvedRoles});
                } catch(e) {
                    console.error(e);
                    res.json({ok: false, error: `Unable to add user ${user.displayName}!`});
                    return;
                }
            } catch(e) {
                console.error(e);
                res.json({ok: false, error: `Unable to refresh access token for Discord user ${user.displayName}!`});
                return;
            }
        } else {
            res.json({ok: false, error: `Unable to find token for Discord user ${user.displayName}!`})
            return;
        }
    }
    res.json({ok: true});
});

router.get("/cl", async (req, res) => {
    const discordUsers = await req.session.identity.getDiscordUsers();

    const guild = utils.Discord.guilds.cl;
    for (let i = 0; i < discordUsers.length; i++) {
        const user = discordUsers[i];
        const token = await utils.Schemas.DiscordToken.findOne({user: user._id});
        if (token) {
            try {
                const newToken = await utils.Authentication.Discord.getAccessToken(token.refresh_token);
                token.refresh_token = newToken.refresh_token;
                await token.save();
                try {
                    await guild.members.add(user._id, {accessToken: newToken.access_token});
                } catch(e) {
                    console.error(e);
                    res.json({ok: false, error: `Unable to add user ${user.displayName}!`});
                    return;
                }
            } catch(e) {
                console.error(e);
                res.json({ok: false, error: `Unable to refresh access token for Discord user ${user.displayName}!`});
                return;
            }
        } else {
            res.json({ok: false, error: `Unable to find token for Discord user ${user.displayName}!`})
            return;
        }
    }
    res.json({ok: true});
});

module.exports = router;
