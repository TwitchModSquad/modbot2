const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

router.get("/search/:query", async (req, res) => {
    let type = req?.query?.type;
    if (type !== "all" && type !== "twitch" && type !== "discord") type = "all";

    let twitchResults = [];
    let discordResults = [];

    const q = utils.escapeRegExp(req.params.query);

    if (type === "all" || type === "twitch") {
        const query = await utils.Schemas.TwitchUser.find({
                login: {
                    $regex: new RegExp("^" + q.toLowerCase()),
                }
            })
            .sort({follower_count: -1})
            .limit(10);
        for (let i = 0; i < query.length; i++) {
            const hit = query[i];
            twitchResults.push((await utils.Schemas.TwitchUser.findById(hit._id)).public());
        }
    }
    if (type === "all" || type === "discord") {
        const query = await utils.Schemas.DiscordUser.find({
                globalName: {
                    $regex: new RegExp("^" + q),
                    $options: "i",
                }
            })
            .limit(10);
        for (let i = 0; i < query.length; i++) {
            const hit = query[i];
            discordResults.push((await utils.Schemas.DiscordUser.findById(hit._id)).public());
        }
    }

    res.json({ok: true, data: {twitchResults: twitchResults, discordResults: discordResults}});
});

module.exports = router;
