const mongoose = require("mongoose");

const config = require("../config.json");

const Twitch = require("./twitch/");
const Discord = require("./discord/");

const Authentication = require("./authentication/");

const EventManager = require("./EventManager");
const Flag = require("./flag/Flag");

const Archive = require("./archive/Archive");
const ArchiveFile = require("./archive/ArchiveFile");
const ArchiveLog = require("./archive/ArchiveLog");
const ArchiveMessage = require("./archive/ArchiveMessage");
const ArchiveUser = require("./archive/ArchiveUser");

const DiscordGuild = require("./discord/DiscordGuild");
const DiscordUser = require("./discord/DiscordUser");
const DiscordMessage = require("./discord/DiscordMessage");
const DiscordToken = require("./discord/DiscordToken");

const Stream = require("./twitch/TwitchStream");
const TwitchBan = require("./twitch/TwitchBan");
const TwitchUser = require("./twitch/TwitchUser");
const TwitchUserFlag = require("./twitch/TwitchUserFlag");
const TwitchChat = require("./twitch/TwitchChat");
const TwitchTimeout = require("./twitch/TwitchTimeout");
const TwitchRole = require("./twitch/TwitchRole");
const TwitchToken = require("./twitch/TwitchToken");

const Identity = require("./Identity");
const Session = require("./Session");

class Utils {

    /**
     * Holds Authentication methods for Twitch & Discord
     * @type {Authentication}
     */
    Authentication = new Authentication();

    /**
     * Global API for Twitch objects
     * @type {Twitch}
     */
    Twitch = new Twitch();

    /**
     * Global API for Discord objects
     * @type {Discord}
     */
    Discord = new Discord();

    /**
     * Global API for events
     * @type {EventManager}
     */
    EventManager = new EventManager();

    Schemas = {
        Flag: Flag,
        Identity: Identity,
        Archive: Archive,
        ArchiveFile: ArchiveFile,
        ArchiveLog: ArchiveLog,
        ArchiveMessage: ArchiveMessage,
        ArchiveUser: ArchiveUser,
        DiscordGuild: DiscordGuild,
        DiscordUser: DiscordUser,
        DiscordMessage: DiscordMessage,
        DiscordToken: DiscordToken,
        TwitchBan: TwitchBan,
        TwitchChat: TwitchChat,
        TwitchGame: Stream.TwitchGame,
        TwitchLivestream: Stream.TwitchLivestream,
        TwitchStreamStatus: Stream.TwitchStreamStatus,
        TwitchTag: Stream.TwitchTag,
        TwitchTimeout: TwitchTimeout,
        TwitchUser: TwitchUser,
        TwitchUserFlag: TwitchUserFlag,
        TwitchRole: TwitchRole,
        TwitchToken: TwitchToken,
        Session: Session,
    }

    /**TODO: Create transaction
     * Automatically creates or consolidates identities of all given Discord and Twitch users
     * @param {TwitchUser[]} twitchUsers
     * @param {DiscordUser[]} discordUsers
     */
    consolidateIdentites(twitchUsers = [], discordUsers = []) {
        return new Promise(async (resolve, reject) => {
            let identity = null;
            let additionalUsers = []; // Additional users that are attached to existing identities
            
            const retrieveAdditionalUsers = async identity => {
                const newTwitchUsers = await identity.getTwitchUsers();
                const newDiscordUsers = await identity.getDiscordUsers();
                for (let i = 0; i < newTwitchUsers; i++) {
                    const user = newTwitchUsers[i];
                    if (!twitchUsers.find(x => x._id === user._id) && !additionalUsers.find(x => x._id === user._id))
                        additionalUsers.push(user);
                }
                for (let i = 0; i < newDiscordUsers; i++) {
                    const user = newDiscordUsers[i];
                    if (!discordUsers.find(x => x._id === user._id) && !additionalUsers.find(x => x._id === user._id))
                        additionalUsers.push(user);
                }
            }

            for (let i = 0; i < twitchUsers.length; i++) {
                const user = twitchUsers[i];
                if (user.identity) {
                    await user.populate("identity")
                    identity = user.identity;
                    await retrieveAdditionalUsers(identity);
                }
            }
            for (let i = 0; i < discordUsers.length; i++) {
                const user = discordUsers[i];
                if (user.identity) {
                    await user.populate("identity")
                    identity = user.identity;
                    await retrieveAdditionalUsers(identity);
                }
            }

            if (!identity) identity = await Identity.create({});

            for (let i = 0; i < twitchUsers.length; i++) {
                const user = twitchUsers[i];
                user.identity = identity;
                await user.save();
            }
            for (let i = 0; i < discordUsers.length; i++) {
                const user = discordUsers[i];
                user.identity = identity;
                await user.save();
            }
            for (let i = 0; i < additionalUsers.length; i++) {
                const user = additionalUsers[i];
                user.identity = identity;
                await user.save();
            }

            resolve(identity);
        });
    }

    /**
     * Generates a random string of (length) length.
     * @param {number} length 
     * @returns {string} Generated String
     */
    stringGenerator(length = 32) {
        let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let str = '';
        for (let i = 0; i < length; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return str;
    }

    /**
     * Converts a number into a string with commas
     * Example: 130456 -> 130,456
     * @param {number} num 
     * @returns {string}
     */
    comma(num) {
        if (!num) return "0";
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Generates a table-like format from tabular rows
     * @param {[...[...string]]} rows 
     * @param {number} padding
     * @param {number} minimumWidth
     * @param {boolean} alignRight
     * @returns {string}
     */
    stringTable(rows, padding = 3, minimumWidth = 5, alignRight = false) {
        let cellWidth = [];
        
        rows.forEach(row => {
            row.forEach((cell, cellNum) => {
                if (!cellWidth[cellNum]) cellWidth[cellNum] = minimumWidth;
                if (cellWidth[cellNum] < cell.length + padding) cellWidth[cellNum] = String(cell).length + padding;
            });
        });
        
        let result = "";

        rows.forEach(row => {
            if (result !== "") result += "\n";

            row.forEach((cell, cellNum) => {
                if (!alignRight) result += " ".repeat(Math.max(cellWidth[cellNum] - cell.length), 0);
                
                result += cell;

                if (alignRight) result += " ".repeat(Math.max(cellWidth[cellNum] - cell.length), 0);
            })
        });

        return result;
    }

    /**
     * 
     * @param {Date} date 
     * @returns {string}
     */
    formatTime(date) {
        let hours = String(date.getHours());
        let minutes = String(date.getMinutes());
        let seconds = String(date.getSeconds());

        if (hours.length < 2)
            hours = "0" + hours;
        if (minutes.length < 2)
            minutes = "0" + minutes;
        if (seconds.length < 2)
            seconds = "0" + seconds;

        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * @param {Number} day - 0-6 as a representation of the day of the week (0 = Sunday)
     * @returns {String} The corresponding day of the week as a 3 character String
    */
    parseDay(day) {
        let result = "";

        switch (day) {
            case 0:
                result = "Sun";
                break;
            case 1:
                result = "Mon";
                break;
            case 2:
                result = "Tue";
                break;
            case 3:
                result = "Wed";
                break;
            case 4:
                result = "Thu";
                break;
            case 5:
                result = "Fri";
                break;
            case 6:
                result = "Sat";
        }

        return result;
    }

    /**
     * Parses date from a timestamp to MM:DD:YY HH:MM:SS
     * @param { Number | String | Date | undefined } timestamp - The timestamp to parse, if provided, otherwise the current time is parsed
     * @returns {String} The parsed Date in the format MM:DD:YY HH:MM:SS
     */
    parseDate(timestamp) {
        let dte = new Date(timestamp);

        let hr = "" + dte.getHours();
        let mn = "" + dte.getMinutes();
        let sc = "" + dte.getSeconds();

        if (hr.length === 1) hr = "0" + hr;
        if (mn.length === 1) mn = "0" + mn;
        if (sc.length === 1) sc = "0" + sc;

        let mo = "" + (dte.getMonth() + 1);
        let dy = "" + dte.getDate();
        let yr = dte.getFullYear();

        if (mo.length === 1) mo = "0" + mo;
        if (dy.length === 1) dy = "0" + dy;

        return `${this.parseDay(dte.getDay())} ${mo}.${dy}.${yr} ${hr}:${mn}:${sc}`;
    }

    /**
     * Formats a time (in seconds) to a clock HH:MM:SS
     * @param {number} time 
     */
    formatElapsed(time) {
        let hour = Math.floor(time / 60 / 60);
        time -= hour * 60 * 60;
        let minute = Math.floor(time / 60);
        time -= minute * 60;
        let second = time;

        hour = String(hour);
        minute = String(minute);
        second = String(second);

        if (hour.length === 1) hour = "0" + hour;
        if (minute.length === 1) minute = "0" + minute;
        if (second.length === 1) second = "0" + second;
        return `${hour}:${minute}:${second}`;
    }

    /**
     * Initializes schema for all Utils objects
     */
    async schema() {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(config.mongodb.url);
        console.log("Connected to MongoDB!");

        this.EventManager.populate();
    }
}

module.exports = new Utils();
