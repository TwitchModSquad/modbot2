const utils = require("../utils/");

const twitchUserStream = utils.Schemas.TwitchUser.synchronize();
let twitchUserCount = 0;

twitchUserStream.on("data", function(err, doc) {
    if (twitchUserCount % 100 === 0) {
        console.log("Twitch User Count: " + twitchUserCount)
    }
    twitchUserCount++;
});

twitchUserStream.on("close", function() {
    console.log("Indexed " + twitchUserCount + " Twitch users");
});

twitchUserStream.on("error", function(err) {
    console.error(err);
});

const discordUserStream = utils.Schemas.DiscordUser.synchronize();
let discordUserCount = 0;

discordUserStream.on("data", function(err, doc) {
    if (discordUserCount % 100 === 0) {
        console.log("Discord User Count: " + discordUserCount)
    }
    discordUserCount++;
});

discordUserStream.on("close", function() {
    console.log("Indexed " + discordUserCount + " Discord users");
});

discordUserStream.on("error", function(err) {
    console.error(err);
});
