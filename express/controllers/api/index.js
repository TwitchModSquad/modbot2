const express = require("express");
const router = express.Router();

const user = require("./user");

const twitch = require("./twitch/");

router.use("/user", user);

router.use("/twitch", twitch);

module.exports = router;
