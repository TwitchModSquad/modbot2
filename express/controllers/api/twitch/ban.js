const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const utils = require("../../../../utils/");

router.get("/:id", async (req, res) => {
    try {
        const ban = await utils.Schemas.TwitchBan.findById(new mongoose.Types.ObjectId(req.params.id))
                .populate("chatter")
                .populate("streamer");
        if (ban) {
            const banObj = ban.public();

            banObj.chatHistory = await utils.Schemas.TwitchChat.find({streamer: ban.streamer._id, chatter: ban.chatter._id, time_sent: {$lt: ban.time_start}})
                    .sort({time_sent: -1})
                    .limit(20)
                    .populate("chatter")
                    .populate("streamer");
            banObj.chatHistory.reverse();
            banObj.chatHistory = banObj.chatHistory.map(x => x.public());

            banObj.alsoBannedIn = await utils.Schemas.TwitchBan.find({streamer: {$ne: ban.streamer._id}, chatter: ban.chatter._id})
                    .populate("chatter")
                    .populate("streamer");
            banObj.alsoBannedIn = banObj.alsoBannedIn.map(x => x.public());
            for (let i = 0; i < banObj.alsoBannedIn.length; i++) {
                const aBan = banObj.alsoBannedIn[i];
                aBan.chatHistory = await utils.Schemas.TwitchChat.find({streamer: aBan.streamer.id, chatter: aBan.chatter.id, time_sent: {$lt: aBan.time_start}})
                        .sort({time_sent: -1})
                        .limit(20)
                        .populate("chatter")
                        .populate("streamer");
                aBan.chatHistory.reverse();
                aBan.chatHistory = aBan.chatHistory.map(x => x.public());
            }
            return res.json({ok: true, data: banObj});
        }
    } catch(e) {
        console.error(e);
    }
    
    res.status(404);
    res.json({ok: false, error: "Unable to get ban!"});
});

module.exports = router;
