const RegexGroup = require("./RegexGroup");
const Regex = require("./Regex");

const mongoose = require("mongoose");

class RegexManager {

    /**
     * Stores all current groups
     */
    groups = [];

    /**
     * Stores all current regexes
     */
    regexes = [];

    /**
     * Checks if any regexes from the provided groups match the message provided
     * @param message {string}
     * @param groupIds {string[]|mongoose.Schema.Types.ObjectId[]}
     * @returns {boolean}
     */
    matches(message, groupIds  = []) {
        groupIds = groupIds.map(x => String(x));

        const applicableRegexes = this.regexes.filter(x => groupIds.includes(String(x.group?._id ? x.group._id : x.group)));

        for (let i = 0; i < applicableRegexes.length; i++) {
            const regex = new RegExp(applicableRegexes[i].regex, "i");

            if (regex.test(message)) {
                return true;
            }
        }

        return false;
    }

}

module.exports = new RegexManager();
