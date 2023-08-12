const utils = require("../utils/");
const config = require("../config.json");

const ListenClient = require("./ListenClient");

const memberClient = new ListenClient("member");
const partnerClient = new ListenClient("partner");
const affiliateClient = new ListenClient("affiliate");

utils.Schemas.TwitchUser.find({chat_listen: true}).then(users => {
    users.forEach(user => {
        memberClient.join(user.login);
    });
    memberClient.connect();
}, console.error);

partnerClient.connect(config.twitch.crawler.username, config.twitch.crawler.oauth);
affiliateClient.connect(config.twitch.crawler.username, config.twitch.crawler.oauth);

const combined = {
    member: memberClient,
    partner: partnerClient,
    affiliate: affiliateClient,
};

global.client.listen = combined;

module.exports = combined;
