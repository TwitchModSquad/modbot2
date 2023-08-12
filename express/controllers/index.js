const express = require("express");
const router = express.Router();

const panel = require("./panel/");
const public = require("./public/");

router.use("/", public);

router.use("/panel", panel);

module.exports = router;
