const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

const MESSAGES_PER_PAGE = 100;

const SECONDS_CUTOFF = 13; // number of digits in a timestamp before it is considered milliseconds from Epoch

const generateData = async (req, res) => {
    const startTime = Date.now();

    let page = 0;

    if (req?.query?.page && !isNaN(Number(req.query.page)))
        page = Number(req.query.page) - 1;

    let search = {};

    let streamer;
    let chatter;

    if (req?.query?.streamer && req.query.streamer !== "none") {
        search.streamer = req.query.streamer;
        try {
            streamer = await utils.Twitch.getUserById(search.streamer, false, true);
        } catch(e) {}
    }
    if (req?.query?.chatter && req.query.chatter !== "none") {
        search.chatter = req.query.chatter;
        try {
            chatter = await utils.Twitch.getUserById(search.chatter, false, true);
        } catch(e) {}
    }
    if (req?.query?.before && !isNaN(Number(req.query.before))) {
        let date = Number(req.query.before);
        if (req.query.before.length < SECONDS_CUTOFF) date *= 1000;

        if (!search?.time_sent) search.time_sent = {};
        search.time_sent.$lt = date;
    }
    if (req?.query?.after && !isNaN(Number(req.query.after))) {
        let date = Number(req.query.after);
        if (req.query.after.length < SECONDS_CUTOFF) date *= 1000;

        if (!search?.time_sent) search.time_sent = {};
        search.time_sent.$gt = date;
    }

    const history = await utils.Schemas.TwitchChat.find(search)
            .sort({time_sent: -1})
            .skip(page * MESSAGES_PER_PAGE)
            .limit(MESSAGES_PER_PAGE)
            .populate("streamer")
            .populate("chatter");

    let fullHistory = [];

    if (history.length > 0) {
        let punishmentQuery = {
            time_start: {
                $lt: history[0].time_sent + 60000,
                $gt: history[history.length - 1].time_sent,
            },
        };

        if (streamer) punishmentQuery.streamer = streamer;
        if (chatter) punishmentQuery.chatter = chatter;
        
        const bans = await utils.Schemas.TwitchBan.find(punishmentQuery)
                .populate("streamer")
                .populate("chatter")
                .sort({time_start: -1});
        const timeouts = await utils.Schemas.TwitchTimeout.find(punishmentQuery)
                .populate("streamer")
                .populate("chatter")
                .sort({time_start: -1});

        bans.forEach(ban => {
            ban.type = "ban";
        });
        timeouts.forEach(timeout => {
            timeout.type = "timeout";
        });

        let lastTime = history[0].time_sent + 60000;
        history.forEach(row => {
            row.type = "message";
            fullHistory = [
                ...fullHistory,
                ...bans.filter(x => x.time_start < lastTime && x.time_start >= row.time_sent),
                ...timeouts.filter(x => x.time_start < lastTime && x.time_start >= row.time_sent),
                row,
            ]
            lastTime = row.time_sent;
        });
    }
    
    return {
        history: fullHistory,
        streamer: streamer,
        chatter: chatter,
        elapsed: Date.now() - startTime,
        parseDate: date => utils.parseDate(date),
        comma: utils.comma,
    };
}

router.get("/", async (req, res) => {
    res.render("panel/pages/chatHistory", await generateData(req, res));
});

router.get("/popup", async (req, res) => {
    res.render("panel/pages/chatHistoryPopup", await generateData(req, res));
});

module.exports = router;
