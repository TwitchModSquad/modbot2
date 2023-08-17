const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");

router.get("/search", async (req, res) => {
    res.send("hello");
});

router.get("/:query", async (req, res) => {
    res.send("hello");
});

module.exports = router;
