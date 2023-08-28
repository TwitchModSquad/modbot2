const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");
const config = require("../../../config.json");

router.get("/chat", (req, res) => {
    res.render("panel/pages/live/chat");
});

router.get("/bans", async (req, res) => {
    const bans = await utils.Schemas.TwitchBan.find({})
            .sort({time_start: -1})
            .limit(30)
            .populate("streamer")
            .populate("chatter");

    for (let i = 0; i < bans.length; i++) {
        const ban = bans[i];
        ban.chatHistory = await utils.Schemas.TwitchChat.find({streamer: ban.streamer._id, chatter: ban.chatter._id, time_sent: {$lt: ban.time_start}})
                .sort({time_sent: -1})
                .limit(20);
        ban.chatHistory.reverse();
        ban.alsoBannedIn = await utils.Schemas.TwitchBan.find({streamer: {$ne: ban.streamer._id}, chatter: ban.chatter._id})
                .populate("streamer");
        ban.alsoBannedIn = ban.alsoBannedIn.map(x => x.streamer);
    }

    res.render("panel/pages/live/bans", {bans: bans, iconURI: config.iconURI, wsAddr: config.express.domain.root.replace("http://", "ws://").replace("https://", "wss://") + "ws/ban"});
});

module.exports = router;
