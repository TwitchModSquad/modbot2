const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");
const twitchClient = require("../../../twitch/");

router.get("/", async (req, res) => {
    res.render("panel/pages/status", {
        unjoinedChannels: twitchClient.unjoined,
        shards: twitchClient.shards,
        comma: utils.comma,
    });
});

module.exports = router;
