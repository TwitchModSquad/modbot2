const express = require("express");
const router = express.Router();

const utils = require("../../utils/");

const api = require("./api/");

const authentication = require("./authentication/");

const panel = require("./panel/");
const public = require("./public/");

const io = require("@pm2/io");

const requests = io.counter({
    id: "app/realtime/requests/all",
    name: "All Requests",
})

router.use((r,r_,next) => {
    requests.inc();
    next();
});

router.use("/api", api);

router.use("/auth", authentication);

router.use("/", public);

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

router.use("/panel", panel);

router.get("/join", (req, res) => {
    res.redirect("/auth/login");
})

module.exports = router;
