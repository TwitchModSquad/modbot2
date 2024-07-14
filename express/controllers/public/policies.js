const express = require("express");
const router = express.Router();

router.get("/terms-of-service", (req, res) => {
    res.render("public/pages/tos");
})

router.get("/privacy-policy", (req, res) => {
    res.render("public/pages/privacy");
})

module.exports = router;
