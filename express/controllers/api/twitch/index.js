const express = require("express");
const router = express.Router();

const ban = require("./ban");
const user = require("./user");

router.use("/ban", ban);
router.use("/user", user);

module.exports = router;
