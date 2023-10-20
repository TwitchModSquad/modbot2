const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");
const config = require("../../../config.json");

router.get("/", async (req, res) => {
    res.render("panel/pages/overview", {
        WS_URI: config.express.domain.root.replace("http://", "ws://").replace("https://", "wss://") + "ws/overview",
        wos: req?.query?.wos !== undefined ? req.query.wos : null,
        force: req?.query?.force !== undefined ? true : false,
        botListening: global.botListening,
    });
});

module.exports = router;
