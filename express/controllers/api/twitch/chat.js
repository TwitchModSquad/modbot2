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

    let data = [];
    const initialMessages = await utils.Schemas.TwitchChat
        .find(searchQuery)
        .sort({time_sent: -1})
        .limit(limit);

    for (let i = 0; i < initialMessages.length; i++) {
        const message = initialMessages[i];
        const streamer = await utils.Twitch.getUserById(message.streamer);
        const chatter = await utils.Twitch.getUserById(message.chatter);

        let badgeUrls = [];
        if (message.badges) {
            badgeUrls = badges.filter(badge => message.badges.includes(badge.text));
        }

        data.push({
            id: message._id,
            streamer: {
                id: streamer._id,
                login: streamer.login,
                display_name: streamer.display_name,
            },
            chatter: {
                id: chatter._id,
                login: chatter.login,
                display_name: chatter.display_name,
            },
            color: message.color,
            badges: message.badges,
            emotes: message.emotes,
            message: message.message,
            deleted: message.deleted,
            time_sent: message.time_sent,
            prettyTimeSent: utils.parseDate(message.time_sent),
            badgeUrls,
        });
    }

    res.json({
        ok: true,
        elapsed: Date.now() - startTime,
        cursor: data.length === limit ? data[data.length - 1].time_sent.getTime() : null,
        data,
    })
});

module.exports = router;
