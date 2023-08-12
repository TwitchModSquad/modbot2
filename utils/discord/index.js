const DiscordUser = require("./DiscordUser");
const DiscordUserSchema = require("./DiscordUserSchema");

const Cache = require("../Cache/Cache");

const client = require("../../discord/modbot/");

class Discord {

    /**
     * Cache for Discord users
     * @type {Cache}
     */
    userCache = new Cache(1 * 60 * 60 * 1000); // 1 hour cache

    /**
     * Internal method for retrieving a user if it is not present in the database
     * @param {string} id 
     */
    getUserByIdByForce(id) {
        return new Promise((resolve, reject) => {
            client.users.fetch(id).then(async user => {
                const discordUser = await DiscordUser.create({
                    _id: user.id,
                    globalName: user.globalName,
                    displayName: user.displayName,
                    discriminator: user.discriminator,
                    avatar: user.avatar,
                });
                resolve(discordUser);
            }, reject);
        });
    }

    /**
     * Gets a user based on a Discord user ID.
     * @param {string} id 
     * @param {?boolean} overrideCache
     * @param {?boolean} requestIfUnavailable
     * 
     * @returns {Promise<DiscordUserSchema>}
     */
    getUserById(id, overrideCache = false, requestIfUnavailable = false) {
        return this.userCache.get(id, async (resolve, reject) => {
            const discordUser = await DiscordUser.findById(id);
            if (discordUser) {
                resolve(discordUser);
            } else {
                if (requestIfUnavailable) {
                    this.getUserByIdByForce(id).then(resolve, reject);
                } else {
                    reject("User not found");
                }
            }
        }, overrideCache);
    }

}

module.exports = Discord;
