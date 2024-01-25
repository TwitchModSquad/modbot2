const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

const {member,partner,affiliate} = require("../../../twitch/");

const FORCE_UPDATE_MINIMUM = 1 * 60 * 60 * 1000;
const BAN_HISTORY_BACKLOG = 3 * 60 * 60 * 1000;

router.get("/search", async (req, res) => {
    res.render("panel/pages/userSearch", {
        comma: utils.comma,
    });
});

let dataCache = {};

router.get("/:query", async (req, res) => {
    const startTime = Date.now();

    let twitchUser;
    let discordUser;
    try {
        twitchUser = await utils.Twitch.getUserById(req.params.query, false, false);
    } catch(e) {
        try {
            discordUser = await utils.Discord.getUserById(req.params.query, false, false);
        } catch(e) {
            res.render("panel/pages/userSearch", {
                comma: utils.comma,
                error: `No users with the ID ${req.params.query} were found!`
            });
            return;
        }
    }

    let data = {
        type: twitchUser ? "twitch" : "discord",
        user: twitchUser ? twitchUser : discordUser,
        parseDate: date => utils.parseDate(date),
        comma: utils.comma,
    };

    if (twitchUser) {
        if (dataCache.hasOwnProperty(twitchUser._id)) {
            data = dataCache[twitchUser._id];
        } else {
            if (twitchUser.broadcaster_type !== "") {
                data.lastLive = await utils.Schemas.TwitchLivestream.findOne({user: twitchUser._id, endDate: null});
                if (!data.lastLive) {
                    data.lastLive = await utils.Schemas.TwitchLivestream.find({user: twitchUser._id})
                        .sort({endDate: -1})
                        .limit(1);
                    if (data.lastLive.length > 0) {
                        data.lastLive = data.lastLive[0];
                    } else delete data.lastLive;
                }
            }

            data.bans = await utils.Schemas.TwitchBan.find({chatter: twitchUser._id})
                .sort({time_start: -1})
                .populate("streamer");

            data.timeouts = await utils.Schemas.TwitchTimeout.find({chatter: twitchUser._id})
                .sort({time_start: -1})
                .populate("streamer");

            for (let i = 0; i < data.bans.length; i++) {
                const ban = data.bans[i];
                data.bans[i].history = await utils.Schemas.TwitchChat.find({
                        streamer: ban.streamer,
                        chatter: ban.chatter,
                        time_sent: {
                            $lt: ban.time_start,
                            $gt: ban.time_start - BAN_HISTORY_BACKLOG,
                        }
                    })
                    .sort({time_sent: -1});
            }

            for (let i = 0; i < data.timeouts.length; i++) {
                const timeout = data.timeouts[i];
                data.timeouts[i].history = await utils.Schemas.TwitchChat.find({
                        streamer: timeout.streamer,
                        chatter: timeout.chatter,
                        time_sent: {
                            $lt: timeout.time_start,
                            $gt: timeout.time_start - BAN_HISTORY_BACKLOG,
                        }
                    })
                    .sort({time_sent: -1});
            }

            const allChannelHistory = await twitchUser.getActiveCommunities();

            data.channelHistory = {
                member: allChannelHistory.filter(x => x.streamer.chat_listen),
                other: allChannelHistory.filter(x => !x.streamer.chat_listen),
            }

            const userSearchQuery = {};
            if (data.type === "twitch") {
                userSearchQuery.twitchUser = twitchUser._id;
            } else userSearchQuery.discordUser = discordUser._id;

            const archiveUsers = await utils.Schemas.ArchiveUser.find(userSearchQuery)
                    .populate("entry");

            data.archive = [];
            for (let i = 0; i < archiveUsers.length; i++) {
                const entry = archiveUsers[i].entry;
                entry.fileCount = (await entry.getFiles()).length;
                entry.userCount = (await entry.getUsers()).length;
                data.archive.push(entry);
            }

            data.listeningClients = [];

            if (member.channels.includes(twitchUser.login)) data.listeningClients.push("Member");
            if (partner.channels.includes(twitchUser.login)) data.listeningClients.push("Partner");
            if (affiliate.channels.includes(twitchUser.login)) data.listeningClients.push("Affiliate");

            data.streamers = await twitchUser.getStreamers();
            data.moderators = await twitchUser.getMods();

            data.cachedAt = Date.now();
            dataCache[twitchUser._id] = data;
        }
    }

    data.elapsed = Date.now() - startTime;
    
    res.render("panel/pages/userSearch", data);
});

router.get("/:query/force", async (req, res) => {
    let twitchUser;
    let discordUser;
    try {
        twitchUser = await utils.Twitch.getUserById(req.params.query, false, false);
    } catch(e) {
        try {
            discordUser = await utils.Discord.getUserById(req.params.query, false, false);
        } catch(e) {
            res.render("panel/pages/userSearch", {
                comma: utils.comma,
                error: `No users with the ID ${req.params.query} were found!`
            });
            return;
        }
    }

    if (twitchUser) {
        if (Date.now() - twitchUser.updated_at < FORCE_UPDATE_MINIMUM) {
            res.render("panel/pages/userSearch", {
                comma: utils.comma,
                error: `You must wait to force update this user!`
            });
            return;
        }

        delete dataCache[twitchUser._id];
        await twitchUser.updateData();
        await twitchUser.fetchFollowers();
        await twitchUser.save();
        res.redirect("/panel/user/" + twitchUser._id);
    } else {
        res.render("panel/pages/userSearch", {
            comma: utils.comma,
            error: `Discord users may not be force updated at this time!`
        });
    }
});

router.get("/:query/migrate", async (req, res) => {
    let twitchUser;
    try {
        twitchUser = await utils.Twitch.getUserById(req.params.query, false, false);
    } catch(e) {
    }

    if (twitchUser) {
        delete dataCache[twitchUser._id];
        try {
            await twitchUser.migrateData();
            res.redirect("/panel/user/" + twitchUser._id);
        } catch(err) {
            res.render("panel/pages/userSearch", {
                comma: utils.comma,
                error: String(err),
            });
        }
    } else {
        res.render("panel/pages/userSearch", {
            comma: utils.comma,
            error: `No users with the ID ${req.params.query} were found!`,
        });
    }
});

module.exports = router;
