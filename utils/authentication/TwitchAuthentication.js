const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require("../../config.json");

class TwitchAuthentication {

    TWITCH_URL = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${config.twitch.client_id}&redirect_uri={redirectURI}&scope={scope}`;
    TWITCH_REDIRECT = config.express.domain.root + "auth/twitch";

    followerAccessToken = null;

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
    
    /**
     * Given an oauth code from the redirected Twitch request, requests a refresh token and client token from Twitch
     * @param {string} code 
     * @param {string} redirectURI
     * @returns {Promise<{access_token: string, expires_in: number, refresh_token: string, scope: object, token_type: string}>}
     */
    async getToken(code, redirectURI = this.TWITCH_REDIRECT) {
        const oauthResult = await fetch("https://id.twitch.tv/oauth2/token", {
            method: 'POST',
            body: new URLSearchParams({
                client_id: config.twitch.client_id,
                client_secret: config.twitch.client_secret,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: redirectURI,
            }),
        });

        return await oauthResult.json();
    }

    /**
     * Given an access token, retrieve the user ID under that token.
     * @returns {Promise<{id: string, login: string, display_name: string, type: string, broadcaster_type: string, description: string, profile_image_url: string, offline_image_url: string, view_count: number, email: string, created_at: string>}
     */
    async getUser(accessToken) {
        const userResult = await fetch('https://api.twitch.tv/helix/users', {
            method: 'GET',
            headers: {
                ["Client-ID"]: config.twitch.client_id,
                Authorization: `Bearer ${accessToken}`,
            },
        });

        let json;
        try {
            json = await userResult.json()
        } catch (err) {
            throw new Error(err);
        }

        if (json.data?.length === 1) {
            return json.data[0];
        } else {
            throw new Error(json.data?.length + " results were returned, expected 1");
        }
    }

    /**
     * Parses scopes to a string for storing in the database
     * @param {object} scopes 
     * @returns {string}
     */
    textifyScopes(scopes) {
        let result = "";
        scopes.forEach(scope => {
            if (result !== "") {
                result += "\n";
            }
            result += scope;
        })
        return result;
    }

    /**
     * Parses scopes to an object from a string in the database
     * @param {string} scopes 
     * @returns {object}
     */
    objectifyScopes(scopes) {
        return scopes.split("\n");
    }

    /**
     * Utilizes a refresh token to obtain an access token for a user.
     * @param {string} refresh_token 
     * @returns {Promise<string>}
     */
    getAccessToken(refresh_token) {
        return new Promise(async (resolve, reject) => {
            const oauthResult = await fetch("https://id.twitch.tv/oauth2/token", {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: config.twitch.client_id,
                    client_secret: config.twitch.client_secret,
                    refresh_token: refresh_token,
                    grant_type: "refresh_token",
                }),
            });
        
            oauthResult.json().then(oauthData => {
                if (oauthData?.access_token) {
                    resolve(oauthData.access_token);
                } else {
                    console.error(oauthData);

                    reject("Unable to request access token, reason: " + oauthData?.message);
                }
            }, reject);
        });
    }

    /**
     * Gets a role via path, access token, and broadcaster ID
     * @param {string} path 
     * @param {string} accessToken 
     * @param {number} broadcasterId 
     * @returns {Promise<TwitchUser>}
     */
    getRole(path, accessToken, broadcasterId) {
        return new Promise(async (resolve, reject) => {
            let result = [];
            const get = async cursor => {
                return await fetch("https://api.twitch.tv/helix/"+path+"?first=100&broadcaster_id=" + encodeURIComponent(broadcasterId) + (cursor !== null ? "&after=" + cursor : ""), {
                    method: 'GET',
                    headers: {
                        ["Client-ID"]: config.twitch.client_id,
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
            }

            try {
                let cursor = null;
                while(true) {
                    let json = await (await get(cursor)).json();

                    for (let i = 0; i < json.data.length; i++) {
                        result = [
                            ...result,
                            await global.api.Twitch.getUserById(json.data[i].user_id, false, true)
                        ]
                    }

                    if (json.pagination?.cursor) {
                        cursor = json.pagination.cursor;
                    } else break;
                }
                resolve(result);
            } catch(err) {
                reject(err);
                return;
            }
        });
    }

    /**
     * Returns a list of VIPs for a user access token
     * @param {string} accessToken 
     * @param {number} broadcasterId
     * @returns {Promise<TwitchUser[]>}
     */
    getVIPs(accessToken, broadcasterId) {
        return this.getRole("channels/vips", accessToken, broadcasterId)
    }

    /**
     * Returns a list of moderators for a user access token
     * @param {string} accessToken 
     * @param {number} broadcasterId
     * @returns {Promise<TwitchUser[]>}
     */
    getMods(accessToken, broadcasterId) {
        return this.getRole("moderation/moderators", accessToken, broadcasterId)
    }

    /**
     * Returns a list of editors for a user access token
     * @param {string} accessToken 
     * @param {number} broadcasterId
     * @returns {Promise<TwitchUser[]>}
     */
    getEditors(accessToken, broadcasterId) {
        return this.getRole("channels/editors", accessToken, broadcasterId)
    }

    /**
     * Bans a user in the specified channel utilizing an access token of the moderator or broadcaster
     * @param {string} broadcaster_id 
     * @param {string} moderator_id 
     * @param {string} access_token 
     * @param {string} user_id 
     * @param {string} reason 
     * @returns {Promise<void>}
     */
    banUser(broadcaster_id, moderator_id, access_token, user_id, reason) {
        return new Promise(async (resolve, reject) => {
            const oauthResult = await fetch(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${encodeURIComponent(broadcaster_id)}&moderator_id=${encodeURIComponent(moderator_id)}`, {
                method: 'POST',
                headers: {
                    Authorization: "Bearer " + access_token,
                    "Client-Id": config.twitch.client_id,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({data:{user_id: user_id, reason: reason}}),
            });
        
            if (oauthResult.status === 200) {
                resolve();
            } else {
                try {
                    const json = await oauthResult.json();
                    if (json?.message) {
                        reject(json.message);
                    } else {
                        reject(oauthResult.statusText);
                    }
                } catch(err) {
                    reject(err);
                }
            }
        });
    }

    /**
     * Gets bans via access token and broadcaster ID
     * @param {string} accessToken 
     * @param {string} broadcasterId 
     * @returns {Promise<TwitchUser>}
     */
    getBans(accessToken, broadcasterId) {
        return new Promise(async (resolve, reject) => {
            let result = [];
            const get = async cursor => {
                return await fetch("https://api.twitch.tv/helix/moderation/banned?first=100&broadcaster_id=" + encodeURIComponent(broadcasterId) + (cursor !== null ? "&after=" + cursor : ""), {
                    method: 'GET',
                    headers: {
                        ["Client-ID"]: config.twitch.client_id,
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
            }

            try {
                let cursor = null;
                while(true) {
                    let json = await (await get(cursor)).json();

                    for (let i = 0; i < json.data.length; i++) {
                        result = [
                            ...result,
                            await global.utils.Twitch.getUserById(json.data[i].user_id, false, true)
                        ]
                    }

                    if (json.pagination?.cursor) {
                        cursor = json.pagination.cursor;
                    } else break;
                }
                resolve(result);
            } catch(err) {
                reject(err);
                return;
            }
        });
    }

    /**
     * Gets ban via access token, broadcaster ID and chatter ID
     * @param {string} accessToken 
     * @param {string} broadcasterId 
     * @param {string} chatterId
     * @param {number} timeBanned
     * @param {number} padding
     * @returns {Promise<TwitchUser>}
     */
    getBan(accessToken, broadcasterId, chatterId, timeBanned = Date.now(), padding = 10000) {
        return new Promise(async (resolve, reject) => {
            const get = async () => {
                return await fetch(`https://api.twitch.tv/helix/moderation/banned?first=100&broadcaster_id=${encodeURIComponent(broadcasterId)}&user_id=${encodeURIComponent(chatterId)}`, {
                    method: 'GET',
                    headers: {
                        ["Client-ID"]: config.twitch.client_id,
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
            }

            try {
                const getBans = await get();
                const json = await getBans.json();
                if (getBans.status === 200) {
                    for (let i = 0; i < json.data.length; i++) {
                        const ban = json.data[i];
                        const at = (new Date(ban.created_at)).getTime();
                        if (Math.abs(at - timeBanned) <= padding) {
                            return resolve(ban);
                        }
                    }
                    reject("No bans found!");
                } else {
                    reject(json?.message ? json.message : getBans.status);
                }
            } catch(err) {
                reject(err);
                return;
            }
        });
    }

    /**
     * Retrieves the follower access token and stores it
     * @returns {Promise<string>}
     */
    #retrieveFollowerAccessToken() {
        return new Promise(async (resolve, reject) => {
            this.getAccessToken(config.twitch.follow_refresh).then(token => {
                this.followerAccessToken = token;
                resolve(token);
            }, reject);

        })
    }

    /**
     * Gets a channels followers
     * @param {string} broadcasterId 
     * @param {number} limit
     * @param {boolean} retry
     * @returns {Promise<any>}
     */
    getChannelFollowers(broadcasterId, limit = 1, retry = true) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.followerAccessToken) await this.#retrieveFollowerAccessToken();
            } catch(err) {
                console.error("Unable to retrieve follower access token");
                console.error(err);
                reject(err);
                return;
            }

            const oauthResult = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=${encodeURIComponent(limit)}`, {
                method: 'GET',
                headers: {
                    ["Client-ID"]: config.twitch.client_id,
                    Authorization: `Bearer ${this.followerAccessToken}`,
                },
            });

            const json = await oauthResult.json();
            if (oauthResult.status === 200) {
                resolve(json);
            } else {
                try {
                    if (json?.message) {
                        if (json.message.toLowerCase() === "invalid oauth token") {
                            console.error(`Failed to get followers for ${broadcasterId}: Invalid oauth`);
                            if (retry) {
                                this.followerAccessToken = null;
                                this.getChannelFollowers(broadcasterId, limit, false).then(resolve, reject);
                            } else {
                                reject(json.message);
                            }
                        }
                    } else {
                        reject(oauthResult.statusText);
                    }
                } catch(err) {
                    reject(err);
                }
            }
        });
    }

    /**
     * Gets a channels subscriptions
     * @param {string} broadcasterId 
     * @param {number} limit
     * @param {boolean} retry
     * @returns {Promise<any>}
     */
    getChannelSubscriptions(broadcasterId, limit = 20, retry = true) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.followerAccessToken) await this.#retrieveFollowerAccessToken();
            } catch(err) {
                console.error("Unable to retrieve follower access token");
                console.error(err);
                reject(err);
                return;
            }

            const oauthResult = await fetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${encodeURIComponent(broadcasterId)}&first=${encodeURIComponent(limit)}`, {
                method: 'GET',
                headers: {
                    ["Client-ID"]: config.twitch.client_id,
                    Authorization: `Bearer ${this.followerAccessToken}`,
                },
            });

            const json = await oauthResult.json();
            if (oauthResult.status === 200) {
                resolve(json);
            } else {
                try {
                    if (json?.message) {
                        if (json.message.toLowerCase() === "invalid oauth token") {
                            console.error(`Failed to get subscribers for ${broadcasterId}: Invalid oauth`);
                            if (retry) {
                                this.followerAccessToken = null;
                                this.getChannelSubscriptions(broadcasterId, limit, false).then(resolve, reject);
                            } else {
                                reject(json.message);
                            }
                        }
                    } else {
                        reject(oauthResult.statusText);
                    }
                } catch(err) {
                    reject(err);
                }
            }
        });
    }

    /**
     * Retrieves the moderated channels for a user
     * @param {string} accessToken
     * @param {string} userId
     * @returns {Promise<any>}
     */
    getModeratedChannels(accessToken, userId, cursor = null) {
        return new Promise(async (resolve, reject) => {
            const result = await fetch(`https://api.twitch.tv/helix/moderation/channels?user_id=${userId}&first=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`, {
                method: 'GET',
                headers: {
                    ["Client-ID"]: config.twitch.client_id,
                    Authorization: `Bearer ${accessToken}`,
                },
            });
    
            let json;
            try {
                json = await result.json();
            } catch (err) {
                throw new Error(err);
            }
    
            if (result.status === 200) {
                let result = json.data;
                if (json?.pagination?.cursor) {
                    result = [
                        ...result,
                        ...await this.getModeratedChannels(accessToken, userId, json.pagination.cursor),
                    ];
                }
                resolve(result);
            } else {
                reject(result.statusText);
            }
        });
    }

}

module.exports = TwitchAuthentication;