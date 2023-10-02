const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

let featured;
let members;

router.get("/", async (req, res) =>  {
    if (!featured) {
        featured = await utils.Schemas.TwitchUser.find({featured: true})
            .sort({follower_count: -1});
    }

    const gen = utils.StatsManager.getGeneralStatistics();
    const memberStreams = utils.StatsManager.getMemberStreams();
    const statistics = [
        {
            name: "Chat Messages",
            value: utils.formatNumberSmall(gen.messages),
            color: "blue",
        },
        {
            name: "Live Members",
            value: utils.formatNumberSmall(memberStreams ? memberStreams.length : 0),
            color: "purple",
        },
        {
            name: "Timeouts",
            value: utils.formatNumberSmall(gen.timeouts),
            color: "yellow",
        },
        {
            name: "Bans",
            value: utils.formatNumberSmall(gen.bans),
            color: "red",
        },
        {
            name: "Channels",
            value: utils.formatNumberSmall(gen.streamers),
            color: "purple",
        },
    ];

    res.render("public/pages/index", {
        statistics: statistics,
        featured: featured,
        comma: utils.comma,
    });
});

router.get("/members", async (req, res) => {
    if (!members) {
        members = await utils.Schemas.TwitchUser.aggregate([
            {$match: {$or: [
                {chat_listen: true, broadcaster_type: "partner"},
                {featured: true},
            ]}},
        ])
        .sort({follower_count: -1});
    }

    res.render("public/pages/members", {
        members: members,
        comma: utils.comma,
    });
});

module.exports = router;
