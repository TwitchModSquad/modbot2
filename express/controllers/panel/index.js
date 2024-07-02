const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

const twitchClient = require("../../../twitch/");

const archive = require("./archive");
const chatHistory = require("./chatHistory");
const commands = require("./commands");
const manage = require("./manage");
const overview = require("./overview");
const status = require("./status");
const user = require("./user");

let nameCache = {};
router.use(async (req, res, next) => {
    let name = nameCache[String(req.session.identity._id)];
    if (!name) {
        const users = await req.session.identity.getTwitchUsers();
        if (users.length > 0) {
            name = users[0].login;
        } else {
            name = "unk";
        }
        nameCache[String(req.session.identity._id)] = name;
    }
    console.log(`[${req.session.identity._id}:${name}] ${req.method} ${req.path}`);
    next();
});

router.get("/", async (req, res) => {
    const twitchUsers = await req.session.identity.getTwitchUsers();
    const discordUsers = await req.session.identity.getDiscordUsers();

    const streamers = await req.session.identity.getStreamers();

    const totalChannels = twitchClient.totalChannels();
    
    const cachedTwitchUsers = utils.comma(Object.keys(utils.Twitch.userCache.objectStore).length);
    const cachedDiscordUsers = utils.comma(Object.keys(utils.Discord.userCache.objectStore).length);

    let joinedGuilds = {};

    if (discordUsers.length > 0) {
        joinedGuilds = await discordUsers[0].getJoinedGuilds();
    }

    res.render("panel/pages/index", {
        twitchUsers,
        discordUsers,
        joinedGuilds,
        streamers,
        comma: utils.comma,
        stats: [
            ["Uptime", utils.formatElapsed(Math.floor((Date.now() - global.startTime) / 1000))],
            ["Joined Channels", totalChannels],
            ["Cached Twitch Users", cachedTwitchUsers],
            ["Cached Discord Users", cachedDiscordUsers],
        ]
    });
});

router.use("/archive", archive);
router.use("/chat-history", chatHistory);
router.use("/commands", commands);
router.use("/manage", manage);
router.use("/overview", overview)
router.use("/status", status);
router.use("/user", user);

module.exports = router;
