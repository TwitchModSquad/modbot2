const DiscordAuthentication = require("./DiscordAuthentication");
const TwitchAuthentication = require("./TwitchAuthentication");

class Authentication {
    
    /**
     * Methods for Discord authentication
     * @type {DiscordAuthentication}
     */
    Discord = new DiscordAuthentication();

    /**
     * Methods for Twitch authentication
     * @type {TwitchAuthentication}
     */
    Twitch = new TwitchAuthentication();

}

module.exports = Authentication;
