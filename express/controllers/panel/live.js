const express = require("express");
const router = express.Router();

router.get("/chat", (req, res) => {
    res.render("panel/pages/live/chat");
});

router.get("/bans", (req, res) => {
    res.render("panel/pages/live/bans");
});

module.exports = router;
