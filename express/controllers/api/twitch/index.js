const express = require("express");
const router = express.Router();

const ban = require("./ban");
const chat = require("./chat");
const user = require("./user");

router.use("/ban", ban);
router.use("/chat", chat);
router.use("/user", user);

module.exports = router;
