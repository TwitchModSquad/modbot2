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

    if (!cookies?.session) {
        return redirect();
    }

    try {
        const session = await utils.SessionStore.getSessionById(cookies.session);
        if (!session.identity.authenticated) {
            return redirect();
        }
        req.session = session;
        next();
    } catch(err)  {
        redirect();
    }
});

router.use("/panel", panel);

router.get("/join", (req, res) => {
    res.redirect("/auth/login");
})

module.exports = router;
