const express = require("express");
const router = express.Router();

router.get("/", (req, res) =>  {
    res.redirect("https://tms.to/auth/login");
})

module.exports = router;
