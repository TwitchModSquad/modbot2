const express = require("express");
const router = express.Router();

const authentication = require("./authentication/");

const panel = require("./panel/");
const public = require("./public/");

router.use("/auth", authentication);

router.use("/", public);

router.use("/panel", panel);

module.exports = router;
