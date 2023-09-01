const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();

const utils = require("../../../utils/");
const config = require("../../../config.json");

const client = require("../../../discord/mbm/");

const commands = [
    {label: "Chatdump", name: "chatdump"},
    {label: "User", name: "user"},
]

router.get("/discord", async (req, res) => {
    const discordUsers = await req.session.identity.getDiscordUsers();
    let discordGuilds = client.guilds.cache.filter(x => discordUsers.find(y => y._id === x.ownerId));
    let guilds = [];
    for (const [, g] of discordGuilds) {
        const guild = await utils.Schemas.DiscordGuild.findById(g.id);
        if (guild) guilds.push(guild);
    }
    res.render("panel/pages/commands/discord", {guilds: guilds, commands});
});

router.get("/discord/:id", async (req, res) => {
    const discordUsers = await req.session.identity.getDiscordUsers();
    let discordGuilds = client.guilds.cache.filter(x => discordUsers.find(y => y._id === x.ownerId));
    let guilds = [];
    for (const [, g] of discordGuilds) {
        const guild = await utils.Schemas.DiscordGuild.findById(g.id);
        if (guild) guilds.push(guild);
    }
    let guild = guilds.find(x => x._id === req.params.id);
    res.render("panel/pages/commands/discord", {guilds: guilds, guild: guild, commands});
});

router.use(bodyParser.urlencoded({extended: true}));

router.post("/discord/:id", async (req, res) => {
    const error = err => {
        res.redirect(`/panel/commands/discord/${req.params.id}?error=${encodeURIComponent(err)}`)
    }

    const discordUsers = await req.session.identity.getDiscordUsers();
    let discordGuilds = client.guilds.cache.filter(x => discordUsers.find(y => y._id === x.ownerId));
    let guilds = [];
    for (const [, g] of discordGuilds) {
        const guild = await utils.Schemas.DiscordGuild.findById(g.id);
        if (guild) guilds.push(guild);
    }
    let guild = guilds.find(x => x._id === req.params.id);
    if (!guild)
        return error("Guild with the provided ID was not found!");

    if (!guild.commands) guild.commands = {};

    commands.forEach(cmd => {
        guild.commands[cmd.name] = req.body.hasOwnProperty(cmd.name);
    });

    await guild.save();
    res.redirect(`/panel/commands/discord/${req.params.id}`)
});

module.exports = router;
