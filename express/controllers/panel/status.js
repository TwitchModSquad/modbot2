const express = require("express");
const router = express.Router();

const utils = require("../../../utils/");
const listenClients = require("../../../twitch/");

router.get("/", async (req, res) => {
    let members = [];
    let partners = [];
    let affiliates = [];

    for (let i = 0; i < listenClients.member.channels.length; i++) {
        members.push(await utils.Twitch.getUserByName(listenClients.member.channels[i]));
    }
    for (let i = 0; i < listenClients.partner.channels.length; i++) {
        partners.push(await utils.Twitch.getUserByName(listenClients.partner.channels[i]));
    }
    for (let i = 0; i < listenClients.affiliate.channels.length; i++) {
        affiliates.push(await utils.Twitch.getUserByName(listenClients.affiliate.channels[i]));
    }

    res.render("panel/pages/status", {
        members: members,
        partners: partners,
        affiliates: affiliates,
        comma: utils.comma,
    });
});

module.exports = router;
