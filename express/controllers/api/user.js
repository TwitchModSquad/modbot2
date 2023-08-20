const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

router.get("/search/:query", async (req, res) => {
    let type = req?.query?.type;
    if (type !== "all" && type !== "twitch" && type !== "discord") type = "all";

    let twitchResults = [];
    let discordResults = [];

    if (type === "all" || type === "twitch") {
        const query = await utils.Schemas.TwitchUser.search({
            query_string: {
                query: req.params.query,
            }
        });
        for (let i = 0; i < query.body.hits.hits.length; i++) {
            const hit = query.body.hits.hits[i];
            twitchResults.push((await utils.Schemas.TwitchUser.findById(hit._id)).public());
        }
    }
    if (type === "all" || type === "discord") {
        const query = await utils.Schemas.DiscordUser.search({
            query_string: {
                query: req.params.query,
            }
        });
        for (let i = 0; i < query.body.hits.hits.length; i++) {
            const hit = query.body.hits.hits[i];
            discordResults.push((await utils.Schemas.DiscordUser.findById(hit._id)).public());
        }
    }

    res.json({ok: true, data: {twitchResults: twitchResults, discordResults: discordResults}});
});

module.exports = router;
