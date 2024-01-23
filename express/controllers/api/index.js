const express = require("express");
const router = express.Router();

const user = require("./user");
const twitch = require("./twitch/");

const io = require("@pm2/io");

const apiRequests = io.counter({
    id: "app/realtime/requests/api",
    name: "API Requests",
})

router.use((r,_r,next) => {
    apiRequests.inc();
    next();
})

router.use("/user", user);

router.use("/twitch", twitch);

module.exports = router;
