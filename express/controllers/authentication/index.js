const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");
const config = require("../../../config.json");

const discord = require("./discord");
const twitch = require("./twitch");
const verify = require("./verify");

router.use(async (req, res, next) => {
    const {cookies} = req;

    const createNewSession = async () => {
        const sessionId = utils.stringGenerator(64);
        const session = await utils.Schemas.Session.create({_id: sessionId});
        res.cookie("session", sessionId, {domain: config.express.domain.cookie, maxAge: 14 * 24 * 60 * 60 * 1000});
        req.session = session;
        next();
    }

    if (cookies?.session) {
        const session = await utils.Schemas.Session.findById(cookies.session)
                .populate("identity");
        if (session) {
            req.session = session;
            next();
        } else {
            createNewSession();
        }
    } else {
        createNewSession();
    }
});

router.use("/discord", discord);
router.use("/twitch", twitch);
router.use("/verify", verify);

module.exports = router;
