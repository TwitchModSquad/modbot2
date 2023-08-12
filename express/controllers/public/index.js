const express = require("express");
const router = express.Router();

router.get("/", (req, res) =>  {
    res.render("public/pages/index");
})

module.exports = router;
