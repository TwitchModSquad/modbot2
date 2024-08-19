const express = require("express");
const router = express.Router();

const utils = require("../../../../utils");

router.use("/:id", async (req, res, next) => {
    const discordUsers = await req.session.identity.getDiscordUsers();
    const guilds = await utils.Discord.guildManager.getMultipleUserServers(discordUsers.map(x => x.id));

    const guild = guilds.find(x => x.id === req.params.id);

    if (guild) {
        const dbGuild = await utils.Schemas.DiscordGuild.findById(guild.id);
        if (dbGuild) {
            req.guild = guild;
            req.dbGuild = dbGuild;
            return next();
        }
    }
    res.json({ok: false, error: "Unknown guild " + req.params.id});
});

const commands = require("./commands");
router.use("/:id/commands", commands);

const channel = require("./channel");
router.use("/:id/channel", channel);

const bodyParser = require("body-parser");
router.use(bodyParser.json());

router.post("/:id/spammoderation", (req, res) => {
    utils.Discord.guildManager.updateSpamModeration(req.guild.id, req?.body?.spammoderation).then(guild => {
        res.json({ok: true, guild: guild.public()})
    }, error => {
        res.json({ok: false, error: String(error)});
    });
});

module.exports = router;
