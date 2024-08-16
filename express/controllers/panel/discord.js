const express = require("express");
const router = express.Router();

const utils = require("../../../utils");
const discordCommands = utils.Discord.guildManager.discordCommands;

router.get("/integration", async (req, res) => {
    const discordUsers = await req.session.identity.getDiscordUsers();
    let allowedGuilds = await utils.Discord.guildManager.getMultipleUserServers(discordUsers.map(x => x._id));
    if (allowedGuilds.length > 0) {
        res.redirect(`/panel/discord/server/${allowedGuilds[0].id}`);
    } else {
        res.render("panel/pages/discord/noServers");
    }
});

const channelsCache = {};
router.get("/server/:id", async (req, res) => {
    const discordUsers = await req.session.identity.getDiscordUsers();
    let allowedGuilds = await utils.Discord.guildManager.getMultipleUserServers(discordUsers.map(x => x._id));
    let selectedGuild = allowedGuilds.find(x => x.id === req.params.id);
    if (!selectedGuild) {
        res.redirect("/panel/discord/integration");
    }
    let channels = null;
    if (channelsCache.hasOwnProperty(selectedGuild.id)) {
        channels = channelsCache[selectedGuild.id];
    } else {
        channels = Array.from((await selectedGuild.channels.fetch()).values());
        channelsCache[selectedGuild.id] = channels;
    }
    const dbGuild = await utils.Schemas.DiscordGuild.findById(selectedGuild.id);
    const actionChannels = utils.Discord.guildManager.getActionsInGuild(selectedGuild.id);
    res.render("panel/pages/discord/server", {
        discordUsers,
        allowedGuilds,
        selectedGuild,
        dbGuild,
        channels,
        actionChannels,
        discordCommands,
    });
});

module.exports = router;
