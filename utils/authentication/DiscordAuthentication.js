const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require("../../config.json");

const SCOPES = "guilds.join identify";

class DiscordAuthentication {

    DISCORD_URL = `https://discord.com/api/oauth2/authorize?client_id=${config.discord.auth.client_id}&redirect_uri={redirectURI}&response_type=code&scope={scope}`;
    DISCORD_REDIRECT = config.express.domain.root + "auth/discord";

    /**
     * Returns the OAuth2 URI given the scopes & redirect URI
     * @param {string} scope 
     * @param {string} redirectURI 
     * @returns {string}
     */
    getURL(scope = SCOPES, redirectURI = this.DISCORD_REDIRECT) {
        return this.DISCORD_URL
            .replace("{scope}", encodeURIComponent(scope))
            .replace("{redirectURI}", encodeURIComponent(redirectURI));
    }

    /**
     * Returns an access token from an OAuth code
     * @param {string} code 
     * @param {string} redirectURI 
     * @returns {any}
     */
    async getToken(code, redirectURI = this.DISCORD_REDIRECT) {
        const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: config.discord.auth.client_id,
                client_secret: config.discord.auth.secret_id,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectURI,
                scope: 'identify',
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        return await oauthResult.json();
    }
    
    async getUser(accessToken, tokenType) {
        const userResult = await fetch('https://discord.com/api/users/@me', {
            method: 'GET',
            headers: {
                authorization: `${tokenType} ${accessToken}`,
            },
        });
        return await userResult.json();
    }

    /**
     * Utilizes a refresh token to obtain an access token for a user.
     * @param {string} refresh_token 
     * @returns {Promise<string>}
     */
    getAccessToken(refresh_token) {
        return new Promise(async (resolve, reject) => {
            const oauthResult = await fetch("https://discord.com/api/oauth2/token", {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: config.discord.auth.client_id,
                    client_secret: config.discord.auth.secret_id,
                    refresh_token: refresh_token,
                    grant_type: "refresh_token",
                }),
            });
        
            oauthResult.json().then(oauthData => {
                if (oauthData?.access_token) {
                    resolve(oauthData);
                } else {
                    console.error(oauthData);

                    reject("Unable to request access token, reason: " + oauthData?.message);
                }
            }, reject);
        });
    }

}

module.exports = DiscordAuthentication;