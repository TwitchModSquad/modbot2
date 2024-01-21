const config = require("../config.json");

const MOST_ACTIVE_TIME = 15 * 1000; // 15 seconds
const MOST_ACTIVE_CHANNEL_COUNT = 15;
const MAX_FOLLOWERS = 10;
const MAX_SUBSCRIBERS = 10;

class StatsManager {

    mostActiveChannels = {};

    hourlyActivity = [];
    currentHourlyActivity;

    generalStatistics = {
        bans: 0,
        timeouts: 0,
        messages: 0,
        streamers: 0,
    };

    memberStreams = [];

    recentFollowers = [];
    recentSubscriptions = [];

    /**
     * Gets the current most active channels
     * @returns {[{channel: string, messages: number, bans: number, timeouts: number}]}
     */
    getMostActiveChannels() {
        let totalList = [];
        for (const channel in this.mostActiveChannels) {
            totalList.push({
                channel: channel,
                messages: this.mostActiveChannels[channel].messages.length,
                bans: this.mostActiveChannels[channel].bans.length,
                timeouts: this.mostActiveChannels[channel].timeouts.length,
            });
        }
        totalList.sort((a, b) => b.messages - a.messages);
        const finalList = [];
        for (let i = 0; i < Math.min(totalList.length, MOST_ACTIVE_CHANNEL_COUNT); i++) {
            finalList.push(totalList[i]);
        }
        return finalList;
    }

    /**
     * Returns the hourly activity
     * @returns {}
     */
    getHourlyActivity() {
        let newActivity = this.hourlyActivity.map(x => {return [x._id, x.messages, x.bans, x.timeouts]})
        if (this.currentHourlyActivity) {
            const cur = this.currentHourlyActivity;
            newActivity.push([cur._id, cur.messages, cur.bans, cur.timeouts]);
        }
        return newActivity;
    }

    /**
     * Returns general statistics
     * @returns {{messages: number,bans: number,timeouts: number,streamers: number}}
     */
    getGeneralStatistics() {
        return this.generalStatistics;
    }

    /**
     * Returns member streams
     * @returns {{live: any, game: any, user: any, title: string, viewers: number}[]}
     */
    getMemberStreams() {
        return this.memberStreams;
    }

    /**
     * Returns recent followers
     * @returns {any[]}
     */
    getRecentFollowers() {
        return this.recentFollowers;
    }

    /**
     * Returns recent subscriptions
     * @returns {any[]}
     */
    getRecentSubscriptions() {
        return this.recentSubscriptions;
    }

    /**
     * Returns the hourly date format, "YYYY/MM/DD HH:00 UTC"
     * @param {Date?} date 
     * @returns {string}
     */
    #getHourlyDateFormat(date = new Date()) {
        let month = String(date.getUTCMonth()+1);
        let day = String(date.getUTCDate());
        let hour = String(date.getUTCHours());
        if (month.length < 2) month = "0" + month;
        if (day.length < 2) day = "0" + day;
        if (hour.length < 2) hour = "0" + hour;
        return `${date.getUTCFullYear()}/${month}/${day} ${hour}:00 UTC`;
    }

    /**
     * Adds a specified Type to the hourly count
     * @param {"messages"|"bans"|"timeouts"} type 
     */
    async addHourly(type) {
        if (!this.currentHourlyActivity || this?.currentHourlyActivity?._id !== this.#getHourlyDateFormat()) {
            if (this.currentHourlyActivity) this.hourlyActivity.push(this.currentHourlyActivity);

            const dateNow = this.#getHourlyDateFormat();
            const log = await global.utils.Schemas.HourlyStat.findById(dateNow);
            if (log) {
                this.currentHourlyActivity = log;
            } else {
                this.currentHourlyActivity = await global.utils.Schemas.HourlyStat.create({
                    _id: dateNow,
                });
            }
        }
        this.currentHourlyActivity[type]++;
    }

    /**
     * Adds a message to channelId
     * @param {string} channelId 
     */
    addChat(channelId) {
        if (!this.mostActiveChannels.hasOwnProperty(channelId))
            this.mostActiveChannels[channelId] = {messages: [], bans: [], timeouts: []};
        this.mostActiveChannels[channelId].messages.push(Date.now());
        this.addHourly("messages").catch(console.error);
    }

    /**
     * Adds a ban to channelId
     * @param {string} channelId 
     */
    addBan(channelId) {
        if (!this.mostActiveChannels.hasOwnProperty(channelId))
            this.mostActiveChannels[channelId] = {messages: [], bans: [], timeouts: []};
        this.mostActiveChannels[channelId].bans.push(Date.now());
        this.addHourly("bans").catch(console.error);
    }

    /**
     * Adds a timeout to channelId
     * @param {string} channelId 
     */
    addTimeout(channelId) {
        if (!this.mostActiveChannels.hasOwnProperty(channelId))
            this.mostActiveChannels[channelId] = {messages: [], bans: [], timeouts: []};
        this.mostActiveChannels[channelId].timeouts.push(Date.now());
        this.addHourly("timeouts").catch(console.error);
    }

    constructor() {
        let intCount = 0;
        setInterval(async () => {
            this.purgeMostActiveChannels();
            
            if (intCount % 15 === 0) {
                this.saveHourlyActivity().catch(console.error);
                this.updateRecentFollowers().catch(console.error);
                this.updateRecentSubscribers().catch(console.error);
                this.updateLiveMembers().catch(console.error);
            }

            if (intCount % 60 === 0) {
                this.updateGeneralStatistics().catch(console.error);
            }
            intCount++;
        }, 1000);

        setTimeout(() => {
            this.loadHourlyActivity().catch(console.error);
            this.updateLiveMembers().catch(console.error);
        }, 1000);
    }

    /**
     * Purges the active channel list of all old records
     */
    purgeMostActiveChannels() {
        for (const channel in this.mostActiveChannels) {
            this.mostActiveChannels[channel].messages = this.mostActiveChannels[channel].messages.filter(x => Date.now() - x <= MOST_ACTIVE_TIME);
            this.mostActiveChannels[channel].bans = this.mostActiveChannels[channel].bans.filter(x => Date.now() - x <= MOST_ACTIVE_TIME);
            this.mostActiveChannels[channel].timeouts = this.mostActiveChannels[channel].timeouts.filter(x => Date.now() - x <= MOST_ACTIVE_TIME);

            if (this.mostActiveChannels[channel].messages.length === 0
                && this.mostActiveChannels[channel].bans.length === 0
                && this.mostActiveChannels[channel].timeouts.length === 0) delete this.mostActiveChannels[channel];
        }
    }

    /**
     * Saves the current hourly activity to the database
     */
    async saveHourlyActivity() {
        if (this.currentHourlyActivity) {
            await global.utils.Schemas.HourlyStat.findByIdAndUpdate(this.currentHourlyActivity._id, this.currentHourlyActivity);
        }
    }

    /**
     * Loads the hourly activity from the database
     */
    async loadHourlyActivity() {
        this.hourlyActivity = await global.utils.Schemas.HourlyStat.find({})
            .sort({posted: -1})
            .limit(48);
        this.hourlyActivity.reverse();

        this.hourlyActivity = this.hourlyActivity.filter(x => x._id !== this.#getHourlyDateFormat());
    }

    /**
     * Updates general statistics
     */
    async updateGeneralStatistics() {
        this.generalStatistics.messages = await global.utils.Schemas.TwitchChat.estimatedDocumentCount();
        this.generalStatistics.bans = await global.utils.Schemas.TwitchBan.estimatedDocumentCount();
        this.generalStatistics.timeouts = await global.utils.Schemas.TwitchTimeout.estimatedDocumentCount();

        const clients = global.client.listen;
        this.generalStatistics.streamers =
                clients.member.channels.length +
                clients.partner.channels.length +
                clients.affiliate.channels.length;
    }

    /**
     * Updates live members
     */
    async updateLiveMembers() {
        const streams = await global.utils.Schemas.TwitchLivestream.find({endDate: null, member: true})
            .populate("user");

        let activities = [];
        for (let i = 0; i < streams.length; i++) {
            const activity = await global.utils.Schemas.TwitchStreamStatus.find({live: streams[i]._id})
                .sort({timestamp: -1})
                .populate("live")
                .populate("game")
                .limit(1);
            if (activity.length > 0) {
                activities.push({
                    live: activity[0].live,
                    game: activity[0].game,
                    user: streams[i].user.public(),
                    title: activity[0].title,
                    viewers: activity[0].viewers,
                });
            }
        }
        activities.sort((a, b) => a.viewers - b.viewers);
        this.memberStreams = activities;
    }

    /**
     * Updates recent followers
     */
    async updateRecentFollowers() {
        const data = await global.utils.Authentication.Twitch.getChannelFollowers(config.twitch.id, MAX_FOLLOWERS);
        let newFollowList = [];
        for (let i = 0; i < Math.min(MAX_FOLLOWERS - 1, data.data.length); i++) {
            newFollowList.push({
                user: (await global.utils.Twitch.getUserById(data.data[i].user_id, false, true)).public(),
                date: data.data[i].followed_at,
            });
        }
        this.recentFollowers = newFollowList;
    }

    /**
     * Updates recent subscribers
     */
    async updateRecentSubscribers() {
        const data = await global.utils.Authentication.Twitch.getChannelSubscriptions(config.twitch.id, MAX_SUBSCRIBERS);
        let newSubList = [];
        for (let i = 0; i < Math.min(MAX_SUBSCRIBERS - 1, data.data.length); i++) {
            const d = data.data[i];
            newSubList.push({
                user: (await global.utils.Twitch.getUserById(d.user_id, false, true)).public(),
                gifter: (d.is_gift ? 
                    (await global.utils.Twitch.getUserById(d.gifter_id, false, true)).public() : null),
                tier: Number(d.tier) / 1000,
            });
        }
        this.recentSubscriptions = newSubList;
    }

}

module.exports = StatsManager;
