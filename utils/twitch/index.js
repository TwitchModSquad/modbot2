const { RefreshingAuthProvider } = require("@twurple/auth");
const { ApiClient } = require("@twurple/api");

const config = require("../../config.json");

const Cache = require("../Cache/Cache");

const TwitchUser = require("./TwitchUser");
const TwitchToken = require("./TwitchToken");

const authProvider = new RefreshingAuthProvider({
    clientId: config.twitch.client_id,
    clientSecret: config.twitch.client_secret,
    redirectUri: config.express.domain.root + "auth/twitch",
});

const api = new ApiClient({
    authProvider,
});

(async function() {
    const tokens = await TwitchToken.find({});

    let foundTMSUser = false;

    tokens.forEach(token => {
        let intents = [];

        if (token.user === config.twitch.id) {
            intents.push("tms:chat");
            foundTMSUser = true;
        }

        authProvider.addUser(token.user, token.tokenData, intents);
    });

    if (!foundTMSUser) {
        console.error("TwitchModSquad is not authenticated! We may not join channels or fetch data.")
    }

    console.log(`Added ${tokens.length} pre-existing tokens to AuthProvider`)
})();

class Twitch {

    /**
     * The Twitch auth provider
     * @type {RefreshingAuthProvider}
     */
    authProvider = authProvider;

    /**
     * Twitch Helix API
     * @type {ApiClient}
     */
    Helix = api;

    /**
     * Cache for Twitch users
     * @type {Cache}
     */
    userCache = new Cache(1 * 60 * 60 * 1000); // 1 hour cache

    /**
     * Simple cache of username-ID pairs for quickly retrieving user names
     */
    nameCache = {};

    /**
     * Requests a user directly from the Twitch Helix API
     * This method should NEVER be used externally as it can take a substantial amount of time to request and WILL overwrite other data.
     * @param {string} id 
     * @returns {Promise<TwitchUser>}
     */
    getUserByIdByForce(id) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await api.users.getUserByIdBatched(id);
    
                const dbUser = await TwitchUser.findOneAndUpdate(
                    {
                        _id: user.id
                    }, {
                        _id: user.id,
                        login: user.name,
                        display_name: user.displayName,
                        type: user.type,
                        broadcaster_type: user.broadcasterType,
                        description: user.description,
                        profile_image_url: user.profilePictureUrl,
                        offline_image_url: user.offlinePlaceholderUrl,
                        created_at: user.creationDate,
                    }, {
                        upsert: true,
                        new: true,
                    }
                );

                resolve(dbUser);
            } catch(err) {
                console.error(err);
                reject("User not found!"); // TODO: Better error management
            }
        });
    }

    /**
     * Gets a user based on a Twitch user ID.
     * @param {string} id 
     * @param {boolean} bypassCache
     * @param {boolean} requestIfUnavailable
     * 
     * @returns {Promise<TwitchUser>}
     */
    getUserById(id, bypassCache = false, requestIfUnavailable = false) {
        return this.userCache.get(id, async (resolve, reject) => {
            if (!id) {
                console.error("No user ID was given for Twitch#getUserById");
                return reject("No user ID was given");
            }

            const user = await TwitchUser.findById(id)
                    .populate("identity");
            if (user) {
                resolve(user);
            } else {
                if (requestIfUnavailable) {
                    this.getUserByIdByForce(id).then(resolve, reject);
                } else {
                    reject("User not found!");
                }
            }
        }, bypassCache);
    }

    /**
     * Requests a user directly from the Twitch Helix API
     * This method should NEVER be used externally as it can take a substantial amount of time to request and WILL overwrite other data.
     * @param {string} login 
     * @returns {Promise<TwitchUser>}
     */
    getUserByNameByForce(login) {
        return new Promise(async (resolve, reject) => {
            try {
                let helixUser = await api.helix.users.getUserByName(login);

                if (helixUser) {
                    const user = await TwitchUser.findOneAndUpdate(
                        {
                            _id: helixUser.id,
                        },
                        {
                            _id: helixUser.id,
                            login: helixUser.name,
                            display_name: helixUser.displayName,
                            type: helixUser.type,
                            broadcaster_type: helixUser.broadcasterType,
                            description: helixUser.description,
                            profile_image_url: helixUser.profilePictureUrl,
                            offline_image_url: helixUser.offlinePlaceholderUrl,
                            created_at: helixUser.creationDate,
                        }, {
                            upsert: true,
                            new: true,
                        }
                    );
                    
                    resolve(user);
                } else {
                    reject("User not found!");
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Gets a user based on a Twitch name
     * @param {string} login
     * @param {boolean} requestIfUnavailable default false
     * @param {boolean} bypassCache default false
     * @returns {Promise<TwitchUser>}
     */
    getUserByName(login, requestIfUnavailable = false, bypassCache = false) {
        login = login.replace("#","").toLowerCase();
        return new Promise(async (resolve, reject) => {
            try {
                if (this.nameCache.hasOwnProperty(login)) {
                    try {
                        const user = await this.getUserById(this.nameCache[login], bypassCache, false);
                        resolve(user);
                        return;
                    } catch(e) {}
                }
                const user = await TwitchUser.findOne({login: login})
                    .populate("identity");
                if (user) {
                    this.nameCache[user.login] = user._id;
                    resolve(user);
                } else {
                    if (requestIfUnavailable) {
                        this.getUserByNameByForce(login).then(resolve, reject);
                    } else {
                        reject("User not found!");
                    }
                }
            } catch(e) {
                reject(e);
            }
        });
    }

}

module.exports = Twitch;
