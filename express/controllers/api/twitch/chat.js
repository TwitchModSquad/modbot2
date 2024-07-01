const express = require("express");
const router = express.Router();

const utils = require("../../../../utils");

let badges = [
    {
        text: "broadcaster/",
        name: "Broadcaster",
        url: "/assets/images/badges/twitch/broadcaster.png",
    },
    {
        text: "moderator/",
        name: "Moderator",
        url: "/assets/images/badges/twitch/moderator.png",
    },
    {
        text: "founder/",
        name: "Founder",
        url: "/assets/images/badges/twitch/founder.png",
    },
    {
        text: "subscriber/",
        name: "Subscriber",
        url: "/assets/images/badges/twitch/subscriber.png",
    },
    {
        text: "partner/",
        name: "Partner",
        url: "/assets/images/badges/twitch/partner.png",
    },
    {
        text: "vip/",
        name: "VIP",
        url: "/assets/images/badges/twitch/vip.png",
    },
];

router.get("/", async (req, res) => {
    const searchQuery = {};

    const startTime = Date.now();

    let limit = 100;

    if (req?.query?.streamer && req.query.streamer !== "all") {
        try {
            searchQuery.streamer = await utils.Twitch.getUserById(req.query.streamer);
        } catch(err) {
            console.error("Invalid streamer in request: " + err);
            return res.json({ok: false, error: "Invalid streamer"});
        }
    }

    if (req?.query?.chatter && req.query.chatter !== "all") {
        try {
            searchQuery.chatter = await utils.Twitch.getUserById(req.query.chatter);
        } catch(err) {
            console.error("Invalid chatter in request: " + err);
            return res.json({ok: false, error: "Invalid chatter"});
        }
    }

    if (req?.query?.before) {
        const before = new Date(Number(req.query.before));
        if (before instanceof Date && !isNaN(before)) {
            searchQuery.time_sent = {
                $lt: before,
            }
        } else {
            return res.json({ok: false, error: "Invalid before date"});
        }
    }

    if (req?.query?.limit) {
        limit = Number(req.query.limit);
        if (isNaN(limit)) {
            return res.json({ok: false, error: "Invalid limit. Must be a number from 1 to 500"});
        }
        limit = Math.min(500, Math.max(1, limit)); // restricts number from 1 to 500
    }

    const data = (await utils.Schemas.TwitchChat
        .find(searchQuery)
        .sort({time_sent: -1})
        .populate(["streamer","chatter"])
        .limit(limit))
        .map(msg => {
            msg = msg.public();
            msg.prettyDateSent = utils.parseDateOnly(msg.time_sent);
            msg.prettyTimeSent = utils.parseTimeOnly(msg.time_sent);
            if (msg.badges) {
                msg.badgeUrls = badges.filter(badge => msg.badges.includes(badge.text));
            } else {
                msg.badgeUrls = [];
            }
            return msg;
        });

    res.json({
        ok: true,
        elapsed: Date.now() - startTime,
        cursor: data.length === limit ? data[data.length - 1].time_sent.getTime() : null,
        data,
    })
});

module.exports = router;
