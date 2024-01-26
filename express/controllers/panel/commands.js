const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();

const utils = require("../../../utils/");
const config = require("../../../config.json");

const client = require("../../../discord/mbm/");

const discordCommands = [
    {label: "Ban Scan", name: "banscan"},
    {label: "Chatdump", name: "chatdump"},
    {label: "User", name: "user"},
];
const twitchCommands = [
    {label: "Group", name: "group"},
    {label: "Stats", name: "stats"},
    {label: "TMS Stats", name: "tmsstats"},
];

router.get("/discord", async (req, res) => {
    const discordUsers = await req.session.identity.getDiscordUsers();
    let discordGuilds = client.guilds.cache.filter(x => discordUsers.find(y => y._id === x.ownerId));
    let guilds = [];
    for (const [, g] of discordGuilds) {
        const guild = await utils.Schemas.DiscordGuild.findById(g.id);
        if (guild) guilds.push(guild);
    }
    res.render("panel/pages/commands/discord", {guilds: guilds, commands: discordCommands});
});

router.get("/twitch", async (req, res) => {
    let users = await req.session.identity.getTwitchUsers();

    let userLength = users.length;
    for (let i = 0; i < userLength; i++) {
        users = [
            ...users,
            ...(await users[i].getStreamers()).map(x => x.streamer),
        ];
    }

    res.render("panel/pages/commands/twitch", {users: users, commands: twitchCommands, comma: utils.comma});
});

router.get("/twitch/:id", async (req, res) => {
    let users = await req.session.identity.getTwitchUsers();

    let userLength = users.length;
    for (let i = 0; i < userLength; i++) {
        users = [
            ...users,
            ...(await users[i].getStreamers()).map(x => x.streamer),
        ];
    }

    const user = users.find(x => x._id === req.params.id);
    res.render("panel/pages/commands/twitch", {users: users, user: user, commands: twitchCommands, comma: utils.comma});
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
    res.render("panel/pages/commands/discord", {guilds: guilds, guild: guild, commands: discordCommands});
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

    discordCommands.forEach(cmd => {
        guild.commands[cmd.name] = req.body.hasOwnProperty(cmd.name);
    });

    await guild.save();
    res.redirect(`/panel/commands/discord/${req.params.id}`)
});

router.post("/twitch/:id", async (req, res) => {
    const error = err => {
        res.redirect(`/panel/commands/twitch/${req.params.id}?error=${encodeURIComponent(err)}`)
    }

    let users = await req.session.identity.getTwitchUsers();

    let userLength = users.length;
    for (let i = 0; i < userLength; i++) {
        users = [
            ...users,
            ...(await users[i].getStreamers()).map(x => x.streamer),
        ];
    }

    const user = users.find(x => x._id === req.params.id);
    if (!user)
        return error("User with the provided ID was not found!");

    if (!user.commands) user.commands = {};

    twitchCommands.forEach(cmd => {
        user.commands[cmd.name] = req.body.hasOwnProperty(cmd.name);
    });

    await user.save();
    res.redirect(`/panel/commands/twitch/${req.params.id}`)
});

module.exports = router;
