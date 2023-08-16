const { TextChannel, Message, codeBlock } = require("discord.js");

const config = require("../../config.json");

const DiscordMessage = require("./DiscordMessage");
const DiscordUser = require("./DiscordUser");
const DiscordUserSchema = require("./DiscordUserSchema");

const Cache = require("../Cache/Cache");

class Discord {

    /**
     * Cache for Discord users
     * @type {Cache}
     */
    userCache = new Cache(1 * 60 * 60 * 1000); // 1 hour cache

    /**
     * Various Discord channels
     * @type {{ban:TextChannel,live:TextChannel}}
     */
    channels = {
        ban: null,
        live: null,
    }

    /**
     * Various Discord messages
     * @type {{globalTimeout:Message,globalBan:Message}}
     */
    messages = {
        globalTimeout: null,
        globalBan: null,
    };

    /**
     * Records if message content has changed
     * @type {boolean}
     */
    messageChanges = false;

    /**
     * Carries cached timeout content
     * @type {string}
     */
    timeoutContent = "";

    /**
     * Carries cached ban content
     * @type {string}
     */
    banContent = "";

    /**
     * Internal method for retrieving a user if it is not present in the database
     * @param {string} id 
     */
    getUserByIdByForce(id) {
        return new Promise((resolve, reject) => {
            global.client.modbot.users.fetch(id).then(async user => {
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

    /**
     * Creates a new Global Timeout message
     * @returns {Promise<Message>}
     */
    async createGlobalTimeoutMessage() {
        await DiscordMessage.deleteMany({twitchGlobalTimeouts: true});

        const message = await this.channels.ban.send("# Global Timeouts\n" + codeBlock("None to display!"));
        await DiscordMessage.create({
            _id: message.id,
            twitchGlobalTimeouts: true,
        });
        this.messages.globalTimeout = message;
        try {
            await message.pin("Pinning global message");
        } catch(e) {
            console.error(e);
        }
        return message;
    }

    /**
     * Creates a new Global Ban message
     * @returns {Promise<Message>}
     */
    async createGlobalBanMessage() {
        await DiscordMessage.deleteMany({twitchGlobalBans: true});

        const message = await this.channels.ban.send("# Global Bans\n" + codeBlock("None to display!"));
        await DiscordMessage.create({
            _id: message.id,
            twitchGlobalBans: true,
        });
        this.messages.globalBan = message;
        try {
            await message.pin("Pinning global message");
        } catch(e) {
            console.error(e);
        }
        return message;
    }

    /**
     * Adds a new timeout to the global timeouts
     * @param {string} timeoutMessage
     * @returns {Promise<Message>}
     */
    addTimeout(timeoutMessage) {
        const splitMessage = this.timeoutContent.replace("`", "").split("\n");
        let effectiveLines = timeoutMessage;
        splitMessage.forEach(line => {
            if (effectiveLines.length >= 1750) return;
            if (line.startsWith("#")) return;
            if (line.length < 4) return;
            if (line === "None to display!") return;

            effectiveLines += `\n${line}`;
        });
        this.timeoutContent = effectiveLines;
        this.messageChanges = true;
    }

    /**
     * Adds a new ban to the global bans
     * @param {string} timeoutMessage
     * @returns {Promise<Message>}
     */
    addBan(banMessage) {
        const splitMessage = this.banContent.replace("`", "").split("\n");
        let effectiveLines = banMessage;
        splitMessage.forEach(line => {
            if (effectiveLines.length >= 1750) return;
            if (line.startsWith("#")) return;
            if (line.length < 4) return;
            if (line === "None to display!") return;

            effectiveLines += `\n${line}`;
        });
        this.banContent = effectiveLines;
        this.messageChanges = true;
    }

    async updateMessages() {
        if (!this.messageChanges) return;
        
        if (!this.timeoutContent.includes("`"))
            await this.messages.globalTimeout.edit({
                content: `# Global Timeouts\n${codeBlock(this.timeoutContent)}`,
            });
        if (!this.banContent.includes("`"))
            await this.messages.globalBan.edit({
                content: `# Global Bans\n${codeBlock(this.banContent)}`,
            });
        this.messageChanges = false;
    }

    /**
     * Initializes Discord-related services
     * @returns {Promise<null>}
     */
    async init() {
        this.channels.ban = await global.client.modbot.channels.fetch(config.discord.modbot.channels.ban);
        this.channels.live = await global.client.modbot.channels.fetch(config.discord.modbot.channels.live);

        const globalTimeoutMessage = await DiscordMessage.find({twitchGlobalTimeouts: true})
                .sort({time_sent: -1})
                .limit(1);
        const globalBanMessage = await DiscordMessage.find({twitchGlobalBans: true})
                .sort({time_sent: -1})
                .limit(1);

        if (globalTimeoutMessage.length > 0) {
            try {
                this.messages.globalTimeout = await this.channels.ban.messages.fetch(globalTimeoutMessage[0]._id);
            } catch(e) {
                console.error(e);
            }
        }

        if (globalBanMessage.length > 0) {
            try {
                this.messages.globalBan = await this.channels.ban.messages.fetch(globalBanMessage[0]._id);
            } catch(e) {
                console.error(e);
            }
        }

        if (!this.messages.globalTimeout)
            await this.createGlobalTimeoutMessage();
        if (!this.messages.globalBan)
            await this.createGlobalBanMessage();

        this.timeoutContent = this.messages.globalTimeout.content;
        this.banContent = this.messages.globalBan.content;

        console.log(
            `[MB] Using channel #${this.channels.ban.name} for bans, #${this.channels.live.name} for livestreams\n` +
            `[MB] Using message ${this.messages.globalTimeout.id} for timeouts, ${this.messages.globalBan.id} for bans`
        );

        setInterval(() => {
            this.updateMessages();
        }, 5000);
    }

}

module.exports = Discord;
