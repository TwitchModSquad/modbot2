const { AutocompleteInteraction } = require("discord.js");

const utils = require("../../../utils/");

const userFields = ["twitch","twitch-user","streamer","chatter"];

const MIN_SEARCH_LENGTH = 3;

const listener = {
    name: 'twitchUserAutocomplete',
    eventName: 'interactionCreate',
    eventType: 'on',
    /**
     * Fired on autocomplete interaction
     * @param {AutocompleteInteraction} interaction 
     */
    async listener (interaction) {
        if (!interaction.isAutocomplete()) return;
        const opt = interaction.options.getFocused(true);
    
        if (!userFields.includes(opt.name)) return;

        if (opt.value.length < MIN_SEARCH_LENGTH) return;

        const foundUsers = await utils.Schemas.TwitchUser.find({
                login: {
                    $regex: new RegExp(`^${opt.value.toLowerCase()}`),
                }
            })
            .sort({login: 1})
            .limit(25);

        interaction.respond(foundUsers.map(x => {return {
            name: x.display_name,
            value: x.login,
        }}));
    }
};

module.exports = listener;
