const MOST_ACTIVE_TIME = 15 * 1000; // 15 seconds
const MOST_ACTIVE_CHANNEL_COUNT = 15;

class StatsManager {

    mostActiveChannels = {};

    hourlyActivity = [];
    currentHourlyActivity;

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
            }
            intCount++;
        }, 1000);

        this.loadHourlyActivity().catch(console.error);
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
        if (this.currentHourlyActivity) await this.currentHourlyActivity.save();
    }

    /**
     * Loads the hourly activity from the database
     */
    async loadHourlyActivity() {
        
    }

}

module.exports = StatsManager;