const utils = require("../utils/");

class PunishmentStore {

    /**
     * Store for all active bans
     * @type {[{streamer: string, chatter: string}]}
     */
    bans = [];

    /**
     * Store for all active timeouts
     * @type {[{streamer: string, chatter: string}]}
     */
    timeouts = [];

    async init() {
        const startTime = Date.now();
        const bans = await utils.Schemas.TwitchBan.where("time_end")
                .equals(null);

        this.bans = bans.map(x => {return {streamer: x.streamer, chatter: x.chatter}});

        const timeouts = await utils.Schemas.TwitchTimeout.where("time_end")
                .gt(Date.now());

        this.timeouts = timeouts.map(x => {return {streamer: x.streamer, chatter: x.chatter}});
        console.log(`${this.bans.length} ban(s) and ${this.timeouts.length} timeout(s) loaded in ${Date.now() - startTime} ms`);
    }

    /**
     * Returns if a chatter is banned in a specific channel
     * @returns {boolean}
     */
    isBanned(streamer, chatter) {
        return Boolean(this.bans.find(x => x.streamer === streamer && x.chatter === chatter));
    }

    removeBan(streamer, chatter) {
        this.bans = this.bans.filter(x => x.streamer !== streamer || x.chatter !== chatter);
    }

    /**
     * Returns if a chatter is timed out in a specific channel
     * @returns {boolean}
     */
    isTimedOut(streamer, chatter) {
        return Boolean(this.timeouts.find(x => x.streamer === streamer && x.chatter === chatter));
    }

    removeTimeOut(streamer, chatter) {
        this.timeouts = this.timeouts.filter(x => x.streamer !== streamer || x.chatter !== chatter);
    }
}

const store = new PunishmentStore();

store.init();

module.exports = store;
