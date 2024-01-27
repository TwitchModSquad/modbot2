const express = require("express");
const router = express.Router();

const utils = require("../../../utils");

const user = require("./user");
const twitch = require("./twitch/");
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

    if (!session) {
        res.status(401);
        return res.json({ok: false, error: "Unauthorized"})
    }

    try {
        req.session = await utils.SessionStore.getSessionById(session);
        res.header("Access-Control-Allow-Origin: tms.to")
        next();
    } catch(err) {
        res.status(401);
        return res.json({ok: false, error: "Unauthorized"})
    }
});

router.use("/user", user);

router.use("/twitch", twitch);

router.use("/me", me);

module.exports = router;
