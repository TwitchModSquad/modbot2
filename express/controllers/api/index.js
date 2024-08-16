const express = require("express");
const router = express.Router();

const utils = require("../../../utils");

const user = require("./user");
const twitch = require("./twitch/");
const discord = require("./discord/");
const me = require("./me");

const io = require("@pm2/io");

const apiRequests = io.counter({
    id: "app/realtime/requests/api",
    name: "API Requests",
})

router.use((r,_r,next) => {
    apiRequests.inc();
    next();
})

router.use(async (req, res, next) => {
    let session = req.headers.authorization;
    if (!session) {
        session = req.cookies?.session;
    }

    res.header("Vary","Origin")
    res.header("Access-Control-Allow-Methods","*");
    res.header("Access-Control-Allow-Headers","Authorization, Origin, Content-Type");
    if (req.headers.origin && req.headers.origin.replace("https://","").replace("www.","") === "twitch.tv") {
        res.header("Access-Control-Allow-Origin","https://www.twitch.tv")
    } else {
        res.header("Access-Control-Allow-Origin","https://tms.to")
    }

    if (req.method === "OPTIONS") {
        return res.send("");
    }

    if (!session) {
        res.status(401);
        return res.json({ok: false, error: "Unauthorized"})
    }

    try {
        req.session = await utils.SessionStore.getSessionById(session);
        next();
    } catch(err) {
        res.status(401);
        return res.json({ok: false, error: "Unauthorized"})
    }
});

router.use("/user", user);

router.use("/twitch", twitch);
router.use("/discord", discord);

router.use("/me", me);

module.exports = router;
