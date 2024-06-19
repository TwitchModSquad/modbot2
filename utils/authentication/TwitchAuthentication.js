const config = require("../../config.json");

class TwitchAuthentication {

    TWITCH_URL = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${config.twitch.client_id}&redirect_uri={redirectURI}&scope={scope}`;
    TWITCH_REDIRECT = config.express.domain.root + "auth/twitch";

    /**
     * Returns the OAuth2 URI given the scopes & redirect URI
     * @param {string} scope 
     * @param {string} redirectURI 
     * @returns {string}
     */
    getURL(scope, redirectURI = this.TWITCH_REDIRECT) {
        return this.TWITCH_URL
            .replace("{scope}", encodeURIComponent(scope))
            .replace("{redirectURI}", encodeURIComponent(redirectURI));
    }

}

module.exports = TwitchAuthentication;