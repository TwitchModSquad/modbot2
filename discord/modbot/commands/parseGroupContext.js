const { ContextMenuCommandBuilder, ApplicationCommandType, MessageContextMenuCommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const utils = require("../../../utils/");

const IGNORED = [
    /streamer/gi,
    /is/gi,
    /playing/gi,
    /with/gi,
    /and/gi,
    /\(\w+\)/g,
    /\*/g,
    /`/g,
    /#/g,
    /,/g,
];

const MONTHS = [
    ["january","jan"],
    ["february","feb"],
    ["march","mar"],
    ["april","apr"],
    ["may"],
    ["june","jun"],
    ["july","jul"],
    ["august","aug"],
    ["september","sep","sept"],
    ["october","oct"],
    ["november","nov"],
    ["december","dec"],
];

const DATE_REGEX = /(\d+)\/(\d+)/;
const TIME_REGEX = /(\d+)(:(\d+))? *(am|pm) *(pt|pst|pdt|mt|mst|mdt|ct|cst|cdt|et|est|edt)/i;
const NAME_REGEX = /^\w+$/i;

Date.prototype.stdTimezoneOffset = function () {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.isDstObserved = function () {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

const command = {
    data: new ContextMenuCommandBuilder()
        .setName("Parse Group")
        .setType(ApplicationCommandType.Message)
        .setDMPermission(false),
    global: false,
    groupInteraction: {},
    /**
     * Called when this command is executed
     * @param {MessageContextMenuCommandInteraction} interaction 
     */
    async execute(interaction) {
        if (!interaction.isMessageContextMenuCommand()) return;

        let content = interaction.targetMessage.content;
        
        IGNORED.forEach(s => {
            content = content.replace(s, "");
        });

        content = content.trim();

        let game = null;
        const games = await utils.Schemas.TwitchGame.find({});
        for (let i = 0; i < games.length; i++) {
            if (content.match(new RegExp(games[i].name, "i"))) {
                content.replace(new RegExp(games[i].name, "ig"), "")
                game = games[i];
                break;
            }
        }

        content = content.replace(/\n/g, " ");
        const contentSplit = content.split(" ").filter(x => x !== "");
        
        let date = null;
        /**
         * @returns {Date}
         */
        const d = () => {
            if (!date) date = new Date();
            return date;
        }

        function setTimezone(timezone) {
            date = new Date(`${date.getUTCMonth() + 1}/${date.getUTCDay()}/${date.getUTCFullYear()} ${date.getUTCHours()}:${date.getUTCMinutes()} ${timezone}`);
        }

        const timeMatch = content.match(TIME_REGEX);
        if (timeMatch) {
            const hr = Number(timeMatch[1]);
            const min = Number(timeMatch[3]);
            const ampm = timeMatch[4]
            const timezone = timeMatch[5];

            if (!isNaN(hr) && hr > 0 && hr < 13) {
                d().setUTCHours(hr + (ampm.toLowerCase() === "pm" ? 12 : 0));
            }
            if (!isNaN(min) && min >= 0 && min < 60) {
                d().setUTCMinutes(min);
            } else {
                d().setUTCMinutes(0);
            }
            if (timezone) {
                if (timezone.toLowerCase().startsWith("p")) {
                    if (date.isDstObserved()) {
                        setTimezone("GMT-0700");
                    } else setTimezone("GMT-0800");
                } else if (timezone.toLowerCase().startsWith("m")) {
                    if (date.isDstObserved()) {
                        setTimezone("GMT-0600");
                    } else setTimezone("GMT-0700");
                } else if (timezone.toLowerCase().startsWith("c")) {
                    if (date.isDstObserved()) {
                        setTimezone("GMT-0500");
                    } else setTimezone("GMT-0600");
                } else if (timezone.toLowerCase().startsWith("e")) {
                    if (date.isDstObserved()) {
                        setTimezone("GMT-0400");
                    } else setTimezone("GMT-0500");
                }
            }
        }

        let dateMatch = content.match(DATE_REGEX);
        if (dateMatch) {
            const month = Number(dateMatch[1]);
            const day = Number(dateMatch[2]);
            if (!isNaN(month) && !isNaN(day)) {
                d().setUTCMonth(month - 1);
                d().setUTCDate(day);
            }
        }

        MONTHS.forEach((monthList, i) => {
            monthList.forEach(month => {
                if (content.match(new RegExp(month, "i"))) {
                    d().setUTCMonth(i);
                }
            });
        });

        contentSplit.forEach(split => {
            if (split.toLowerCase().endsWith("st") ||
                    split.toLowerCase().endsWith("nd") ||
                    split.toLowerCase().endsWith("rd") ||
                    split.toLowerCase().endsWith("th")) {
                const num = Number(split.toLowerCase().replace("st", "").replace("nd", "").replace("rd", "").replace("th", ""));
                if (!isNaN(num) && num > 0 && num < 32) {
                    d().setUTCDate(num);
                }
            }
        });

        const streamers = [];
        for (let i = 0; i < contentSplit.length; i++) {
            const q = contentSplit[i].replace(/[^\w]/g, "");
            if (q.length > 2 && q.length < 25 && q.match(NAME_REGEX)) {
                try {
                    streamers.push(await utils.Twitch.getUserByName(q, false));
                } catch(e) {}
            }
        }

        if (streamers.length === 0) {
            return interaction.error("No streamers were found from this message!");
        }

        const user = await utils.Discord.getUserById(interaction.targetMessage.author.id, false, true);

        const group = await utils.Schemas.Group.create({
            posted_by: user,
            game: game,
            start_time: date,
        });

        for (let i = 0; i < streamers.length; i++) {
            await utils.Schemas.GroupUser.create({
                group: group._id,
                user: streamers[i]._id,
            });
        }

        const embed = await group.embed();

        command.groupInteraction[group._id.toString()] = interaction;

        interaction.channel.send({embeds: [embed]}).then(async message => {
            group.message = message.id;
            await group.save();
        }, console.error);

        interaction.reply({embeds: [embed], components: await group.editComponents(), ephemeral: true});
    }
};

module.exports = command;
