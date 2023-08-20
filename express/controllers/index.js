const express = require("express");
const router = express.Router();

const utils = require("../../utils/");

const api = require("./api/");

const authentication = require("./authentication/");

const panel = require("./panel/");
const public = require("./public/");

router.use("/auth", authentication);

router.use(async (req, res, next) => {
    const {cookies} = req;

    const redirect = () => {
        res.redirect("/auth/login");
    }

    if (cookies?.session) {
        const session = await utils.Schemas.Session.findById(cookies.session)
                .populate("identity");
        if (session?.identity?.authenticated) {
            req.session = session;
            next();
        } else {
            redirect();
        }
    } else {
        redirect();
    }
});

router.use("/api", api);

router.use("/", public);

router.use("/panel", panel);

module.exports = router;
