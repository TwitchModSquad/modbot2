const express = require("express");
const router = express.Router();

const bodyParser = require("body-parser");

const utils = require("../../../../utils");

router.delete("/:id", async (req, res) => {
    utils.Discord.guildManager.deleteChannel(req.params.id, req.guild.id);
    res.json({ok: true});
});

router.use(bodyParser.json({extended: true}));

router.post("/:id/actions", async (req, res) => {
    utils.Discord.guildManager.updateChannelActions(req.params.id, req.guild.id, req.body).then(channel => {
        res.json({ok: true, channel: channel.dbChannel.public()});
    }, error => {
        console.error(error);
        res.json({ok: false, error})
    });
});

module.exports = router;
