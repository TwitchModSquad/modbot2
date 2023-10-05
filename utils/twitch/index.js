const config = require("../../config.json");

const Cache = require("../Cache/Cache");

const TwitchUser = require("./TwitchUser");

const {ApiClient} = require("twitch");
const {ClientCredentialsAuthProvider} = require("twitch-auth");

const authProvider = new ClientCredentialsAuthProvider(config.twitch.client_id, config.twitch.client_secret);
const api = new ApiClient({ authProvider });

class Twitch {

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
     * Caches forced queries to avoid multiple requests.
     * @type {{id:string,resolve:Promise,reject:Promise}[]}
     */
    forceCache = [];

    /**
     * Tick to retrieve all users in the cache. This is ran once every 500ms
     */
    async getUserByIdTick() {
        if (this.forceCache.length === 0) return;

        let ids = [];
        for (let i = 0; i < this.forceCache.length; i++) {
            const id = this.forceCache[i].id;
            if (!ids.includes(id)) ids.push(id);
            if (ids.length >= 100) break;
        }

        const users = await api.helix.users.getUsersByIds(ids);
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            let forces = this.forceCache.filter(x => x.id === user.id);

            try {
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
    
                forces.forEach(force => {
                    force.resolve(dbUser);
                });
    
                this.forceCache = this.forceCache.filter(x => x.id !== user.id);
            } catch(e) {
                console.error(e);
            }
        }
        
        for (let i = 0; i < ids.length; i++) {
            let forces = this.forceCache.filter(x => x.id === ids[i]);
            forces.forEach(force => {
                force.reject("User not found!");
            });
        }

        this.forceCache = this.forceCache.filter(x => !ids.includes(x.id));
    }

    /**
     * Requests a user directly from the Twitch Helix API
     * This method should NEVER be used externally as it can take a substantial amount of time to request and WILL overwrite other data.
     * @param {string} id 
     * @returns {Promise<TwitchUser>}
     */
    getUserByIdByForce(id) {
        return new Promise(async (resolve, reject) => {
            this.forceCache.push({
                id: id,
                resolve: resolve,
                reject: reject,
            });
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

    constructor() {
        setInterval(async () => {
            try {
                await this.getUserByIdTick()
            } catch(e) {
                console.error(e);
            }
        }, 500);
    }

}

module.exports = Twitch;
