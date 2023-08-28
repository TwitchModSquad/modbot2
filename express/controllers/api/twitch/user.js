const express = require("express");
const router = express.Router();

const utils = require("../../../../utils/");

router.get("/:id", async (req, res) => {
    try {
        const user = await utils.Twitch.getUserById(req.params.id, false, false);
        res.json({ok: true, data: user.public()});
    } catch(err) {
        res.status(404);
        res.json({ok: false, error: "Unable to get user!"});
    }
});

module.exports = router;
